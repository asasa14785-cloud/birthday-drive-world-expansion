import * as THREE from 'three'

/**
 * MemoryStation — reusable photo installation.
 *
 *  physical frame (shared unit geometries, tinted matcap) + REAL photograph as a
 *  THREE.Texture on a plane + trigger Area (Bruno's Area) + optional decoration.
 *
 * Local frame space (Z up): the photo faces local -Y. The group is rotated so
 * that this direction points at the road.
 *
 * Texture lifecycle: loaded lazily when the car gets close (`ensureLoaded`),
 * disposed when the car leaves (`unload`), when the photo is replaced
 * (`setPhoto`) and on `dispose()`. A failed image never breaks the station:
 * it shows a generated "photo unavailable" card.
 */

const unitBox = new THREE.BoxGeometry(1, 1, 1)
const unitPlane = new THREE.PlaneGeometry(1, 1)
const postGeometry = new THREE.CylinderGeometry(0.16, 0.2, 1, 8).rotateX(Math.PI * 0.5)
const ball = new THREE.SphereGeometry(0.32, 10, 8)
const canopy = new THREE.IcosahedronGeometry(1, 1)
const petal = new THREE.SphereGeometry(0.18, 8, 6)
const torus = new THREE.TorusGeometry(2.1, 0.09, 6, 36)
const tri = new THREE.ConeGeometry(0.28, 0.55, 3)

const STYLES = {
    childhood: { frame: '#fff4e0', accent: '#8bd17c', post: '#a8754a', scale: 1 },
    friends: { frame: '#ffffff', accent: '#f2a6ba', post: '#f6d6dc', scale: 1.2 },
    landmarks: { frame: '#fff7e6', accent: '#ffd76a', post: '#ffffff', scale: 1.35 }
}

export default class MemoryStation
{
    constructor(_options)
    {
        this.data = _options.data
        this.props = _options.props
        this.areas = _options.areas
        this.viewer = _options.viewer
        this.position = _options.position.clone() // Vector2
        this.facing = _options.facing.clone().normalize() // Vector2 pointing to the road
        this.style = STYLES[this.data.zone] || STYLES.childhood
        this.scale = this.style.scale

        this.maxWidth = 4.4 * this.scale
        this.maxHeight = 3.3 * this.scale
        this.artZ = 2.9 * this.scale + 0.5
        this.border = 0.26 * this.scale

        this.photoIndex = 0
        this.status = 'idle' // idle | loading | loaded | error
        this.texture = null
        this.fallbackTexture = null
        this.aspect = 4 / 3
        this.loadToken = 0
        this.disposed = false

        this.container = new THREE.Object3D()
        this.container.position.set(this.position.x, this.position.y, 0)
        this.container.rotation.z = Math.atan2(this.facing.x, - this.facing.y)

        this.setFrame()
        this.setDecoration()
        this.setPhysics()
        this.setArea()
        this.fit(this.aspect)
        this.showPlaceholder()

        this.props.add(this.container)
    }

    get photos() { return this.data.photos }
    get current() { return this.data.photos[this.photoIndex] || null }

    get caption()
    {
        const photo = this.current
        return (photo && photo.caption) || this.data.caption || ''
    }

    setFrame()
    {
        const p = this.props
        const frameMat = p.tint(this.style.frame)
        const accentMat = p.tint(this.style.accent)
        const postMat = p.tint(this.style.post, this.data.zone === 'childhood' ? 'brown' : 'white')

        this.art = new THREE.Object3D()
        this.art.position.z = this.artZ
        this.container.add(this.art)

        // Frame body (back slab + 4 bars) — scaled in fit()
        this.back = new THREE.Mesh(unitBox, frameMat)
        this.art.add(this.back)

        this.bars = [0, 1, 2, 3].map(() =>
        {
            const bar = new THREE.Mesh(unitBox, accentMat)
            this.art.add(bar)
            return bar
        })

        // Photograph
        this.photoMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
        this.photoMesh = new THREE.Mesh(unitPlane, this.photoMaterial)
        this.photoMesh.rotation.x = Math.PI * 0.5 // normal -> local -Y
        this.photoMesh.position.y = - 0.16 * this.scale
        this.art.add(this.photoMesh)

        // Two posts
        this.posts = [-1, 1].map((side) =>
        {
            const post = new THREE.Mesh(postGeometry, postMat)
            post.scale.z = this.artZ + 0.8
            post.position.set(side * (this.maxWidth * 0.5 + 0.55), 0.18, (this.artZ + 0.8) * 0.5 - 0.4)
            this.container.add(post)
            return post
        })
    }

