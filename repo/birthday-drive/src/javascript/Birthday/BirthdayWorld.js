import * as THREE from 'three'
import gsap from 'gsap'
import { Howler } from 'howler'
import './birthday.css'
import Props, { CAMERA_FACING } from './Props.js'
import MemoryStation from './MemoryStation.js'
import MemoryViewer from './MemoryViewer.js'
import Finale from './Finale.js'
import Joystick from './Joystick.js'
import Tour from './Tour.js'
import Cues from './Cues.js'
import StorybookSlice, { inSliceClearZone } from './StorybookSlice.js'

/**
 * BirthdayWorld — assembles the five connected regions on top of Bruno's
 * engine (floor, tiles, areas, physics, car, camera are all the original).
 *
 *   01 ARRIVAL GATE → 02 CHILDHOOD GARDEN → 03 FRIENDSHIP AVENUE
 *   → 04 MEMORY LANDMARKS → 05 CELEBRATION DESTINATION
 *
 * One driveable route (stepping-stone path from Bruno's Tiles), stations
 * filled from the data-driven config, scenery merged into a handful of draw
 * calls, then viewer / finale / joystick / tour wired to the original
 * controls.
 */

// Route polyline in world XY (Z up). The car starts at (0, 0).
// The camera looks toward -x/+y, so the route runs AWAY from it (towards the top of the screen)
const ROUTE = [[0, 6], [0, 54], [- 46, 54], [- 46, 102], [- 9.5, 102]]
const PLAZA = new THREE.Vector2(0, 102)

const SEGMENTS = [
    { zone: 'childhood', from: 0, to: 1 },
    { zone: 'friends', from: 1, to: 2 },
    { zone: 'landmarks', from: 2, to: 3 }
]

// Slot = distance along the segment. Frames sit on the side the default camera sees.
const SLOTS = {
    childhood: [20, 32, 42].map((d) => ({ seg: 0, d, offset: 6.6 })),
    friends: [12, 26, 40].map((d) => ({ seg: 1, d, offset: 7.6 })),
    landmarks: [10, 24, 38].map((d) => ({ seg: 2, d, offset: 8.4 }))
}

