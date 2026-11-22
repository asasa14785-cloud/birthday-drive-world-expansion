import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Shared helpers for every Birthday Drive module.
 *  - tinted matcap materials derived from Bruno's own MatcapMaterial (the
 *    scene has no lights, so everything keeps the original look and takes part
 *    in the START reveal animation);
 *  - static collision through Bruno's own Physics.addObjectFromThree;
 *  - merged scenery batches (the matcap vertex shader has no instancing
 *    support, so repeated props are baked into one geometry per material —
 *    same draw-call win as instancing, zero engine changes);
 *  - canvas text textures for signs.
 */
export const CAMERA_FACING = Math.atan2(1.135, 1.45) // Z rotation that makes a sign face Bruno's default camera

export default class Props
{
    constructor(_options)
    {
        this.materials = _options.materials
        this.physics = _options.physics
        this.container = _options.container
        this.tints = new Map()
        this.textures = []
        this.geometries = []
    }

    tint(hex, base = 'white')
    {
        const key = `${base}|${hex}`
        if(this.tints.has(key)) { return this.tints.get(key) }

        const source = this.materials.shades.items[base]
        const material = source.clone()
        // clone() duplicates the matcap texture upload: share the original instead
        if(material.uniforms.matcap.value !== source.uniforms.matcap.value)
        {
            material.uniforms.matcap.value.dispose()
            material.uniforms.matcap.value = source.uniforms.matcap.value
        }
        material.uniforms.diffuse.value = new THREE.Color(hex)
        material.name = `shadeTint${hex}`
        // Register so World's reveal tick animates uRevealProgress on it too
        this.materials.shades.items[`tint_${key}`] = material
        this.tints.set(key, material)
        return material
    }

    /** Static solid with box/cylinder colliders. Positions are local to (x, y, 0) rotated by `rotation` around Z. */
    solid({ x, y, rotation = 0, colliders = [] })
    {
        const meshes = colliders.map((c) =>
        {
            const object = new THREE.Object3D()
            object.name = c.type === 'cylinder' ? 'cylinder' : 'cube'
            object.position.set(c.x || 0, c.y || 0, c.z || 0)
            object.scale.set(c.sx ?? 1, c.sy ?? 1, c.sz ?? 1)
            return object
        })
        return this.physics.addObjectFromThree({
            meshes,
            offset: new THREE.Vector3(x, y, 0),
            rotation: new THREE.Euler(0, 0, rotation),
            mass: 0,
            sleep: true
        })
    }

    add(object)
    {
        this.container.add(object)
        return object
    }

    mesh(geometry, material, position, rotation, scale)
    {
        const mesh = new THREE.Mesh(geometry, material)
        if(position) { mesh.position.copy(position) }
        if(rotation) { mesh.rotation.copy(rotation) }
        if(scale) { typeof scale === 'number' ? mesh.scale.setScalar(scale) : mesh.scale.copy(scale) }
        return mesh
    }

    /** Merge a list of { geometry, matrix } into one static Mesh. Source geometries are disposed. */
    merge(parts, material)
    {
        if(!parts.length) { return null }
        const baked = parts.map(({ geometry, matrix }) =>
        {
            const g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
            g.applyMatrix4(matrix)
            for(const name of Object.keys(g.attributes)) { if(!['position', 'normal'].includes(name)) { g.deleteAttribute(name) } }
            return g
        })
        const merged = BufferGeometryUtils.mergeGeometries(baked, false)
        baked.forEach((g) => g.dispose())
        merged.computeBoundingSphere()
        this.geometries.push(merged)
        const mesh = new THREE.Mesh(merged, material)
        mesh.matrixAutoUpdate = false
        this.container.add(mesh)
        return mesh
    }

    textTexture(lines, { width = 1024, height = 256, font = '700 120px "Comic Neue", "Trebuchet MS", sans-serif', color = '#ffffff', stroke = null, bg = null } = {})
    {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if(bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height) }
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const list = Array.isArray(lines) ? lines : [lines]
        let size = parseInt(font.match(/(\d+)px/)[1], 10)
        const fontFor = (px) => font.replace(/\d+px/, `${px}px`)
        // shrink to fit the widest line
        ctx.font = fontFor(size)
        const widest = Math.max(...list.map((l) => ctx.measureText(l).width))
        if(widest > width * 0.92) { size = Math.floor(size * (width * 0.92) / widest) }
        ctx.font = fontFor(size)
        const lineHeight = size * 1.12
        const top = height / 2 - (lineHeight * (list.length - 1)) / 2
        list.forEach((line, i) =>
        {
            const y = top + i * lineHeight
            if(stroke) { ctx.lineWidth = size * 0.1; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(line, width / 2, y) }
            ctx.fillStyle = color
            ctx.fillText(line, width / 2, y)
        })
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 4
        this.textures.push(texture)
        return texture
    }

    textPlane(lines, planeWidth, planeHeight, textOptions = {})
    {
        const aspect = planeWidth / planeHeight
        const texture = this.textTexture(lines, { width: 1024, height: Math.round(1024 / aspect), ...textOptions })
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
        this.geometries.push(geometry)
        return new THREE.Mesh(geometry, material)
    }

    dispose()
    {
        this.textures.forEach((t) => t.dispose())
        this.geometries.forEach((g) => g.dispose())
        this.tints.forEach((m) => m.dispose())
    }
}