    /** Resize frame parts for a photo aspect ratio (no geometry allocation). */
    fit(aspect)
    {
        this.aspect = aspect
        let w = this.maxWidth
        let h = w / aspect
        if(h > this.maxHeight) { h = this.maxHeight; w = h * aspect }
        this.width = w
        this.height = h
        const b = this.border
        const d = 0.34 * this.scale

        this.photoMesh.scale.set(w, h, 1)
        this.back.scale.set(w + b * 2, d, h + b * 2)
        this.back.position.y = 0.1
        const front = - 0.1 * this.scale
        this.bars[0].scale.set(w + b * 2, d * 0.7, b); this.bars[0].position.set(0, front, h / 2 + b / 2)
        this.bars[1].scale.set(w + b * 2, d * 0.7, b); this.bars[1].position.set(0, front, - h / 2 - b / 2)
        this.bars[2].scale.set(b, d * 0.7, h); this.bars[2].position.set(- w / 2 - b / 2, front, 0)
        this.bars[3].scale.set(b, d * 0.7, h); this.bars[3].position.set(w / 2 + b / 2, front, 0)
    }

    setDecoration()
    {
        const p = this.props
        const accent = p.tint(this.style.accent)
        const white = p.tint('#ffffff')
        const gold = p.tint('#ffd76a')

        if(this.data.zone === 'childhood')
        {
            // Posts are tree trunks: foliage crowns + a ring of flowers at the base
            const greens = ['#8bd17c', '#a6e08f', '#6fc16b'].map((c) => p.tint(c, 'green'))
            this.posts.forEach((post, i) =>
            {
                const crown = new THREE.Mesh(canopy, greens[i % 3])
                crown.scale.set(1.5, 1.5, 1.25)
                crown.position.set(post.position.x * 1.25, 0.9, this.artZ + 1.5)
                this.container.add(crown)
            })
            const colors = ['#ff8fb1', '#ffd76a', '#ffffff', '#c9a6ff']
            for(let i = 0; i < 14; i++)
            {
                const a = (i / 14) * Math.PI * 2
                const flower = new THREE.Mesh(petal, p.tint(colors[i % colors.length]))
                flower.position.set(Math.cos(a) * 3.1 * this.scale, 0.8 + Math.sin(a) * 0.9, 0.18)
                flower.scale.setScalar(0.8 + (i % 3) * 0.25)
                this.container.add(flower)
            }
        }
        else if(this.data.zone === 'friends')
        {
            // Gold-topped posts + a bunting garland across the top
            this.posts.forEach((post) =>
            {
                const top = new THREE.Mesh(ball, gold)
                top.position.set(post.position.x, post.position.y, this.artZ + 1.0)
                this.container.add(top)
            })
            const span = this.maxWidth + 1.1
            const colors = ['#f2a6ba', '#ffffff', '#ffd76a', '#9fd8ff']
            const count = 9
            for(let i = 0; i < count; i++)
            {
                const t = i / (count - 1)
                const flag = new THREE.Mesh(tri, p.tint(colors[i % colors.length]))
                flag.rotation.x = Math.PI // point down
                flag.rotation.y = Math.PI * 0.5
                flag.position.set((t - 0.5) * span * 2, -0.35, this.artZ + this.height / 2 + this.border + 0.9 - Math.sin(t * Math.PI) * 0.35)
                this.container.add(flag)
            }
        }
        else
        {
            // Landmark: glowing ring pedestal + arch top + star
            const ring = new THREE.Mesh(torus, new THREE.MeshBasicMaterial({ color: 0xffd76a, toneMapped: false }))
            ring.position.z = 0.1
            this.container.add(ring)
            const beam = new THREE.Mesh(unitBox, white)
            beam.scale.set(this.maxWidth + 1.8, 0.5, 0.45)
            beam.position.set(0, 0.18, this.artZ + this.maxHeight / 2 + 1.1)
            this.container.add(beam)
            const star = new THREE.Mesh(ball, accent)
            star.scale.setScalar(1.4)
            star.position.set(0, 0.18, this.artZ + this.maxHeight / 2 + 1.9)
            this.container.add(star)
        }
    }

    setPhysics()
    {
        const w = this.maxWidth + 2.2
        this.props.solid({
            x: this.position.x,
            y: this.position.y,
            rotation: this.container.rotation.z,
            colliders: [
                { type: 'cube', x: 0, y: 0.2, z: 1.6, sx: w, sy: 0.9, sz: 3.2 }
            ]
        })
    }

    setArea()
    {
        const reach = 5.2 * this.scale
        this.areaPosition = new THREE.Vector2(
            this.position.x + this.facing.x * reach,
            this.position.y + this.facing.y * reach
        )
        this.area = this.areas.add({
            position: this.areaPosition,
            halfExtents: new THREE.Vector2(3.4, 3.4),
            hasKey: true,
            testCar: true,
            active: true
        })
        this.area.on('in', () => this.viewer.setNearby(this))
        this.area.on('out', () => this.viewer.clearNearby(this))
        this.area.on('interact', () => this.viewer.open(this))
    }

    /** World-space composition info for the camera. */
    getFocus()
    {
        return {
            x: this.position.x,
            y: this.position.y,
            z: this.artZ,
            facing: this.facing,
            width: this.width,
            height: this.height
        }
    }

