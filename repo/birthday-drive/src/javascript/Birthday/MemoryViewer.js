import * as THREE from 'three'
import gsap from 'gsap'
import { Howl } from 'howler'
import EventEmitter from '../Utils/EventEmitter.js'

/**
 * MemoryViewer — owns the whole memory interaction sequence:
 *
 *   CAR APPROACHES → PROMPT → VEHICLE STOPS → CAMERA TRANSITION → MEMORY REVEAL
 *   → OPTIONAL AUDIO → CLOSE MEMORY → RESTORE DRIVING
 *
 * - The photograph stays a 3D object (MemoryStation); this class only moves
 *   Bruno's camera (through its own `target`/`angle`/`zoom`, tweened with the
 *   existing GSAP) and shows a thin caption sheet + controls.
 * - State machine idle → opening → open → closing → idle. `open()` is ignored
 *   in every state but idle (and during a short cooldown) so a trigger can
 *   never fire twice during a transition.
 * - While a memory is open `controls.birthdayLocked` is true: the (patched)
 *   action getters return "no input + brake", and the joystick adapter reads
 *   the same flag — the vehicle cannot be driven.
 * - The previous camera state (angle, zoom distance, blur, pan) is saved and
 *   restored exactly.
 */
export default class MemoryViewer extends EventEmitter
{
    constructor(_options)
    {
        super()
        this.camera = _options.camera
        this.passes = _options.passes
        this.controls = _options.controls
        this.sizes = _options.sizes
        this.config = _options.config
        this.sounds = _options.sounds

        this.state = 'idle'
        this.station = null
        this.nearby = null
        this.cooldownUntil = 0
        this.pendingClose = false
        this.howl = null
        this.audioState = 'none'
        this.timeline = null
        this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

        this.camera.focus = { x: 0, y: 0, z: 0, weight: 0 }

        this.lockInput()
        this.setDom()
        this.setEvents()
    }

    get isOpen() { return this.state !== 'idle' }

    /** Make the original action flags read as "no input + brake" while locked, without touching Controls.js. */
    lockInput()
    {
        const controls = this.controls
        controls.birthdayLocked = false
        for(const key of ['up', 'down', 'left', 'right', 'boost', 'brake'])
        {
            let raw = controls.actions[key]
            Object.defineProperty(controls.actions, key, {
                configurable: true,
                enumerable: true,
                get: () => controls.birthdayLocked ? key === 'brake' : raw,
                set: (value) => { raw = value }
            })
        }
    }

    setDom()
    {
        this.$prompt = document.createElement('button')
        this.$prompt.className = 'bd-prompt'
        this.$prompt.type = 'button'
        this.$prompt.hidden = true
        document.body.appendChild(this.$prompt)

        this.$root = document.createElement('div')
        this.$root.className = 'bd-memory'
        this.$root.hidden = true
        this.$root.setAttribute('role', 'dialog')
        this.$root.setAttribute('aria-label', 'Memory')
        this.$root.innerHTML = `
            <button type="button" class="bd-close" aria-label="Close memory and keep driving">&times;</button>
            <div class="bd-sheet">
                <div class="bd-meta"><span class="bd-date"></span><span class="bd-count"></span></div>
                <h2 class="bd-title"></h2>
                <p class="bd-caption"></p>
                <div class="bd-actions">
                    <button type="button" class="bd-btn bd-prev" aria-label="Previous photo">&lsaquo;</button>
                    <button type="button" class="bd-btn bd-audio" hidden></button>
                    <button type="button" class="bd-btn bd-next" aria-label="Next photo">&rsaquo;</button>
                    <button type="button" class="bd-btn bd-primary bd-keep">Keep driving</button>
                </div>
            </div>`
        document.body.appendChild(this.$root)

        const q = (selector) => this.$root.querySelector(selector)
        this.$title = q('.bd-title')
        this.$caption = q('.bd-caption')
        this.$date = q('.bd-date')
        this.$count = q('.bd-count')
        this.$prev = q('.bd-prev')
        this.$next = q('.bd-next')
        this.$audio = q('.bd-audio')
        this.$close = q('.bd-close')
        this.$keep = q('.bd-keep')
    }

    setEvents()
    {
        const stop = (event) => { event.stopPropagation() }
        for(const el of [this.$root, this.$prompt])
        {
            // The canvas listens to touches for zoom/areas: keep UI taps away from it
            el.addEventListener('touchstart', stop, { passive: true })
            el.addEventListener('mousedown', stop)
        }

        this.$prompt.addEventListener('click', () => { if(this.nearby) { this.open(this.nearby) } })
        this.$close.addEventListener('click', () => this.close())
        this.$keep.addEventListener('click', () => this.close())
        this.$prev.addEventListener('click', () => this.step(- 1))
        this.$next.addEventListener('click', () => this.step(1))
        this.$audio.addEventListener('click', () => this.toggleAudio())

        this.keydown = (event) =>
        {
            if(this.state === 'open' || this.state === 'opening')
            {
                if(event.code === 'Escape' || event.code === 'Enter')
                {
                    event.preventDefault()
                    this.close()
                }
                else if(event.code === 'ArrowLeft' || event.code === 'KeyA') { this.step(- 1) }
                else if(event.code === 'ArrowRight' || event.code === 'KeyD') { this.step(1) }
            }
            else if(this.state === 'idle' && event.code === 'KeyE' && this.nearby)
            {
                this.open(this.nearby)
            }
        }
        window.addEventListener('keydown', this.keydown)
    }

