import * as THREE from 'three'
import EventEmitter from '../Utils/EventEmitter.js'

/**
 * Guided tour — an autopilot that only writes Bruno's ORIGINAL action flags
 * (up / left / right / brake). It follows the route polyline, stops at each
 * memory (viewer.open → auto-closes after a reading time), then ends at the
 * cake where the celebration is triggered. Any manual input cancels it.
 */
export default class Tour extends EventEmitter
{
    constructor(_options)
    {
        super()
        this.controls = _options.controls
        this.physics = _options.physics
        this.viewer = _options.viewer
        this.finale = _options.finale
        this.time = _options.time
        this.route = _options.route // [{ x, y, station?, finale? }]
        this.active = false
        this.index = 0
        this.state = 'driving' // driving | stopping | viewing | waiting | ending
        this.timer = 0
        this.stuck = 0

        this.cancelKeys = (event) =>
        {
            if(!this.active) { return }
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyT', 'Escape'].includes(event.code))
            {
                if(this.viewer.state === 'idle') { this.stop() }
            }
        }
        window.addEventListener('keydown', this.cancelKeys)
        this.viewer.on('closed', () => { if(this.active && this.state === 'viewing') { this.state = 'waiting'; this.timer = 0.8 } })
        this.time.on('tick', () => this.update(Math.min(this.time.delta * 0.001, 0.05)))
    }

    start()
    {
        if(this.active || this.viewer.isOpen) { return }
        const car = this.physics.car.chassis.body.position
        // continue from the next waypoint that is ahead of the car along the route
        let best = 0
        let bestDist = Infinity
        this.route.forEach((p, i) => { const d = Math.hypot(p.x - car.x, p.y - car.y); if(d < bestDist) { bestDist = d; best = i } })
        this.index = Math.min(best, this.route.length - 1)
        this.active = true
        this.state = 'driving'
        this.stuck = 0
        this.trigger('start')
    }

    stop()
    {
        if(!this.active) { return }
        this.active = false
        this.release()
        this.trigger('stop')
    }

    release()
    {
        const a = this.controls.actions
        a.up = false; a.left = false; a.right = false; a.brake = false; a.boost = false
    }

    update(delta)
    {
        if(!this.active) { return }
        const a = this.controls.actions
        const car = this.physics.car

        if(this.viewer.isOpen) { return }
        if(this.state === 'waiting')
        {
            this.timer -= delta
            this.release()
            if(this.timer <= 0) { this.index++; this.state = 'driving' }
            return
        }
        if(this.state === 'ending') { this.release(); return }
        if(this.index >= this.route.length) { this.stop(); return }

        const point = this.route[this.index]
        const pos = car.chassis.body.position
        const dx = point.x - pos.x
        const dy = point.y - pos.y
        const distance = Math.hypot(dx, dy)
        const speed = Math.abs(car.forwardSpeed) * 60

        if(this.state === 'stopping')
        {
            a.up = false; a.left = false; a.right = false; a.brake = true
            if(speed < 0.35)
            {
                a.brake = false
                if(point.station)
                {
                    this.state = 'viewing'
                    this.viewer.open(point.station, { automatic: true }).then((ok) =>
                    {
                        if(!ok) { this.state = 'waiting'; this.timer = 0.6 }
                        else { this.viewTimeout = window.setTimeout(() => { if(this.active && this.viewer.state === 'open') { this.viewer.close() } }, 5200) }
                    })
                }
                else if(point.finale)
                {
                    this.state = 'ending'
                    this.finale.celebrate()
                    this.finale.on('burst', () => {})
                    window.setTimeout(() => this.stop(), 2500)
                }
            }
            return
        }

        // Reached a pure waypoint
        const reach = point.station || point.finale ? 1.6 : 4.5
        if(distance < reach)
        {
            if(point.station || point.finale) { this.state = 'stopping'; return }
            this.index++
            return
        }

        // Steer toward the waypoint
        const desired = Math.atan2(dy, dx)
        let diff = desired - car.angle
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        a.left = diff > 0.1
        a.right = diff < - 0.1
        a.brake = false
        a.boost = false
        // slow down for sharp turns and when approaching a stop
        const approaching = (point.station || point.finale) && distance < 9
        a.up = Math.abs(diff) < 1.1 && !(approaching && speed > 5.5)
        a.down = false
        if(approaching && speed > 7) { a.brake = true }

        // Stuck? skip the waypoint (unless it is a stop)
        if(speed < 0.25 && a.up) { this.stuck += delta } else { this.stuck = 0 }
        if(this.stuck > 3.5)
        {
            this.stuck = 0
            if(point.station || point.finale) { this.state = 'stopping' } else { this.index++ }
        }
    }

    dispose()
    {
        window.removeEventListener('keydown', this.cancelKeys)
        window.clearTimeout(this.viewTimeout)
    }
}

void THREE