    /* ---------- photo textures ---------- */

    makeCard(title, subtitle)
    {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 384
        const ctx = canvas.getContext('2d')
        const g = ctx.createLinearGradient(0, 0, 512, 384)
        g.addColorStop(0, '#fbd5dc')
        g.addColorStop(1, '#fff1d6')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 512, 384)
        ctx.fillStyle = 'rgba(242,166,186,0.9)'
        ctx.font = '700 120px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('♥', 256, 190)
        ctx.fillStyle = '#7a4a5a'
        ctx.font = '700 34px "Comic Neue", sans-serif'
        ctx.fillText(title, 256, 260)
        ctx.font = '500 22px "Comic Neue", sans-serif'
        ctx.fillText(subtitle, 256, 300)
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        return texture
    }

    showPlaceholder(error = false)
    {
        if(this.fallbackTexture) { this.fallbackTexture.dispose() }
        this.fallbackTexture = error
            ? this.makeCard('Photo unavailable', this.data.title)
            : this.makeCard(this.data.title, 'memory loading…')
        this.photoMaterial.map = this.fallbackTexture
        this.photoMaterial.needsUpdate = true
        this.fit(4 / 3)
    }

    releaseTexture()
    {
        if(this.texture)
        {
            if(this.photoMaterial.map === this.texture) { this.photoMaterial.map = null }
            this.texture.dispose()
            this.texture = null
        }
    }

    /** Resolves when the current photo is displayed (or its fallback is). Never rejects. */
    ensureLoaded(index = this.photoIndex)
    {
        if(this.disposed) { return Promise.resolve() }
        if(index !== this.photoIndex) { this.releaseTexture(); this.photoIndex = index; this.status = 'idle' }
        if(this.status === 'loaded' || this.status === 'error') { return Promise.resolve() }
        if(this.loading) { return this.loading }

        const photo = this.current
        if(!photo)
        {
            this.status = 'error'
            this.showPlaceholder(true)
            return Promise.resolve()
        }

        this.status = 'loading'
        const token = ++this.loadToken
        this.loading = new Promise((resolve) =>
        {
            new THREE.TextureLoader().load(
                photo.src,
                (loadedTexture) =>
                {
                    let texture = loadedTexture
                    this.loading = null
                    if(this.disposed || token !== this.loadToken) { texture.dispose(); resolve(); return }
                    const { width, height } = texture.image
                    // Phase 3: cap GPU texture size by quality tier (high-res phone photos are 4000px+)
                    const tier = window.quality ? window.quality.tier : 'high'
                    const cap = tier === 'low' ? 1024 : tier === 'mid' ? 1536 : 2048
                    if(width > cap || height > cap)
                    {
                        const k = cap / Math.max(width, height)
                        const canvas = document.createElement('canvas')
                        canvas.width = Math.max(1, Math.round(width * k))
                        canvas.height = Math.max(1, Math.round(height * k))
                        const ctx = canvas.getContext('2d')
                        ctx.imageSmoothingQuality = 'high'
                        ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height)
                        texture.dispose()
                        const scaled = new THREE.CanvasTexture(canvas)
                        scaled.userData.sourceSize = [width, height]
                        texture = scaled
                    }
                    texture.colorSpace = THREE.SRGBColorSpace
                    texture.anisotropy = tier === 'low' ? 1 : 4
                    this.texture = texture
                    this.photoMaterial.map = texture
                    this.photoMaterial.needsUpdate = true
                    this.status = 'loaded'
                    this.fit(width && height ? width / height : 4 / 3)
                    if(this.fallbackTexture) { this.fallbackTexture.dispose(); this.fallbackTexture = null }
                    resolve()
                },
                undefined,
                () =>
                {
                    this.loading = null
                    if(this.disposed || token !== this.loadToken) { resolve(); return }
                    console.warn(`[birthday] image failed to load: ${photo.src}`)
                    this.status = 'error'
                    this.showPlaceholder(true)
                    resolve()
                }
            )
        })
        return this.loading
    }

    /** Replace the displayed photo (multi-photo stations). Old texture is disposed first. */
    setPhoto(index)
    {
        const count = this.photos.length
        if(!count) { return Promise.resolve() }
        const next = (index + count) % count
        this.loadToken++ // invalidate in-flight loads
        this.loading = null
        this.releaseTexture()
        this.photoIndex = next
        this.status = 'idle'
        this.showPlaceholder()
        return this.ensureLoaded(next)
    }

    /** Free GPU memory when the car is far away. */
    unload()
    {
        if(this.status === 'idle') { return }
        this.loadToken++
        this.loading = null
        this.releaseTexture()
        this.status = 'idle'
        this.showPlaceholder()
    }

    dispose()
    {
        this.disposed = true
        this.releaseTexture()
        if(this.fallbackTexture) { this.fallbackTexture.dispose(); this.fallbackTexture = null }
        this.photoMaterial.dispose()
    }
}