function rng(seed)
{
    let a = seed >>> 0
    return () =>
    {
        a = (a + 0x6D2B79F5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export default class BirthdayWorld
{
    constructor(_options)
    {
        Object.assign(this, _options)
        this.bd = _options.birthday
        this.rand = rng(20260521)
        this.stations = []
        this.seen = new Set()
        this.warnings = this.bd.warnings || []

        this.setTheme()
        this.props = new Props({ materials: this.materials, physics: this.physics, container: this.container })
        this.setRoute()
        this.setCar()
        this.faceRoute()
        this.setViewer()
        this.setGate()
        this.setStations()
        this.setStorybookSlice()
        this.setScenery()
        this.setRegionSigns()
        this.setFinale()
        this.setTour()
        this.setTouch()
        this.setHud()

        // Handy for tests / debugging
        window.birthday = this
    }

    /* ---------- art direction ---------- */

    setTheme()
    {
        const t = this.bd.theme
        const c = this.floor.colors
        c.topLeft = t.floorTopLeft
        c.topRight = t.floorTopRight
        c.bottomRight = t.floorBottomRight
        c.bottomLeft = t.floorBottomLeft
        this.floor.updateMaterial()

        // Indirect light + floor shadows follow the palette (set before tints are cloned)
        const shadow = this.materials.items.floorShadow
        shadow.shadowColor = '#c46a8a'
        shadow.uniforms.uShadowColor.value = new THREE.Color(shadow.shadowColor)
        this.materials.shades.indirectColor = '#e07a9c'
        this.materials.shades.updateMaterials()
    }

    /** The original car spawns facing -y (towards the camera); turn it to follow the route. */
    faceRoute()
    {
        const angle = Math.PI * 0.5
        this.physics.car.chassis.body.quaternion.set(0, 0, Math.sin(angle / 2), Math.cos(angle / 2))
    }

    setCar()
    {
        const body = this.materials.shades.items.orange
        const tinted = this.props.tint(this.bd.carColor)
        this.car.chassis.object.traverse((child) =>
        {
            if(child.isMesh && child.material && (child.material === body || child.material.name === 'shadeOrange')) { child.material = tinted }
        })
    }

    /* ---------- route ---------- */

    setRoute()
    {
        this.route = ROUTE.map(([x, y]) => new THREE.Vector2(x, y))
        for(let i = 0; i < this.route.length - 1; i++)
        {
            const a = this.route[i]
            const b = this.route[i + 1]
            this.tiles.add({ start: a.clone(), delta: b.clone().sub(a) })
        }
        // Tiles for the plaza approach corner
        this.tiles.add({ start: new THREE.Vector2(- 46, 54), delta: new THREE.Vector2(0, 2) })
    }

    segment(i)
    {
        const a = this.route[i]
        const b = this.route[i + 1]
        const dir = b.clone().sub(a)
        const length = dir.length()
        dir.normalize()
        return { a, b, dir, length }
    }

    /** Distance from a point to the whole route polyline. */
    distanceToRoute(x, y)
    {
        let best = Infinity
        for(let i = 0; i < this.route.length - 1; i++)
        {
            const { a, dir, length } = this.segment(i)
            const t = THREE.MathUtils.clamp((x - a.x) * dir.x + (y - a.y) * dir.y, 0, length)
            best = Math.min(best, Math.hypot(x - (a.x + dir.x * t), y - (a.y + dir.y * t)))
        }
        return best
    }

    /* ---------- systems ---------- */

    setViewer()
    {
        this.viewer = new MemoryViewer({
            camera: this.camera,
            passes: this.passes,
            controls: this.controls,
            sizes: this.sizes,
            config: this.config,
            sounds: this.sounds
        })
        this.cues = new Cues()
        this.viewer.on('closed', () => this.cues.close())
        this.viewer.on('opened', (station) =>
        {
            this.cues.open()
            this.seen.add(station.data.id)
            this.updateProgress()
        })
    }

    setGate()
    {
        const p = this.props
        const white = p.tint('#ffffff')
        const pink = p.tint(this.bd.theme.accent)
        const gold = p.tint('#ffd76a')
        const gate = new THREE.Object3D()
        gate.position.set(0, 12, 0)
        p.add(gate)

        const pillar = new THREE.BoxGeometry(1.1, 1.1, 7)
        for(const side of [- 1, 1])
        {
            const m = new THREE.Mesh(pillar, white)
            m.position.set(side * 5.6, 0, 3.5)
            gate.add(m)
            const band = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.7), pink)
            band.position.set(side * 5.6, 0, 1.2)
            gate.add(band)
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), gold)
            cap.position.set(side * 5.6, 0, 7.5)
            gate.add(cap)
        }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(12.8, 1.2, 1.2), pink)
        beam.position.set(0, 0, 7.1)
        gate.add(beam)
        p.solid({ x: 0, y: 12, colliders: [
            { type: 'cube', x: - 5.6, sx: 1.4, sy: 1.4, sz: 7, z: 3.5 },
            { type: 'cube', x: 5.6, sx: 1.4, sy: 1.4, sz: 7, z: 3.5 }
        ] })

        // Name sign — faces Bruno's default camera
        const sign = new THREE.Object3D()
        sign.rotation.z = CAMERA_FACING
        sign.position.set(0, 0, 10.2)
        gate.add(sign)
        const name = p.textPlane([this.bd.recipient], 11, 3.4, { color: '#fff7e6', stroke: '#c9577c', font: '700 230px "Comic Neue", "Trebuchet MS", sans-serif' })
        name.rotation.x = Math.PI * 0.5
        sign.add(name)
        const welcome = p.textPlane([this.bd.welcome], 11, 1.2, { color: '#ffffff', stroke: '#c9577c', font: '700 100px "Comic Neue", "Trebuchet MS", sans-serif' })
        welcome.rotation.x = Math.PI * 0.5
        welcome.position.z = - 2.2
        sign.add(welcome)

        // Welcome text on the road + sender
        const floorText = p.textPlane(['WELCOME', this.bd.sender], 7, 3, { color: '#ffffff', stroke: '#c9577c', font: '700 150px "Comic Neue", "Trebuchet MS", sans-serif' })
        floorText.rotation.z = CAMERA_FACING
        floorText.position.set(0, 4, 0.05)
        p.add(floorText)

        // Balloon clusters at the pillars
        const balloonGeo = new THREE.SphereGeometry(0.62, 12, 9)
        balloonGeo.scale(1, 1, 1.15)
        const colors = ['#f2a6ba', '#ffd76a', '#ffffff', '#9fd8ff', '#c9a6ff']
        for(let i = 0; i < 10; i++)
        {
            const side = i % 2 ? 1 : - 1
            const b = new THREE.Mesh(balloonGeo, p.tint(colors[i % colors.length]))
            b.position.set(side * (6.6 + (i % 3) * 0.7), (i % 2) * 0.6 - 0.3, 5.2 + (i % 4) * 0.8)
            gate.add(b)
        }
        this.gate = gate
    }

    setStations()
    {
        const used = { childhood: 0, friends: 0, landmarks: 0 }
        for(const data of this.bd.stations)
        {
            const slots = SLOTS[data.zone]
            const slot = slots[used[data.zone]++]
            if(!slot)
            {
                const message = `station "${data.id}" skipped: zone "${data.zone}" has only ${slots.length} slots`
                console.warn('[birthday]', message)
                this.warnings.push(message)
                continue
            }
            const { a, dir } = this.segment(slot.seg)
            // frame side: the left-hand normal of the travel direction faces away from the default camera for B, handle per segment
            const normal = slot.seg === 1 ? new THREE.Vector2(0, 1) : new THREE.Vector2(- 1, 0) // towards the frame
            const zig = (used[data.zone] % 2 ? 1 : - 1) * 1.1
            const roadPoint = a.clone().addScaledVector(dir, slot.d)
            const position = roadPoint.clone().addScaledVector(normal, slot.offset).addScaledVector(dir, zig)
            const facing = normal.clone().negate()

            this.stations.push(new MemoryStation({
                data,
                props: this.props,
                areas: this.areas,
                viewer: this.viewer,
                position,
                facing
            }))
        }
        this.stationTick = 0
        this.time.on('tick', () => this.updateStations())
    }

    /** Lazy photo loading: load near, free far. */
    updateStations()
    {
        if(++this.stationTick % 20) { return }
        const p = this.car.position
        for(const station of this.stations)
        {
            const d = Math.hypot(station.position.x - p.x, station.position.y - p.y)
            if(d < 38) { if(station.status === 'idle') { station.ensureLoaded() } }
            else if(d > 70 && !this.viewer.isOpen) { station.unload() }
        }
    }

    /** Phase 1 world expansion: Glade Spur (disable with ?slice=off to compare with v1 scenery). */
    setStorybookSlice()
    {
        this.sliceEnabled = new URLSearchParams(window.location.search).get('slice') !== 'off'
        if(!this.sliceEnabled) { return }
        this.slice = new StorybookSlice({
            resources: this.resources,
            props: this.props,
            tiles: this.tiles,
            distanceToRoute: (x, y) => this.distanceToRoute(x, y)
        })
    }

    setScenery()
    {
        const p = this.props
        const rand = this.rand
        const m = new THREE.Matrix4()
        const q = new THREE.Quaternion()
        const e = new THREE.Euler()
        const s = new THREE.Vector3()
        const pos = new THREE.Vector3()
        const compose = (x, y, z, sx, sy, sz, rz = 0) => m.compose(pos.set(x, y, z), q.setFromEuler(e.set(0, 0, rz)), s.set(sx, sy, sz)).clone()

        const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1, 7).rotateX(Math.PI * 0.5).translate(0, 0, 0.5)
        const crownGeo = new THREE.IcosahedronGeometry(1, 1)
        const bushGeo = new THREE.IcosahedronGeometry(1, 1)
        const rockGeo = new THREE.DodecahedronGeometry(1, 0)
        const flowerGeo = new THREE.IcosahedronGeometry(0.2, 0)
        const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 4).rotateX(Math.PI * 0.5).translate(0, 0, 0.5)

        const batches = {
            trunk: [], bush: [], rock: [], stem: [],
            crown: [[], [], [], []],
            flower: [[], [], [], []]
        }
        const crownColors = ['#8bd17c', '#a6e08f', '#6fc16b', '#f7a8c4'] // last = cherry blossom
        const flowerColors = ['#ff8fb1', '#ffd76a', '#ffffff', '#c9a6ff']
        const colliders = []

        const blocked = (x, y, extra = 0) =>
        {
            if(this.sliceEnabled && inSliceClearZone(x, y)) { return true }
            if(this.distanceToRoute(x, y) < 8.5 + extra) { return true }
            if(Math.hypot(x - PLAZA.x, y - PLAZA.y) < 14.5) { return true }
            if(Math.abs(x) < 9 && y < 20) { return true } // start + gate surroundings
            for(const st of this.stations) { if(Math.hypot(x - st.position.x, y - st.position.y) < 7.5) { return true } }
            return false
        }

        const addTree = (x, y, scale, variety) =>
        {
            const h = 1.6 * scale
            batches.trunk.push({ geometry: trunkGeo, matrix: compose(x, y, 0, scale, scale, h) })
            batches.crown[variety].push({ geometry: crownGeo, matrix: compose(x, y, h + 0.9 * scale, 1.5 * scale, 1.5 * scale, 1.3 * scale, rand() * 6) })
            batches.crown[variety].push({ geometry: crownGeo, matrix: compose(x + (rand() - 0.5) * scale, y + (rand() - 0.5) * scale, h + 2.0 * scale, 1.05 * scale, 1.05 * scale, 0.95 * scale, rand() * 6) })
            if(this.distanceToRoute(x, y) < 15) { colliders.push({ type: 'cube', x, y, z: 1.5, sx: 0.8 * scale, sy: 0.8 * scale, sz: 3 }) }
        }

        // Trees along every segment (both sides) — different density/species per region
        for(let i = 0; i < this.route.length - 1; i++)
        {
            const { a, dir, length } = this.segment(i)
            const normal = new THREE.Vector2(- dir.y, dir.x)
            const density = i === 0 ? 0.55 : i === 1 ? 0.3 : i === 2 ? 0.35 : 0.3
            const count = Math.round(length * density)
            for(let k = 0; k < count; k++)
            {
                const t = rand() * length
                const side = rand() < 0.5 ? - 1 : 1
                const off = 9.5 + rand() * 15
                const x = a.x + dir.x * t + normal.x * off * side
                const y = a.y + dir.y * t + normal.y * off * side
                if(blocked(x, y)) { continue }
                const variety = i === 0 ? Math.floor(rand() * 4) : (rand() < 0.15 ? 3 : Math.floor(rand() * 3))
                addTree(x, y, 0.85 + rand() * 0.7, variety)
            }
        }
        // Outer ring of trees around the plaza
        for(let k = 0; k < 26; k++)
        {
            const ang = (k / 26) * Math.PI * 2 + rand() * 0.2
            const r = 17 + rand() * 7
            const x = PLAZA.x + Math.cos(ang) * r
            const y = PLAZA.y + Math.sin(ang) * r
            if(Math.cos(ang) < - 0.55 || this.distanceToRoute(x, y) < 8) { continue }
            addTree(x, y, 0.9 + rand() * 0.6, rand() < 0.4 ? 3 : Math.floor(rand() * 3))
        }

        // Bushes, rocks, flowers close to the road (instanced-style merged batches)
        for(let i = 0; i < this.route.length - 1; i++)
        {
            const { a, dir, length } = this.segment(i)
            const normal = new THREE.Vector2(- dir.y, dir.x)
            const n = Math.round(length * 1.1)
            for(let k = 0; k < n; k++)
            {
                const t = rand() * length
                const side = rand() < 0.5 ? - 1 : 1
                const off = 4.4 + rand() * 5.5
                const x = a.x + dir.x * t + normal.x * off * side
                const y = a.y + dir.y * t + normal.y * off * side
                if(this.sliceEnabled && inSliceClearZone(x, y)) { continue }
                if(this.distanceToRoute(x, y) < 4.2 || Math.hypot(x - PLAZA.x, y - PLAZA.y) < 12.5) { continue }
                if(this.stations.some((st) => Math.hypot(x - st.position.x, y - st.position.y) < 5.4)) { continue }
                if(Math.abs(x) < 8 && y < 20) { continue }
                const r = rand()
                if(r < 0.22) { const sc = 0.6 + rand() * 0.6; batches.bush.push({ geometry: bushGeo, matrix: compose(x, y, 0.2, sc * 1.2, sc * 1.2, sc * 0.8, rand() * 6) }) }
                else if(r < 0.3 && i === 2) { const sc = 0.5 + rand() * 0.9; batches.rock.push({ geometry: rockGeo, matrix: compose(x, y, 0.1, sc, sc * 0.8, sc * 0.6, rand() * 6) }) }
                else
                {
                    const v = Math.floor(rand() * 4)
                    const stemH = 0.5 + rand() * 0.4
                    for(let f = 0; f < 3; f++)
                    {
                        const fx = x + (rand() - 0.5) * 0.9
                        const fy = y + (rand() - 0.5) * 0.9
                        batches.stem.push({ geometry: stemGeo, matrix: compose(fx, fy, 0, 1, 1, stemH) })
                        batches.flower[v].push({ geometry: flowerGeo, matrix: compose(fx, fy, stemH + 0.05, 1.3, 1.3, 1) })
                    }
                }
            }
        }

        p.merge(batches.trunk, p.tint('#a8754a', 'brown'))
        batches.crown.forEach((list, i) => p.merge(list, p.tint(crownColors[i], 'green')))
        p.merge(batches.bush, p.tint('#7ec97a', 'green'))
        p.merge(batches.rock, p.tint('#d9d2d8', 'gray'))
        p.merge(batches.stem, p.tint('#6fb869', 'green'))
        batches.flower.forEach((list, i) => p.merge(list, p.tint(flowerColors[i])))

        if(colliders.length) { p.solid({ x: 0, y: 0, colliders }) }
        this.sceneryStats = {
            trees: batches.trunk.length,
            bushes: batches.bush.length,
            rocks: batches.rock.length,
            flowers: batches.flower.reduce((n, l) => n + l.length, 0),
            colliders: colliders.length
        }
    }

    setRegionSigns()
    {
        const p = this.props
        const white = p.tint('#ffffff')
        const labels = [
            { at: [- 7.5, - 17], text: ['01', 'ARRIVAL GATE'], color: '#c9577c' },
            { at: [9, 24], text: ['02', 'CHILDHOOD GARDEN'], color: '#4a9b52' },
            { at: [- 8, 46], text: ['03', 'FRIENDSHIP AVENUE'], color: '#c9577c' },
            { at: [- 37, 66], text: ['04', 'MEMORY LANDMARKS'], color: '#c98a1a' },
            { at: [- 24, 94], text: ['05', 'CELEBRATION'], color: '#c9577c' }
        ]
        // Arrival label sits beside the gate, so skip duplicates close to the gate sign
        labels.splice(0, 1)
        for(const label of labels)
        {
            const group = new THREE.Object3D()
            group.position.set(label.at[0], label.at[1], 0)
            group.rotation.z = CAMERA_FACING
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 8).rotateX(Math.PI * 0.5), white)
            post.position.z = 1.2
            group.add(post)
            const board = p.textPlane(label.text, 5.4, 2.2, { color: '#ffffff', stroke: label.color, font: '700 120px "Comic Neue", "Trebuchet MS", sans-serif' })
            board.rotation.x = Math.PI * 0.5
            board.position.z = 3.3
            group.add(board)
            p.add(group)
        }
    }

    setFinale()
    {
        this.finale = new Finale({
            props: this.props,
            areas: this.areas,
            camera: this.camera,
            controls: this.controls,
            passes: this.passes,
            time: this.time,
            viewer: this.viewer,
            sizes: this.sizes,
            config: this.bd,
            center: PLAZA
        })

        this.finale.on('burst', () => this.cues.fanfare())
        this.finale.on('puff', (i) => this.cues.puff(i))

        // Bruno's own cone model, reused as pushable party hats around the plaza
        const cone = this.resources.items.coneBase
        if(cone)
        {
            for(let i = 0; i < 6; i++)
            {
                const a = - Math.PI * 0.35 + i * 0.45
                this.objects.add({
                    base: this.resources.items.coneBase.scene,
                    collision: this.resources.items.coneCollision.scene,
                    offset: new THREE.Vector3(PLAZA.x + Math.cos(a) * 12.5, PLAZA.y + Math.sin(a) * 12.5, 0.2),
                    rotation: new THREE.Euler(0, 0, 0),
                    duplicated: true,
                    shadow: { sizeX: 1.2, sizeY: 1.2, offsetZ: - 0.15, alpha: 0.35 },
                    mass: 0.6,
                    sleep: true
                })
            }
        }
    }

    setTour()
    {
        // Build the autopilot route: sampled waypoints + a stop at every memory + the cake
        const waypoints = []
        for(let i = 0; i < this.route.length - 1; i++)
        {
            const { a, dir, length } = this.segment(i)
            const stops = this.stations
                .filter((st) => SEGMENTS[i] && st.data.zone === SEGMENTS[i].zone)
                .map((st) => ({ st, s: (st.areaPosition.x - a.x) * dir.x + (st.areaPosition.y - a.y) * dir.y }))
                .sort((x, y) => x.s - y.s)
            let cursor = i === 0 ? 4 : 5
            let stopIndex = 0
            while(cursor < length)
            {
                if(stopIndex < stops.length && stops[stopIndex].s <= cursor)
                {
                    const st = stops[stopIndex++].st
                    waypoints.push({ x: st.areaPosition.x, y: st.areaPosition.y, station: st })
                    continue
                }
                waypoints.push({ x: a.x + dir.x * cursor, y: a.y + dir.y * cursor })
                cursor += 9
            }
            while(stopIndex < stops.length) { const st = stops[stopIndex++].st; waypoints.push({ x: st.areaPosition.x, y: st.areaPosition.y, station: st }) }
            // Corner point
            const last = this.route[i + 1]
            if(i < this.route.length - 2) { waypoints.push({ x: last.x, y: last.y }) }
        }
        waypoints.push({ x: PLAZA.x - 9.2, y: PLAZA.y, finale: true })

        this.tour = new Tour({
            controls: this.controls,
            physics: this.physics,
            viewer: this.viewer,
            finale: this.finale,
            time: this.time,
            route: waypoints
        })
        this.tour.on('start', () => this.updateTourButton())
        this.tour.on('stop', () => this.updateTourButton())
    }

    setTouch()
    {
        this.joystick = new Joystick({ controls: this.controls })
        const coarse = window.matchMedia('(pointer: coarse)').matches
        const enable = () =>
        {
            this.config.touch = true
            document.body.classList.add('bd-touch')
            if(!this.controls.touch) { this.controls.setTouch() }
            this.joystick.attach()
            this.updateHudCopy()
        }
        // Wrap the original lazy setTouch (called by Application on the first touchstart)
        const original = this.controls.setTouch.bind(this.controls)
        let created = false
        this.controls.setTouch = () =>
        {
            if(!created) { created = true; original() }
            document.body.classList.add('bd-touch')
            this.joystick.attach()
        }
        if(coarse) { enable() }
    }

    /* ---------- HUD ---------- */

    setHud()
    {
        const total = this.stations.length
        this.$hud = document.createElement('div')
        this.$hud.className = 'bd-hud'
        this.$hud.innerHTML = `
            <div class="bd-chip bd-progress" aria-live="polite"><span class="bd-heart">&#9825;</span> <span class="bd-progress-count">0 / ${total}</span> memories</div>
            <div class="bd-hud-buttons">
                <button type="button" class="bd-hud-btn bd-tour" aria-pressed="false" title="Guided tour (T)">&#9654; Tour</button>
                <button type="button" class="bd-hud-btn bd-sound-btn" aria-pressed="false" title="Sound on/off (M)">&#9835; Sound</button>
                <button type="button" class="bd-hud-btn bd-reset-btn" title="Reset car (R)">&#8635; Reset</button>
            </div>`
        document.body.appendChild(this.$hud)
        this.$progress = this.$hud.querySelector('.bd-progress-count')
        this.$tourButton = this.$hud.querySelector('.bd-tour')
        this.$tourButton.addEventListener('click', () => this.toggleTour())
        this.$sound = this.$hud.querySelector('.bd-sound-btn')
        const syncSound = () =>
        {
            const muted = !!(this.sounds && this.sounds.muted)
            this.$sound.setAttribute('aria-pressed', String(muted))
            this.$sound.innerHTML = muted ? '&#9835; Muted' : '&#9835; Sound'
        }
        this.$sound.addEventListener('click', () =>
        {
            if(!this.sounds) { return }
            this.sounds.muted = !this.sounds.muted
            Howler.mute(this.sounds.muted)
            syncSound()
        })
        window.addEventListener('keydown', (e) => { if(e.key === 'm') { window.setTimeout(syncSound, 0) } })
        // Bruno's native touch buttons (inline-styled, no class) must not sit behind the memory sheet
        this.hideNativeTouch = new MutationObserver(() =>
        {
            const t = this.controls.touch
            if(!t) { return }
            const open = document.body.classList.contains('bd-memory-open')
            for(const key of ['boost', 'forward', 'brake', 'backward']) { if(t[key] && t[key].$element) { t[key].$element.style.visibility = open ? 'hidden' : '' } }
        })
        this.hideNativeTouch.observe(document.body, { attributes: true, attributeFilter: ['class'] })
        this.$hud.querySelector('.bd-reset-btn').addEventListener('click', () => this.controls.trigger('action', ['reset']))
        for(const ev of ['touchstart', 'mousedown']) { this.$hud.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }) }

        this.$hint = document.createElement('div')
        this.$hint.className = 'bd-hint'
        document.body.appendChild(this.$hint)
        this.updateHudCopy()

        this.$welcome = document.createElement('div')
        this.$welcome.className = 'bd-welcome'
        this.$welcome.innerHTML = `<h1></h1><p></p>`
        this.$welcome.querySelector('h1').textContent = this.bd.welcome
        this.$welcome.querySelector('p').textContent = `${this.bd.sender} · Drive to explore ${this.bd.recipient}'s memories`
        document.body.appendChild(this.$welcome)
        gsap.fromTo(this.$welcome, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.8 })
        gsap.to(this.$welcome, { opacity: 0, duration: 1, delay: 6.5, onComplete: () => this.$welcome.remove() })
        gsap.to(this.$hint, { opacity: 0, duration: 1.2, delay: 14 })

        window.addEventListener('keydown', (event) =>
        {
            if(event.code === 'KeyT' && !this.viewer.isOpen) { this.toggleTour() }
        })

        if(this.warnings.length) { console.warn('[birthday] warnings:', this.warnings) }
    }

    updateHudCopy()
    {
        if(!this.$hint) { return }
        this.$hint.textContent = this.config.touch
            ? 'Use the joystick to steer · hold the arrows to drive · tap a prompt to open a memory'
            : 'WASD / arrows drive · Space brakes · Enter opens a memory · T guided tour · R reset'
    }

    updateProgress()
    {
        this.$progress.textContent = `${this.seen.size} / ${this.stations.length}`
    }

    toggleTour()
    {
        if(this.tour.active) { this.tour.stop() } else { this.tour.start() }
    }

    updateTourButton()
    {
        const on = this.tour.active
        this.$tourButton.setAttribute('aria-pressed', String(on))
        this.$tourButton.innerHTML = on ? '&#9632; Stop tour' : '&#9654; Tour'
        this.$hud.classList.toggle('is-touring', on)
    }
}
