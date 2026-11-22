import nipplejs from 'nipplejs'

/**
 * NippleJS (MIT) virtual joystick feeding Bruno's ORIGINAL vehicle input.
 *
 * Bruno's Physics reads `controls.touch.joystick.active` and
 * `controls.touch.joystick.angle.value` (a world angle, screen angle + offset).
 * This adapter writes exactly those two fields from nipple's `move` events and
 * emits the original `joystickStart/Move/End` triggers — Physics/Car are
 * untouched. The native DOM joystick is hidden and its listener removed.
 *
 * Extras: dead zone, centre reset on end/cancel/blur, memory lock
 * (`controls.birthdayLocked` forces inactive), page-scroll prevention
 * (touch-action: none on the zone), full cleanup in destroy().
 * Brake + Reset buttons feed the original `actions.brake` / 'reset' action.
 */
export default class Joystick
{
    constructor({ controls })
    {
        this.controls = controls
        this.raw = false
        this.deadZone = 0.2 // fraction of the stick radius
        this.attached = false
        this.listeners = []
    }

    attach()
    {
        if(this.attached || !this.controls.touch) { return }
        this.attached = true
        const native = this.controls.touch.joystick

        // Hide the native stick and stop it from receiving touches
        native.$element.removeEventListener('touchstart', native.events.touchstart)
        native.$element.style.display = 'none'

        // `active` is read by Physics every frame: lock-aware accessor
        this.raw = false
        Object.defineProperty(native, 'active', {
            configurable: true,
            enumerable: true,
            get: () => (this.controls.birthdayLocked ? false : this.raw),
            set: (value) => { this.raw = value }
        })

        this.$zone = document.createElement('div')
        this.$zone.className = 'bd-joystick'
        this.$zone.setAttribute('aria-label', 'Steering joystick')
        document.body.appendChild(this.$zone)

        this.manager = nipplejs.create({
            zone: this.$zone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: '#ffffff',
            size: 130,
            threshold: 0.1,
            fadeTime: 120,
            restOpacity: 0.55,
            multitouch: false,
            maxNumberOfNipples: 1
        })

        this.manager.on('start', () =>
        {
            this.controls.camera.pan.reset()
            this.controls.trigger('joystickStart')
        })

        // Angle/dead-zone are computed from the raw touch relative to the stick centre (same maths as Bruno's
        // original joystick). NippleJS renders the stick and owns start/end/removal; its `move` payload proved
        // unreliable under synthetic touch input, so it is not used for the vector (see docs/INTEGRATION_REPORT.md).
        this.touchId = null
        const update = (touch) =>
        {
            const rect = this.$zone.getBoundingClientRect()
            const dx = touch.clientX - (rect.left + rect.width / 2)
            const dy = touch.clientY - (rect.top + rect.height / 2)
            // Bruno's own tick recomputes the angle from angle.center/current while `active`: feed it real coordinates
            native.angle.center.x = rect.left + rect.width / 2
            native.angle.center.y = rect.top + rect.height / 2
            native.angle.current.x = touch.clientX
            native.angle.current.y = touch.clientY
            if(Math.hypot(dx, dy) / 65 < this.deadZone) { native.active = false; return }
            native.angle.originalValue = Math.atan2(- dy, dx)
            native.angle.value = native.angle.originalValue + native.angle.offset
            native.active = true
            this.controls.trigger('joystickMove')
        }
        this.listen(this.$zone, 'touchstart', (event) => { const t = event.changedTouches[0]; this.touchId = t.identifier; update(t) }, { passive: true, capture: true })
        this.listen(document, 'touchmove', (event) => { for(const t of event.changedTouches) { if(t.identifier === this.touchId) { update(t) } } }, { passive: true })
        this.listen(document, 'touchend', (event) => { for(const t of event.changedTouches) { if(t.identifier === this.touchId) { this.touchId = null; release() } } }, { passive: true })

        const release = () =>
        {
            native.active = false
            this.controls.trigger('joystickEnd')
        }
        this.manager.on('end', release)
        this.manager.on('removed', release)

        // Safety nets: lost focus / cancelled touches must never leave the car accelerating
        this.listen(window, 'blur', release)
        this.listen(document, 'visibilitychange', release)
        this.listen(window, 'touchcancel', release)

        this.setButtons()
    }

    listen(target, name, handler, options)
    {
        target.addEventListener(name, handler, options)
        this.listeners.push(() => target.removeEventListener(name, handler, options))
    }

    setButtons()
    {
        const controls = this.controls

        this.$brake = document.createElement('button')
        this.$brake.type = 'button'
        this.$brake.className = 'bd-touch-btn bd-brake'
        this.$brake.textContent = 'BRAKE'
        this.$brake.setAttribute('aria-label', 'Brake')
        document.body.appendChild(this.$brake)

        const down = (event) => { event.preventDefault(); event.stopPropagation(); controls.actions.brake = true; this.$brake.classList.add('is-on') }
        const up = () => { controls.actions.brake = false; this.$brake.classList.remove('is-on') }
        this.$brake.addEventListener('pointerdown', down)
        for(const name of ['pointerup', 'pointercancel', 'pointerleave']) { this.$brake.addEventListener(name, up) }
        this.listeners.push(() => this.$brake.remove())

        this.$reset = document.createElement('button')
        this.$reset.type = 'button'
        this.$reset.className = 'bd-touch-btn bd-reset'
        this.$reset.innerHTML = '&#8635;'
        this.$reset.setAttribute('aria-label', 'Reset car')
        document.body.appendChild(this.$reset)
        this.$reset.addEventListener('click', () => controls.trigger('action', ['reset']))
        this.listeners.push(() => this.$reset.remove())
    }

    destroy()
    {
        if(this.manager) { this.manager.destroy(); this.manager = null }
        this.listeners.forEach((off) => off())
        this.listeners = []
        if(this.$zone) { this.$zone.remove() }
        this.attached = false
    }
}
