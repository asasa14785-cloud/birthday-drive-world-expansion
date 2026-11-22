/**
 * Quality governor (Birthday Drive Phase 3).
 *
 * Three tiers, picked from device signals and then corrected by a *measured* frame-time governor:
 *   high : DPR <= 2, tilt-shift blur + glow composer passes
 *   mid  : DPR <= 1.5, glow pass only (blur passes off = 2 full-screen passes saved)
 *   low  : DPR <= 1 (down to 0.75 render scale if still slow), NO composer at all (direct render) + CSS vignette
 * Override with ?quality=high|mid|low (or auto). Nothing here touches car physics or timing.
 * Technique inspired by the HBD render-quality governor (average-frame-time step-down), re-written for this engine.
 */
export const TIERS = {
    high: { dpr: 2, blur: true, glow: true, composer: true },
    mid: { dpr: 1.5, blur: false, glow: true, composer: true },
    low: { dpr: 1, blur: false, glow: false, composer: false }
}
const ORDER = ['high', 'mid', 'low']

export default class Quality
{
    constructor(_options)
    {
        this.renderer = _options.renderer
        this.passes = _options.passes
        this.sizes = _options.sizes
        this.time = _options.time

        this.forced = new URLSearchParams(window.location.search).get('quality')
        this.deviceDpr = window.devicePixelRatio || 1
        this.scale = 1 // extra render-scale multiplier used only as the last resort on 'low'
        this.samples = []
        this.history = []
        this.enabled = true
        this.settled = false

        this.tier = ORDER.includes(this.forced) ? this.forced : this.detect()
        this.auto = !ORDER.includes(this.forced)

        this.$vignette = document.createElement('div')
        this.$vignette.className = 'bd-vignette'
        document.body.appendChild(this.$vignette)

        this.apply(this.tier, 'initial')
        this.sizes.on('resize', () => this.apply(this.tier, 'resize'))
        window.quality = this
    }

    /** Device heuristics only decide the *starting* tier; the governor corrects it with real frame times. */
    detect()
    {
        const coarse = window.matchMedia('(pointer: coarse)').matches
        const mem = navigator.deviceMemory || (coarse ? 4 : 8)
        const cores = navigator.hardwareConcurrency || 4
        const pixels = this.sizes.viewport.width * this.sizes.viewport.height * this.deviceDpr * this.deviceDpr
        let score = 2
        if(coarse) { score -= 1 }
        if(mem <= 2 || cores <= 2) { score -= 2 }
        else if(mem <= 4 || cores <= 4) { score -= 1 }
        if(pixels > 3.5e6) { score -= 1 } // very large backbuffer
        if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) { score -= 0 } // motion handled by viewer/finale
        return score >= 2 ? 'high' : score >= 1 ? 'mid' : 'low'
    }

    apply(tier, reason)
    {
        const t = TIERS[tier]
        this.tier = tier
        this.config = t
        const dpr = Math.max(0.5, Math.min(this.deviceDpr, t.dpr) * this.scale)
        this.renderer.setPixelRatio(dpr)
        this.renderer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)
        if(this.passes && this.passes.composer)
        {
            this.passes.composer.setPixelRatio(dpr)
            this.passes.composer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)
        }
        this.$vignette.style.display = t.composer ? 'none' : 'block'
        document.body.dataset.quality = tier
        this.history.push({ tier, scale: this.scale, dpr, reason, t: Math.round(performance.now()) })
    }

    /** Called by Application each frame before rendering. Returns true when the composer should be used. */
    update(delta)
    {
        if(this.enabled && this.auto && !this.settled && document.visibilityState === 'visible')
        {
            // Ignore the first seconds (shader compilation / texture upload), then sample real frame times
            this.warm = (this.warm || 0) + delta
            if(this.warm > 4000)
            {
                this.samples.push(delta)
                if(this.samples.length >= 90)
                {
                    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length
                    this.lastAverage = avg
                    this.samples.length = 0
                    if(avg > 26) { this.stepDown(avg) } // slower than ~38 fps
                    else { this.stable = (this.stable || 0) + 1; if(this.stable >= 3) { this.settled = true } }
                }
            }
        }
        return this.config.composer
    }

    stepDown(avg)
    {
        const i = ORDER.indexOf(this.tier)
        this.stable = 0
        this.warm = 2500 // short re-warm after a change
        if(i < ORDER.length - 1) { this.apply(ORDER[i + 1], `governor avg ${avg.toFixed(1)}ms`) }
        else if(this.scale > 0.76) { this.scale = 0.75; this.apply(this.tier, `governor render-scale avg ${avg.toFixed(1)}ms`) }
        else { this.settled = true }
    }

    summary()
    {
        return { tier: this.tier, scale: this.scale, forced: this.forced, lastAverageFrameMs: this.lastAverage || null, history: this.history }
    }
}
