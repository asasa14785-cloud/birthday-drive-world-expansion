import * as THREE from 'three'
import gsap from 'gsap'
import EventEmitter from '../Utils/EventEmitter.js'
import Cake from './Cake.js'
import { createConfetti } from './Confetti.js'
import { CAMERA_FACING } from './Props.js'

/**
 * Celebration destination (region 05).
 *
 *   car enters the plaza  → camera drifts so the cake is the focal point,
 *                           the recipient's name rises over it, candles burn
 *   park at the cake      → "blow out the candles" prompt
 *   interact              → input lock, camera composition, flames go out one
 *                           by one with smoke, confetti bursts, balloons rise,
 *                           final message sheet (Replay / Keep exploring)
 *   replay                → candles relight and the sequence can run again
 *
 * Uses the HBD cake/candle/confetti ports; the world, camera, areas and tweens
 * are all Bruno's / GSAP.
 */
export default class Finale extends EventEmitter
{
    constructor(_options)
    {
        super()
        this.props = _options.props
        this.areas = _options.areas
        this.camera = _options.camera
        this.controls = _options.controls
        this.passes = _options.passes
        this.time = _options.time
        this.viewer = _options.viewer
        this.config = _options.config
        this.sizes = _options.sizes
        this.center = _options.center // Vector2
        this.state = 'idle' // idle | intro | ready | celebrating | message
        this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        this.container = new THREE.Object3D()
        this.container.position.set(this.center.x, this.center.y, 0)
        this.props.add(this.container)

        this.setPlatform()
        this.setCake()
        this.setSign()
        this.setBalloons()
        this.setConfetti()
        this.setAreas()
        this.setDom()

        this.time.on('tick', () => this.update())
    }