    /* ---------- proximity prompt ---------- */

    setNearby(station)
    {
        this.nearby = station
        this.updatePrompt()
    }

    clearNearby(station)
    {
        if(this.nearby === station) { this.nearby = null }
        this.updatePrompt()
    }

    updatePrompt()
    {
        const show = this.state === 'idle' && this.nearby
        this.$prompt.hidden = !show
        if(show)
        {
            const verb = this.config.touch ? 'Tap' : 'Press Enter'
            this.$prompt.innerHTML = `<span class="bd-prompt-icon">&#9825;</span><span><strong>${escapeHtml(this.nearby.data.title)}</strong><small>${verb} to open this memory</small></span>`
        }
    }

    /* ---------- sequence ---------- */

    duration(seconds) { return this.reducedMotion ? 0.01 : seconds }

    /** Distance at which the photo fills the view while leaving room for the caption sheet. */
    computeDistance(station)
    {
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.instance.fov * 0.5))
        const aspect = this.sizes.viewport.width / this.sizes.viewport.height
        const byHeight = (station.height * 1.18 / 0.56) / (2 * tanHalf)
        const byWidth = (station.width * 1.12 / 0.9) / (2 * tanHalf * aspect)
        return Math.max(7, byHeight, byWidth)
    }

    compose(station, duration)
    {
        const f = station.getFocus()
        const distance = this.computeDistance(station)
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.instance.fov * 0.5))
        const visibleHeight = 2 * distance * tanHalf
        const focusZ = f.z - visibleHeight * 0.13 // push the photo up, away from the caption sheet

        const timeline = gsap.timeline()
        // Phase 3: three different curves so the move has a drifting, cinematic parallax instead of one repeated ease
        timeline.to(this.camera.focus, { x: f.x, y: f.y, z: focusZ, weight: 1, duration, ease: 'power3.inOut' }, 0)
        timeline.to(this.camera.angle.value, { x: f.facing.x * 1.0, y: f.facing.y * 1.0, z: 0.2, duration: duration * 1.12, ease: 'sine.inOut' }, 0.05)
        timeline.to(this.camera.zoom, { minDistance: distance, duration: duration * 0.9, ease: 'expo.inOut' }, 0.1)
        return timeline
    }

    async open(station, { automatic = false } = {})
    {
        if(this.state !== 'idle' || performance.now() < this.cooldownUntil || !station) { return false }
        this.state = 'opening'
        document.body.classList.add('bd-memory-open')
        this.pendingClose = false
        this.station = station
        this.automatic = automatic

        // 1. Vehicle stops
        this.controls.birthdayLocked = true
        this.updatePrompt()

        // 2. Save camera state
        this.saved = {
            angle: this.camera.angle.value.clone(),
            zoomTarget: this.camera.zoom.targetValue,
            minDistance: this.camera.zoom.minDistance,
            panEnabled: this.camera.pan.enabled,
            blur: [this.passes.horizontalBlurPass, this.passes.verticalBlurPass].map((pass) => pass.material.uniforms.uStrength.value.clone())
        }
        this.camera.pan.reset()
        this.camera.pan.disable()
        gsap.killTweensOf(this.camera.angle.value)

        // The photo is shown without the engine's tilt-shift blur
        this.passes.horizontalBlurPass.material.uniforms.uStrength.value.set(0, 0)
        this.passes.verticalBlurPass.material.uniforms.uStrength.value.set(0, 0)

        // 3. Load the photo (never blocks longer than 2.5 s; failures show a card)
        this.fillSheet(station)
        await Promise.race([station.ensureLoaded(station.photoIndex), new Promise((resolve) => setTimeout(resolve, 2500))])
        if(this.state !== 'opening') { return false }

        // 4. Camera transition
        const duration = this.duration(1.75)
        this.timeline = this.compose(station, duration)
        this.camera.zoom.targetValue = 0
        this.popPhoto(station)
        this.timeline.eventCallback('onComplete', () =>
        {
            if(this.state !== 'opening') { return }
            this.state = 'open'
            this.showSheet()
            this.playAudio()
            this.trigger('opened', [station])
            if(this.pendingClose) { this.close() }
        })
        return true
    }

    popPhoto(station)
    {
        gsap.killTweensOf(station.art.scale)
        if(this.reducedMotion) { station.art.scale.setScalar(1.12); return }
        // anticipation: the frame settles back a touch, then lifts toward the lens
        gsap.timeline()
            .fromTo(station.art.scale, { x: 1, y: 1, z: 1 }, { x: 0.965, y: 0.965, z: 0.965, duration: 0.45, ease: 'sine.out' }, 0.1)
            .to(station.art.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 1.25, ease: 'back.out(1.7)' }, 0.65)
    }

    fillSheet(station)
    {
        const photo = station.current
        const many = station.photos.length > 1
        this.$title.textContent = station.data.title
        this.$caption.textContent = station.caption
        this.$caption.hidden = !station.caption
        this.$date.textContent = station.data.date
        this.$date.hidden = !station.data.date
        this.$count.textContent = many ? `${station.photoIndex + 1} / ${station.photos.length}` : ''
        this.$prev.hidden = !many
        this.$next.hidden = !many
        this.setAudioButton(station.data.audio ? 'ready' : 'none')
        void photo
    }

    showSheet()
    {
        this.$root.hidden = false
        // restart CSS transition
        this.$root.classList.remove('is-visible')
        void this.$root.offsetWidth
        this.$root.classList.add('is-visible')
        this.$close.focus({ preventScroll: true })
    }

    async step(direction)
    {
        const station = this.station
        if(this.state !== 'open' || !station || station.photos.length < 2 || this.busy) { return }
        this.busy = true
        const next = station.photoIndex + direction
        await station.setPhoto(next)
        if(this.state === 'open')
        {
            this.fillSheet(station)
            // re-compose for the new aspect ratio
            const distance = this.computeDistance(station)
            gsap.to(this.camera.zoom, { minDistance: distance, duration: this.duration(0.6), ease: 'power2.inOut' })
            this.popPhoto(station)
        }
        this.busy = false
    }

    close()
    {
        if(this.state === 'opening') { this.pendingClose = true; return }
        if(this.state !== 'open') { return }
        this.state = 'closing'
        const station = this.station

        this.stopAudio()
        this.$root.classList.remove('is-visible')
        this.$root.hidden = true

        const duration = this.duration(1.1)
        gsap.killTweensOf(station.art.scale)
        gsap.to(station.art.scale, { x: 1, y: 1, z: 1, duration: this.duration(0.5), ease: 'power2.out' })

        gsap.killTweensOf(this.camera.focus)
        gsap.killTweensOf(this.camera.angle.value)
        gsap.killTweensOf(this.camera.zoom)
        gsap.to(this.camera.angle.value, { x: this.saved.angle.x, y: this.saved.angle.y, z: this.saved.angle.z, duration, ease: 'power2.inOut' })
        gsap.to(this.camera.zoom, { minDistance: this.saved.minDistance, duration, ease: 'power2.inOut' })
        this.camera.zoom.targetValue = this.saved.zoomTarget
        gsap.to(this.camera.focus, {
            weight: 0,
            duration,
            ease: 'power2.inOut',
            onComplete: () =>
            {
                // 5. Restore driving
                this.passes.horizontalBlurPass.material.uniforms.uStrength.value.copy(this.saved.blur[0])
                this.passes.verticalBlurPass.material.uniforms.uStrength.value.copy(this.saved.blur[1])
                if(this.saved.panEnabled) { this.camera.pan.enable() }
                this.camera.target.z = 0
                this.controls.birthdayLocked = false
                document.body.classList.remove('bd-memory-open')
                this.state = 'idle'
                this.cooldownUntil = performance.now() + 700
                this.station = null
                this.updatePrompt()
                this.trigger('closed', [station])
            }
        })
    }

    /* ---------- optional audio ---------- */

    setAudioButton(state)
    {
        this.audioState = state
        this.$audio.hidden = state === 'none'
        this.$audio.disabled = state === 'failed'
        this.$audio.textContent = { ready: '♪ Play message', playing: '❚❚ Pause message', paused: '♪ Resume message', failed: 'Audio unavailable' }[state] || ''
    }

    playAudio()
    {
        const src = this.station && this.station.data.audio
        if(!src) { return }
        this.stopAudio()
        this.howl = new Howl({
            src: [src],
            html5: true,
            volume: 0.9,
            onplay: () => this.setAudioButton('playing'),
            onend: () => this.setAudioButton('ready'),
            onpause: () => this.setAudioButton('paused'),
            // A missing/blocked audio file must never affect the memory itself
            onloaderror: () => { console.warn(`[birthday] audio unavailable: ${src}`); this.setAudioButton('failed') },
            onplayerror: () => { this.setAudioButton('ready') }
        })
        this.howl.play()
    }

    toggleAudio()
    {
        if(!this.howl) { this.playAudio(); return }
        if(this.howl.playing()) { this.howl.pause() } else { this.howl.play() }
    }

    stopAudio()
    {
        if(this.howl)
        {
            this.howl.stop()
            this.howl.unload()
            this.howl = null
        }
    }

    dispose()
    {
        window.removeEventListener('keydown', this.keydown)
        this.stopAudio()
        this.$root.remove()
        this.$prompt.remove()
    }
}

function escapeHtml(text)
{
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]))
}
