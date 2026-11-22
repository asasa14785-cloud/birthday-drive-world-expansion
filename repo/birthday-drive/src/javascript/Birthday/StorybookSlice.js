import * as THREE from 'three'

/**
 * StorybookSlice — Phase 1 integration slice of the Wonderland world expansion.
 *
 * "Glade Spur": a driveable road branching east off the Childhood Garden segment of the original route
 * (built with Bruno's own Tiles + Cannon colliders) that ends in a glade with a giant twisted landmark tree
 * and a cottage.  Scenery = Quaternius Stylized Nature MegaKit (dominant family) + one 3dassets.dev
 * Meadow Courier cottage, loaded from ONE merged GLB (models/storybook/storybook-kit.glb).
 *
 * Rendering notes (see research/world-expansion/BASELINE.md):
 *  - the original scene is unlit (matcap), so the kit's PBR materials are converted to MeshLambertMaterial and the
 *    slice adds its own hemisphere + sun light inside its container (matcap / shader materials ignore lights);
 *  - the matcap vertex shader has no instancing support, the kit uses standard materials → InstancedMesh;
 *  - glTF is Y-up, the game is Z-up: every instance is rotated +90° about X.
 *  - physics stays on Bruno's flat floor plane: the driveable corridor is deliberately flat (z = 0).
 */

// Slice layout in world XY (Z up). The spur leaves the original route at (0, 38).
export const SLICE = {
    spurStart: new THREE.Vector2(0, 38),
    spurEnd: new THREE.Vector2(46, 38),
    treePos: new THREE.Vector2(60, 47),
    cottagePos: new THREE.Vector2(47, 46),
    // Rectangle where the procedural v1 scenery must stay out (x0, y0, x1, y1)
    clear: [5, 24, 78, 62]
}

export const inSliceClearZone = (x, y) => x > SLICE.clear[0] && x < SLICE.clear[2] && y > SLICE.clear[1] && y < SLICE.clear[3]

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

export default class StorybookSlice
{
    constructor(_options)
    {
        this.resources = _options.resources
        this.props = _options.props
        this.tiles = _options.tiles
        this.distanceToRoute = _options.distanceToRoute
        this.container = new THREE.Object3D()
        this.props.add(this.container)

        const tier = (window.quality && window.quality.tier) || 'high'
        this.density = { high: 1, mid: 0.7, low: 0.45 }[tier] || 1
        this.rand = rng(77031)
        this.stats = { instances: 0, drawCalls: 0, triangles: 0, colliders: 0 }

        const kit = this.resources.items.storybookKit
        if(!kit)
        {
            console.warn('[storybook] storybookKit resource missing — slice skipped')
            return
        }

        this.setModels(kit.scene)
        this.setLights()
        this.setRoad()
        this.setLandmark()
        this.setScatter()
        this.flush()
        window.storybookSlice = this
    }

    /* ---------- kit ---------- */

    setModels(_scene)
    {
        const toLambert = new Map()
        const convert = (m) =>
        {
            if(toLambert.has(m)) { return toLambert.get(m) }
            const l = new THREE.MeshLambertMaterial({
                map: m.map || null,
                color: m.color ? m.color.clone() : new THREE.Color('#ffffff'),
                alphaTest: m.alphaTest || 0,
                side: m.side,
                transparent: false,
                vertexColors: !!m.vertexColors,
                // fake ambient: lifts the shadow side so the unlit-matcap world never gets muddy
                emissive: new THREE.Color('#ffffff'),
                emissiveMap: m.map || null,
                emissiveIntensity: m.map ? 0.38 : 0.0
            })
            l.name = m.name
            // Quaternius leaf "_C" maps are dark/red colour-variation maps: keep their alpha + detail, recolour to storybook green
            if(/^Leaf|^Leaves$|Leaves_/.test(m.name || ''))
            {
                l.emissiveMap = null
                l.emissive = new THREE.Color('#3f7a3a')
                l.emissiveIntensity = 0.45
                const pine = /Pine/.test(m.name)
                const tint = pine ? 'vec3(0.34, 0.66, 0.46)' : /Twisted/.test(m.name) ? 'vec3(0.62, 0.80, 0.42)' : 'vec3(0.46, 0.82, 0.38)'
                l.onBeforeCompile = (shader) =>
                {
                    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
                        `#include <map_fragment>
                        float bdLuma = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
                        diffuseColor.rgb = ${tint} * (0.7 + 1.6 * bdLuma);`)
                }
                l.customProgramCacheKey = () => `bdleaf${tint}`
            }
            toLambert.set(m, l)
            return l
        }

