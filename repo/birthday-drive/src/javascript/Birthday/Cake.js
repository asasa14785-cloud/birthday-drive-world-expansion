import * as THREE from 'three'
import { buildCandles } from './Candles.js'
import { createBeveledCylinder, createHeartCakeGeometry, buildPipedCreamGeometry } from './CakeParts.js'

/**
 * Customizable birthday cake built from HBD 3D Craft parts (beveled tiers,
 * heart silhouette, piped-cream rosettes, striped candles with animated
 * flames). Y-up local space — the caller rotates the holder into Bruno's Z-up
 * world. Surfaces use Bruno's tinted matcap materials (no scene lights).
 *
 * config: { shape: 'round'|'tiered'|'heart', tiers, frosting, sponge, candles, candleColor }
 */
export default class Cake
{
    constructor({ props, config })
    {
        this.props = props
        this.config = config
        this.group = new THREE.Group()
        this.group.name = 'birthday-cake'
        this.geometries = []
        this.flames = []
        this.lit = true
        this.build()
    }

    track(geometry) { this.geometries.push(geometry); return geometry }

    build()
    {
        const { props, config } = this
        const sponge = props.tint(config.sponge)
        const frosting = props.tint(config.frosting)
        const gold = props.tint('#ffd76a')
        const berry = props.tint('#e5384f', 'red')
        const plate = props.tint('#ffffff')

        // Plate
        const plateGeo = this.track(new THREE.CylinderGeometry(1.75, 1.85, 0.09, 48))
        const plateMesh = new THREE.Mesh(plateGeo, plate)
        plateMesh.position.y = 0.045
        this.group.add(plateMesh)
        const rimGeo = this.track(new THREE.TorusGeometry(1.78, 0.04, 8, 64))
        const rim = new THREE.Mesh(rimGeo, gold)
        rim.rotation.x = Math.PI * 0.5
        rim.position.y = 0.09
        this.group.add(rim)

        let y = 0.09
        const isHeart = config.shape === 'heart'
        const tiers = config.shape === 'tiered' ? config.tiers : 1
        const baseRadius = config.shape === 'tiered' ? 1.35 : 1.45
        const height = config.shape === 'tiered' ? 0.52 : 0.8
        let topRadius = baseRadius
        const rosetteGeo = this.track(buildPipedCreamGeometry(1.3, 0))

        for(let tier = 0; tier < tiers; tier++)
        {
            const radius = baseRadius * (1 - tier * 0.3)
            topRadius = radius
            let body
            if(isHeart)
            {
                const geo = this.track(createHeartCakeGeometry(0.72, height, 0.06))
                geo.computeBoundingBox()
                geo.translate(0, - geo.boundingBox.min.y, 0)
                body = new THREE.Mesh(geo, sponge)
                body.position.y = y
            }
            else
            {
                const geo = this.track(createBeveledCylinder(radius, height, 0.07))
                body = new THREE.Mesh(geo, sponge)
                body.position.y = y + height / 2
            }
            this.group.add(body)

            // Frosting cap + drips
            const capGeo = this.track(new THREE.CylinderGeometry(radius * 0.98, radius * 0.98, 0.06, 48))
            const cap = new THREE.Mesh(isHeart ? this.track(createHeartCakeGeometry(0.74, 0.08, 0.04)) : capGeo, frosting)
            if(isHeart) { cap.geometry.computeBoundingBox(); cap.geometry.translate(0, - cap.geometry.boundingBox.min.y, 0) }
            cap.position.y = y + height - (isHeart ? 0.02 : 0)  + (isHeart ? 0 : 0.0)
            this.group.add(cap)

            if(!isHeart)
            {
                const dripGeo = this.track(new THREE.CapsuleGeometry(0.075, 0.2, 4, 8))
                const drips = 16
                for(let i = 0; i < drips; i++)
                {
                    const a = (i / drips) * Math.PI * 2
                    const drip = new THREE.Mesh(dripGeo, frosting)
                    drip.position.set(Math.cos(a) * radius * 0.985, y + height - 0.1 - (i % 3) * 0.06, Math.sin(a) * radius * 0.985)
                    drip.scale.y = 0.8 + (i % 3) * 0.5
                    this.group.add(drip)
                }
                // Piped-cream rosettes (HBD) around the top edge
                const count = Math.round(radius * 11)
                for(let i = 0; i < count; i++)
                {
                    const a = (i / count) * Math.PI * 2
                    const rosette = new THREE.Mesh(rosetteGeo, frosting)
                    rosette.position.set(Math.cos(a) * radius * 0.88, y + height + 0.05, Math.sin(a) * radius * 0.88)
                    rosette.scale.setScalar(0.62)
                    this.group.add(rosette)
                }
            }
            y += height
        }

        // Berries on the top tier
        const berryGeo = this.track(new THREE.SphereGeometry(0.1, 12, 8))
        const berries = 8
        for(let i = 0; i < berries; i++)
        {
            const a = (i / berries) * Math.PI * 2 + 0.2
            const b = new THREE.Mesh(berryGeo, berry)
            b.position.set(Math.cos(a) * topRadius * 0.45, y + 0.1, Math.sin(a) * topRadius * 0.45 * (isHeart ? 0.8 : 1))
            this.group.add(b)
        }

        // Candles (HBD): InstancedMesh sticks, animated shader flames
        const candles = buildCandles(this.group, {
            candlePlacerRadius: topRadius * (isHeart ? 0.5 : 0.68),
            candleBaseY: y + 0.04,
            isHeartShape: isHeart
        }, { count: config.candles, candleColor: config.candleColor ? new THREE.Color(config.candleColor).getHex() : '', look: 'light' })

        this.flames = candles.candles.map((c) => c.flame)
        this.flameMaterial = candles.flameMaterial
        this.topY = y + 0.5
        this.height = y
    }

    update(elapsed)
    {
        if(this.flameMaterial) { this.flameMaterial.uniforms.uTime.value = elapsed }
    }

    /** Candle positions in cake-local space (for smoke / sparkles). */
    flameWorldPositions(target = [])
    {
        target.length = 0
        const v = new THREE.Vector3()
        for(const flame of this.flames)
        {
            flame.getWorldPosition(v)
            target.push(v.clone())
        }
        return target
    }

    dispose()
    {
        this.geometries.forEach((g) => g.dispose())
        this.group.removeFromParent()
    }
}