    setPlatform()
    {
        const p = this.props
        const pink = p.tint(this.config.theme.accent)
        const white = p.tint('#ffffff')
        const gold = p.tint('#ffd76a')

        const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.9, 0.5, 48).rotateX(Math.PI * 0.5), white)
        disc.position.z = 0.25
        this.container.add(disc)
        const step = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 0.55, 48).rotateX(Math.PI * 0.5), pink)
        step.position.z = 0.55
        this.container.add(step)

        // Soft floor decal ring
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(6.4, 9.2, 64),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(this.config.theme.accent), transparent: true, opacity: 0.35, depthWrite: false })
        )
        ring.position.z = 0.03
        this.container.add(ring)

        // Poles with gold tops around the plaza (decor)
        const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 4.4, 8).rotateX(Math.PI * 0.5)
        const topGeo = new THREE.SphereGeometry(0.34, 10, 8)
        for(let i = 0; i < 10; i++)
        {
            const a = (i / 10) * Math.PI * 2 + 0.31
            if(Math.cos(a) < - 0.85) { continue } // keep the entrance open
            const x = Math.cos(a) * 10.6
            const y = Math.sin(a) * 10.6
            const pole = new THREE.Mesh(poleGeo, white)
            pole.position.set(x, y, 2.2)
            this.container.add(pole)
            const top = new THREE.Mesh(topGeo, gold)
            top.position.set(x, y, 4.5)
            this.container.add(top)
            this.props.solid({ x: this.center.x + x, y: this.center.y + y, colliders: [{ type: 'cube', sx: 0.5, sy: 0.5, sz: 4 , z: 2 }] })
        }

        // Cake pedestal collider (the car cannot drive through the cake)
        this.props.solid({ x: this.center.x, y: this.center.y, colliders: [{ type: 'cube', sx: 7.4, sy: 7.4, sz: 1.2, z: 0.6 }] })
    }

    setCake()
    {
        this.cake = new Cake({ props: this.props, config: this.config.cake })
        this.cakeHolder = new THREE.Object3D()
        this.cakeHolder.rotation.x = Math.PI * 0.5 // Y-up cake -> Z-up world
        this.cakeHolder.position.z = 0.82
        this.cakeHolder.scale.setScalar(1.9)
        this.cakeHolder.add(this.cake.group)
        this.container.add(this.cakeHolder)
    }

    setSign()
    {
        const p = this.props
        this.sign = new THREE.Object3D()
        this.sign.rotation.z = CAMERA_FACING
        this.sign.position.z = 8.6
        this.container.add(this.sign)

        const title = p.textPlane([this.config.finale.title], 13, 2.6, { color: '#fff7e6', stroke: '#c9577c', font: '700 150px "Comic Neue", "Trebuchet MS", sans-serif' })
        title.rotation.x = Math.PI * 0.5
        title.material.opacity = 0
        this.sign.add(title)
        this.signTitle = title

        const message = p.textPlane([this.config.finale.message], 12, 1.4, { color: '#fff7e6', stroke: '#c9577c', font: '700 90px "Comic Neue", "Trebuchet MS", sans-serif' })
        message.rotation.x = Math.PI * 0.5
        message.position.z = - 2.2
        message.material.opacity = 0
        this.sign.add(message)
        this.signMessage = message
    }

    setBalloons()
    {
        const geo = new THREE.SphereGeometry(0.7, 14, 10)
        geo.scale(1, 1, 1.18)
        const colors = ['#f2a6ba', '#ffd76a', '#ffffff', '#9fd8ff', '#c9a6ff', '#ff8fb1']
        this.balloons = []
        for(let i = 0; i < 12; i++)
        {
            // Phase 3: arc on the far/side half of the plaza only — the camera arrives from -X and a balloon in front of the lens hid the cake
            const a = - 1.95 + (i / 11) * 3.9
            const r = 7.6 + (i % 3) * 0.9
            const mesh = new THREE.Mesh(geo, this.props.tint(colors[i % colors.length]))
            mesh.position.set(Math.cos(a) * r, Math.sin(a) * r, 3.4 + (i % 4) * 0.5)
            mesh.userData = { baseZ: mesh.position.z, phase: i * 0.7 }
            this.container.add(mesh)
            this.balloons.push(mesh)
        }
        this.balloonGeo = geo
    }

    setConfetti()
    {
        this.confetti = createConfetti({ count: 420, palette: [0xf2a6ba, 0xffd76a, 0xffffff, 0x9fd8ff, 0xc9a6ff, 0xff8fb1, 0x8bd17c] })
        this.confettiHolder = new THREE.Object3D()
        this.confettiHolder.rotation.x = Math.PI * 0.5
        this.confettiHolder.add(this.confetti.mesh)
        this.container.add(this.confettiHolder)
    }

    setAreas()
    {
        // Approach: start the staging; Cake spot: interact to blow the candles
        this.approachArea = this.areas.add({
            position: new THREE.Vector2(this.center.x - 16, this.center.y),
            halfExtents: new THREE.Vector2(6, 7), hasKey: false, testCar: true, active: true
        })
        this.approachArea.on('in', () => this.begin())
        this.approachArea.on('out', () => this.leave())

        this.cakeArea = this.areas.add({
            position: new THREE.Vector2(this.center.x - 8.6, this.center.y),
            halfExtents: new THREE.Vector2(2.8, 3.4), hasKey: true, testCar: true, active: true
        })
        this.cakeArea.on('in', () => { this.atCake = true; this.begin(); this.updatePrompt() })
        this.cakeArea.on('out', () => { this.atCake = false; this.updatePrompt() })
        this.cakeArea.on('interact', () => this.celebrate())
    }

    setDom()
    {
        this.$prompt = document.createElement('button')
        this.$prompt.className = 'bd-prompt bd-prompt-finale'
        this.$prompt.type = 'button'
        this.$prompt.hidden = true
        this.$prompt.innerHTML = `<span class="bd-prompt-icon">&#127874;</span><span><strong>Make a wish</strong><small>${this.sizes ? '' : ''}<span class="bd-verb"></span> to blow out the candles</small></span>`
        document.body.appendChild(this.$prompt)
        this.$prompt.addEventListener('click', () => this.celebrate())
        this.$prompt.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true })

        this.$panel = document.createElement('div')
        this.$panel.className = 'bd-memory bd-final'
        this.$panel.hidden = true
        this.$panel.innerHTML = `
            <div class="bd-sheet bd-sheet-final">
                <p class="bd-meta"><span class="bd-sender"></span></p>
                <h2 class="bd-title"></h2>
                <p class="bd-caption"></p>
                <div class="bd-actions">
                    <button type="button" class="bd-btn bd-replay">&#8635; Replay</button>
                    <button type="button" class="bd-btn bd-primary bd-explore">Keep exploring</button>
                </div>
            </div>`
        document.body.appendChild(this.$panel)
        this.$panel.querySelector('.bd-title').textContent = this.config.finale.title
        this.$panel.querySelector('.bd-caption').textContent = this.config.finale.message
        this.$panel.querySelector('.bd-sender').textContent = this.config.sender
        this.$panel.querySelector('.bd-replay').addEventListener('click', () => this.replay())
        this.$panel.querySelector('.bd-explore').addEventListener('click', () => this.finish())
        for(const ev of ['touchstart', 'mousedown']) { this.$panel.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }) }

        window.addEventListener('keydown', (event) =>
        {
            if(this.state === 'message' && event.code === 'Escape') { this.finish() }
        })
    }

    d(seconds) { return this.reducedMotion ? 0.01 : seconds }

    updatePrompt()
    {
        const show = this.atCake && ['intro', 'ready'].includes(this.state) && !this.viewer.isOpen
        this.$prompt.hidden = !show
        if(show) { this.$prompt.querySelector('.bd-verb').textContent = document.body.classList.contains('bd-touch') ? 'Tap' : 'Press Enter' }
    }

    /** 1-3: the car approaches, the cake becomes the focal point, the name appears */
    begin()
    {
        if(this.state !== 'idle') { return }
        this.state = 'intro'
        const f = this.camera.focus
        gsap.killTweensOf(f)
        gsap.to(f, { x: this.center.x, y: this.center.y, z: 3, weight: 0.65, duration: this.d(2.2), ease: 'power2.inOut' })
        gsap.to(this.signTitle.material, { opacity: 1, duration: this.d(1.2), delay: this.d(0.6) })
        gsap.fromTo(this.sign.position, { z: 6.4 }, { z: 8.6, duration: this.d(1.6), delay: this.d(0.6), ease: 'back.out(1.4)' })
        gsap.delayedCall(this.d(2.4), () => { if(this.state === 'intro') { this.state = 'ready'; this.updatePrompt() } })
        this.updatePrompt()
        this.emit('intro')
    }

    leave()
    {
        if(this.state !== 'intro' && this.state !== 'ready') { return }
        this.state = 'idle'
        gsap.killTweensOf(this.camera.focus)
        gsap.to(this.camera.focus, { weight: 0, duration: this.d(1.4), ease: 'power2.inOut' })
        gsap.to(this.signTitle.material, { opacity: 0, duration: this.d(0.8) })
        this.updatePrompt()
    }

    emit(name) { this.trigger(name) }

    /** 4-6: blow out candles, celebration, final message */
    celebrate()
    {
        if(this.state === 'idle') { this.state = 'ready' }
        if(!['intro', 'ready'].includes(this.state) || this.viewer.isOpen) { return }
        this.state = 'celebrating'
        this.controls.birthdayLocked = true
        this.updatePrompt()

        const cam = this.camera
        const f = cam.focus
        this.saved = { angle: cam.angle.value.clone(), zoomTarget: cam.zoom.targetValue, minDistance: cam.zoom.minDistance, pan: cam.pan.enabled }
        cam.pan.reset(); cam.pan.disable()
        gsap.killTweensOf(f); gsap.killTweensOf(cam.zoom)
        gsap.to(f, { x: this.center.x, y: this.center.y, z: 3.6, weight: 1, duration: this.d(1.6), ease: 'power2.inOut' })
        gsap.to(cam.zoom, { minDistance: 13, duration: this.d(1.6), ease: 'power2.inOut' })
        cam.zoom.targetValue = 0

        const tl = gsap.timeline({ delay: this.d(1.2) })
        const flames = this.cake.flames
        // anticipation: the cake takes a breath before the wish
        tl.to(this.cake.group.scale, { x: 0.96, y: 0.96, z: 0.96, duration: this.d(0.45), ease: 'sine.inOut' }, 0)
        tl.to(this.cake.group.scale, { x: 1, y: 1, z: 1, duration: this.d(0.7), ease: 'elastic.out(1, 0.5)' }, this.d(0.45))
        // Candles go out one by one, a puff of confetti for each wish
        flames.forEach((flame, i) =>
        {
            tl.to(flame.scale, { x: 0.001, y: 0.001, z: 0.001, duration: this.d(0.25), ease: 'power2.in' }, i * this.d(0.14))
            tl.call(() => this.trigger('puff', [i]), null, i * this.d(0.14) + this.d(0.2))
        })
        const afterCandles = flames.length * this.d(0.14) + this.d(0.2)
        tl.call(() => this.burst(), null, afterCandles)
        tl.call(() => this.burst(), null, afterCandles + this.d(0.6))
        tl.call(() => this.burst(), null, afterCandles + this.d(1.2))
        tl.to(this.signMessage.material, { opacity: 1, duration: this.d(0.8) }, afterCandles + this.d(0.3))
        // Balloons lift & sway
        this.balloons.forEach((b, i) =>
        {
            tl.to(b.position, { z: b.userData.baseZ + 3.5 + (i % 3), duration: this.d(2.2), ease: 'power1.out' }, afterCandles + i * 0.04)
        })
        tl.call(() => this.showMessage(), null, afterCandles + this.d(1.6))
        this.tl = tl
    }

    burst()
    {
        const origin = new THREE.Vector3(0, 3.3, 0)
        // holder space: Y-up above the cake
        this.confetti.burst(origin, 160, 1.2)
        this.trigger('burst')
    }

    showMessage()
    {
        this.state = 'message'
        this.$panel.hidden = false
        this.$panel.classList.remove('is-visible')
        void this.$panel.offsetWidth
        this.$panel.classList.add('is-visible')
        this.$panel.querySelector('.bd-replay').focus({ preventScroll: true })
    }

    /** 7a: replay the whole sequence */
    replay()
    {
        if(this.state !== 'message') { return }
        this.$panel.hidden = true
        this.$panel.classList.remove('is-visible')
        this.relight()
        this.confetti.clear()
        this.state = 'ready'
        gsap.to(this.signMessage.material, { opacity: 0, duration: this.d(0.3) })
        this.balloons.forEach((b) => gsap.to(b.position, { z: b.userData.baseZ, duration: this.d(0.8) }))
        this.celebrateAfterReplay()
    }

    celebrateAfterReplay()
    {
        // run directly: camera is already composed
        this.state = 'ready'
        const cam = this.camera
        void cam
        this.restoreHandled = true
        const tl = gsap.timeline({ delay: this.d(0.8) })
        this.cake.flames.forEach((flame, i) => tl.to(flame.scale, { x: 0.001, y: 0.001, z: 0.001, duration: this.d(0.25) }, i * this.d(0.14)))
        const after = this.cake.flames.length * this.d(0.14) + this.d(0.2)
        tl.call(() => this.burst(), null, after)
        tl.call(() => this.burst(), null, after + this.d(0.6))
        tl.to(this.signMessage.material, { opacity: 1, duration: this.d(0.8) }, after + this.d(0.3))
        this.balloons.forEach((b, i) => tl.to(b.position, { z: b.userData.baseZ + 3.5 + (i % 3), duration: this.d(2) }, after + i * 0.04))
        tl.call(() => this.showMessage(), null, after + this.d(1.6))
        this.state = 'celebrating'
    }

    relight()
    {
        this.cake.flames.forEach((flame) => { gsap.killTweensOf(flame.scale); flame.scale.setScalar(1) })
    }

    /** 7b: leave the destination, restore driving & camera */
    finish()
    {
        if(this.state !== 'message') { return }
        this.$panel.hidden = true
        this.$panel.classList.remove('is-visible')
        const cam = this.camera
        gsap.killTweensOf(cam.focus); gsap.killTweensOf(cam.zoom); gsap.killTweensOf(cam.angle.value)
        gsap.to(cam.zoom, { minDistance: this.saved.minDistance, duration: this.d(1.2), ease: 'power2.inOut' })
        cam.zoom.targetValue = this.saved.zoomTarget
        gsap.to(cam.focus, { weight: 0.65, z: 3, duration: this.d(1.2), ease: 'power2.inOut', onComplete: () =>
        {
            if(this.saved.pan) { cam.pan.enable() }
            this.controls.birthdayLocked = false
            this.relight()
            this.state = 'ready'
            gsap.to(this.signMessage.material, { opacity: 0, duration: this.d(0.6) })
            this.balloons.forEach((b) => gsap.to(b.position, { z: b.userData.baseZ, duration: this.d(2) }))
            this.updatePrompt()
            this.trigger('finished')
        } })
    }

    update()
    {
        const elapsed = this.time.elapsed * 0.001
        const delta = Math.min(this.time.delta * 0.001, 0.05)
        this.cake.update(elapsed)
        this.confetti.update(delta)
        for(const b of this.balloons)
        {
            b.rotation.z = Math.sin(elapsed * 0.9 + b.userData.phase) * 0.15
            b.rotation.x = Math.cos(elapsed * 0.7 + b.userData.phase) * 0.1
        }
    }
}
