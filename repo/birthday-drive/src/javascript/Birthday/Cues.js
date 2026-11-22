import { Howler } from 'howler'

/**
 * Original synthesized UI/celebration cues (no third-party audio, no licence needed).
 * Runs on Howler's own AudioContext + master gain, so Howler.mute() / master volume / autoplay unlocking
 * from the existing audio system apply automatically. Every cue peaks at <= 0.12 gain with a soft attack
 * (no sudden loud sound) and silently does nothing if the context is unavailable or still locked.
 */
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12)

export default class Cues
{
    constructor()
    {
        this.last = {}
    }

    get ctx() { return Howler.ctx && Howler.ctx.state === 'running' ? Howler.ctx : null }

    tone(freq, start, dur, peak = 0.08, type = 'sine')
    {
        const ctx = this.ctx
        if(!ctx) { return }
        const out = Howler.masterGain || ctx.destination
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const t = ctx.currentTime + start
        osc.type = type
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(peak, t + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        osc.connect(gain); gain.connect(out)
        osc.start(t); osc.stop(t + dur + 0.05)
    }

    throttle(name, ms)
    {
        const now = performance.now()
        if(this.last[name] && now - this.last[name] < ms) { return false }
        this.last[name] = now
        return true
    }

    /** soft two-note sparkle when a memory opens */
    open() { if(!this.throttle('open', 400)) { return } this.tone(NOTE(79), 0, 0.5, 0.06); this.tone(NOTE(86), 0.09, 0.7, 0.05) }
    /** descending soft note when it closes */
    close() { if(!this.throttle('close', 400)) { return } this.tone(NOTE(81), 0, 0.35, 0.05); this.tone(NOTE(74), 0.08, 0.45, 0.04) }
    /** tiny tick as each candle goes out */
    puff(i = 0) { this.tone(NOTE(88 + (i % 5)), 0, 0.18, 0.035, 'triangle') }
    /** warm arpeggio + chord for the birthday reveal */
    fanfare()
    {
        if(!this.throttle('fanfare', 1500)) { return }
        const seq = [60, 64, 67, 72, 76, 79]
        seq.forEach((n, i) => this.tone(NOTE(n), i * 0.11, 0.9, 0.07, 'triangle'))
        ;[60, 64, 67, 72].forEach((n) => this.tone(NOTE(n), 0.75, 2.2, 0.045, 'sine'))
    }
}