        // model name -> [{ geometry, material, rel }]  (rel = mesh matrix relative to the model node)
        this.models = {}
        _scene.updateMatrixWorld(true)
        for(const node of _scene.children)
        {
            const inv = node.matrixWorld.clone().invert()
            const parts = []
            node.traverse((o) =>
            {
                if(o.isMesh) { parts.push({ geometry: o.geometry, material: convert(o.material), rel: inv.clone().multiply(o.matrixWorld) }) }
            })
            this.models[node.name] = parts
        }
        this.materials = [...toLambert.values()]

        // placements: model name -> matrices[]
        this.placements = {}
    }

    setLights()
    {
        const hemi = new THREE.HemisphereLight('#fff1f6', '#b9e0a8', 3.4)
        hemi.position.set(0, 0, 50)
        hemi.up.set(0, 0, 1)
        this.container.add(hemi)
        const sun = new THREE.DirectionalLight('#fff0d0', 2.8)
        sun.position.set(- 30, - 40, 60)
        this.container.add(sun)
        this.container.add(sun.target)
        this.lights = [hemi, sun]
    }

    /** Queue an instance of a kit model. Returns the placement matrix. */
    place(_name, x, y, scale = 1, rotZ = 0, z = 0)
    {
        if(!this.models[_name]) { return null }
        const m = new THREE.Matrix4().compose(
            new THREE.Vector3(x, y, z),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0)).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotZ)),
            new THREE.Vector3(scale, scale, scale)
        )
        ;(this.placements[_name] = this.placements[_name] || []).push(m)
        return m
    }

    /* ---------- road ---------- */

    setRoad()
    {
        // Bruno's own stepping-stone tiles → same look, same colliders, connected to the original route
        const delta = SLICE.spurEnd.clone().sub(SLICE.spurStart)
        this.tiles.add({ start: SLICE.spurStart.clone(), delta })
        // small round landing at the end of the spur (turn-around)
        this.tiles.add({ start: new THREE.Vector2(SLICE.spurEnd.x, SLICE.spurEnd.y), delta: new THREE.Vector2(0, 9) })
        this.road = [SLICE.spurStart, SLICE.spurEnd, new THREE.Vector2(SLICE.spurEnd.x, SLICE.spurEnd.y + 9)]
    }

    distanceToSpur(x, y)
    {
        let best = Infinity
        for(let i = 0; i < this.road.length - 1; i++)
        {
            const a = this.road[i]
            const b = this.road[i + 1]
            const d = b.clone().sub(a)
            const len = d.length()
            d.normalize()
            const t = THREE.MathUtils.clamp((x - a.x) * d.x + (y - a.y) * d.y, 0, len)
            best = Math.min(best, Math.hypot(x - (a.x + d.x * t), y - (a.y + d.y * t)))
        }
        return best
    }

    /* ---------- landmark ---------- */

    setLandmark()
    {
        const colliders = []
        // Giant twisted tree (distant landmark, ~36 m tall)
        this.place('TwistedTree_1', SLICE.treePos.x, SLICE.treePos.y, 2.2, 0.6)
        colliders.push({ type: 'cube', x: SLICE.treePos.x, y: SLICE.treePos.y, z: 4, sx: 5, sy: 5, sz: 8 })
        // Cottage (Meadow Courier), front faces the spur (-y)
        this.place('MC_GardenCottage', SLICE.cottagePos.x, SLICE.cottagePos.y, 2.6, 0)
        colliders.push({ type: 'cube', x: SLICE.cottagePos.x, y: SLICE.cottagePos.y, z: 3.5, sx: 6.6, sy: 6.8, sz: 7 })
        // Route sign at the fork
        this.place('MC_RouteSign', 4.2, 41.6, 2.2, - Math.PI * 0.25)
        this.landmarkColliders = colliders
    }

    /* ---------- vegetation ---------- */

    setScatter()
    {
        const r = this.rand
        const colliders = this.landmarkColliders
        const pick = (arr) => arr[Math.floor(r() * arr.length)]
        const [x0, y0, x1, y1] = SLICE.clear

        const free = (x, y, margin = 0) =>
            this.distanceToSpur(x, y) > 6.5 + margin &&
            this.distanceToRoute(x, y) > 6.5 + margin &&
            Math.hypot(x - SLICE.cottagePos.x, y - SLICE.cottagePos.y) > 6 + margin &&
            Math.hypot(x - SLICE.treePos.x, y - SLICE.treePos.y) > 6 + margin

        // Trees: canopy flanking the spur and the east side of the main road
        const trees = ['CommonTree_1', 'CommonTree_2', 'CommonTree_4', 'Pine_1', 'Pine_3']
        const treeCount = Math.round(16 * this.density)
        let placed = 0
        let guard = 0
        while(placed < treeCount && guard++ < 800)
        {
            const x = x0 + r() * (x1 - x0)
            const y = y0 + r() * (y1 - y0)
            if(!free(x, y, 2.5)) { continue }
            const s = 0.85 + r() * 0.55
            this.place(pick(trees), x, y, s, r() * 6.28)
            if(this.distanceToSpur(x, y) < 16 || this.distanceToRoute(x, y) < 16) { colliders.push({ type: 'cube', x, y, z: 2, sx: 0.9 * s, sy: 0.9 * s, sz: 4 }) }
            placed++
        }

        // Understory scattered close to the road
        const small = [
            ['Bush_Common', 0.32], ['Bush_Common_Flowers', 0.12], ['Flower_3_Group', 0.24], ['Flower_4_Group', 0.1],
            ['Grass_Common_Tall', 0.1], ['Grass_Wispy_Short', 0.06], ['Fern_1', 0.06], ['Mushroom_Common', 0.04],
            ['Mushroom_Laetiporus', 0.005]
        ]
        const total = small.reduce((n, s) => n + s[1], 0)
        const smallCount = Math.round(120 * this.density)
        placed = 0
        guard = 0
        while(placed < smallCount && guard++ < 2500)
        {
            const x = x0 - 4 + r() * (x1 - x0 + 4)
            const y = y0 + r() * (y1 - y0)
            const d = Math.min(this.distanceToSpur(x, y), this.distanceToRoute(x, y))
            if(d < 3.6 || d > 20) { continue }
            if(Math.hypot(x - SLICE.cottagePos.x, y - SLICE.cottagePos.y) < 5) { continue }
            let t = r() * total
            let name = small[0][0]
            for(const [n, w] of small) { if(t < w) { name = n; break } t -= w }
            this.place(name, x, y, 0.9 + r() * 0.9, r() * 6.28)
            placed++
        }

        // Rocks / pebbles
        for(let k = 0; k < Math.round(16 * this.density); k++)
        {
            const x = x0 + r() * (x1 - x0)
            const y = y0 + r() * (y1 - y0)
            if(!free(x, y, 0)) { continue }
            const s = 0.7 + r() * 0.9
            this.place(r() < 0.5 ? 'Rock_Medium_1' : 'Rock_Medium_2', x, y, s, r() * 6.28)
            if(this.distanceToSpur(x, y) < 14) { colliders.push({ type: 'cube', x, y, z: 0.9 * s, sx: 2.2 * s, sy: 2.2 * s, sz: 1.8 * s }) }
        }
    }

    /* ---------- build ---------- */

    flush()
    {
        const tmp = new THREE.Matrix4()
        const byMesh = new Map()
        for(const [name, matrices] of Object.entries(this.placements))
        {
            for(const part of this.models[name])
            {
                const key = `${part.geometry.uuid}|${part.material.uuid}`
                if(!byMesh.has(key)) { byMesh.set(key, { part, list: [] }) }
                const entry = byMesh.get(key)
                for(const m of matrices) { entry.list.push(tmp.multiplyMatrices(m, part.rel).clone()) }
            }
        }
        this.meshes = []
        for(const { part, list } of byMesh.values())
        {
            const inst = new THREE.InstancedMesh(part.geometry, part.material, list.length)
            list.forEach((m, i) => inst.setMatrixAt(i, m))
            inst.instanceMatrix.needsUpdate = true
            inst.computeBoundingSphere()
            inst.matrixAutoUpdate = false
            inst.updateMatrix()
            this.container.add(inst)
            this.meshes.push(inst)
            this.stats.instances += list.length
            this.stats.drawCalls++
            this.stats.triangles += list.length * ((part.geometry.index ? part.geometry.index.count : part.geometry.attributes.position.count) / 3)
        }
        if(this.landmarkColliders.length)
        {
            this.props.solid({ x: 0, y: 0, colliders: this.landmarkColliders })
            this.stats.colliders = this.landmarkColliders.length
        }
        console.info('[storybook] slice ready', this.stats)
    }

    dispose()
    {
        this.meshes.forEach((m) => m.dispose())
        this.materials.forEach((m) => m.dispose())
        this.container.removeFromParent()
    }
}
