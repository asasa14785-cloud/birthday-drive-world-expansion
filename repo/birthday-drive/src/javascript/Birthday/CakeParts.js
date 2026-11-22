/**
 * Ported from moo-krub/hbd-3d-craft (MIT) — Copyright (c) 2026 GitBababoo
 * Source: src/cake/parts.js
 * Adapted for Birthday Drive (Bruno Simon folio-2019 engine, three r164, unlit/matcap scene).
 * See THIRD_PARTY_NOTICES.md.
 */
import * as THREE from 'three';
export function createBeveledCylinder(radius, height, bevelRadius) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius - bevelRadius, 0, Math.PI * 2, false);

    // Scale the silhouette resolution with the actual radius. A flat 24 left
    // the big 2-unit tiers visibly faceted while over-tessellating the small
    // stand parts nobody looks at.
    const curveSegments = Math.min(96, Math.max(24, Math.round(radius * 36)));

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: height - bevelRadius * 2,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 6,
        bevelSize: bevelRadius,
        bevelThickness: bevelRadius,
        curveSegments
    });
    geo.center();
    geo.rotateX(Math.PI / 2);
    return geo;
}

/**
 * The heart profile every heart-shaped part is derived from.
 *
 * Local extents for a given `scale` (with s = scale * 0.95):
 *   x ∈ [-1.78s, 1.78s]   y ∈ [-1.85s, 1.5s]
 * The y range is asymmetric, which matters — see HEART_CENTER_RATIO.
 *
 * Proportions are what make it read as a heart from a 30° camera: a cleft
 * cut 0.55s deep between full round lobes, and sides that run almost straight
 * into the point. The previous profile's lobes bulged 2.15s out over a very
 * shallow, knife-sharp cleft, so from above it looked like two drums fused
 * together with a crack between them.
 */
export function getHeartShape(scale = 1.0) {
    const shape = new THREE.Shape();
    const s = scale * 0.95;
    shape.moveTo(0, 0.95 * s);
    shape.bezierCurveTo(0.14 * s, 1.24 * s, 0.46 * s, 1.5 * s, 0.9 * s, 1.5 * s);
    shape.bezierCurveTo(1.42 * s, 1.5 * s, 1.78 * s, 1.12 * s, 1.78 * s, 0.6 * s);
    shape.bezierCurveTo(1.78 * s, -0.12 * s, 0.62 * s, -1.08 * s, 0, -1.85 * s);
    shape.bezierCurveTo(-0.62 * s, -1.08 * s, -1.78 * s, -0.12 * s, -1.78 * s, 0.6 * s);
    shape.bezierCurveTo(-1.78 * s, 1.12 * s, -1.42 * s, 1.5 * s, -0.9 * s, 1.5 * s);
    shape.bezierCurveTo(-0.46 * s, 1.5 * s, -0.14 * s, 1.24 * s, 0, 0.95 * s);
    return shape;
}

/**
 * Heart parts are centred on the profile's bounding box, which shifts it up
 * by this fraction of s because the y range isn't symmetric about 0:
 *   centre = (1.5s + (-1.85s)) / 2 = -0.175s
 *
 * Every decoration that follows the heart perimeter has to apply the same
 * shift or it floats off the cake. heartPerimeterPoints() does it for you.
 */
export const HEART_CENTER_RATIO = 0.175;

/**
 * Dense, evenly spaced, slightly smoothed outline in shape space with outward
 * normals, starting at the cleft and running over one lobe to the point.
 *
 * The Laplacian passes round the point and the cleft by well under a tenth of
 * a unit. A mathematically sharp corner can't take a rounded top edge (the
 * inset rings cross over each other there), and the sharp cleft is exactly
 * what drew the old dark seam down the middle of the cake.
 */
function heartOutline(scale) {
    const n = 480;
    let pts = getHeartShape(scale).getSpacedPoints(n).slice(0, n).map((p) => [p.x, p.y]);
    for (let pass = 0; pass < 28; pass++) {
        pts = pts.map((p, i) => {
            const a = pts[(i - 1 + n) % n];
            const b = pts[(i + 1) % n];
            return [p[0] * 0.5 + (a[0] + b[0]) * 0.25, p[1] * 0.5 + (a[1] + b[1]) * 0.25];
        });
    }

    // The winding decides which side of the tangent is "out". A signed area
    // is robust where a centroid test isn't (along the flanks of the cleft).
    let area = 0;
    for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        area += a[0] * b[1] - b[0] * a[1];
    }
    const sign = area < 0 ? -1 : 1;

    const normals = [];
    const lengths = [0];
    for (let i = 0; i < n; i++) {
        const a = pts[(i - 1 + n) % n];
        const b = pts[(i + 1) % n];
        const tx = b[0] - a[0];
        const ty = b[1] - a[1];
        const len = Math.hypot(tx, ty) || 1;
        // CCW outline: outward = tangent rotated -90°
        normals.push([(sign * ty) / len, (sign * -tx) / len]);
        const c = pts[(i + 1) % n];
        lengths.push(lengths[i] + Math.hypot(c[0] - pts[i][0], c[1] - pts[i][1]));
    }
    return { pts, normals, lengths, total: lengths[n] };
}

/**
 * `count` points evenly spaced by arc length from the cleft, each with its
 * outward normal. For even counts index count/2 lands exactly on the point,
 * so decorations come out mirror-symmetric.
 */
function sampleHeart(scale, count) {
    const { pts, normals, lengths, total } = heartOutline(scale);
    const n = pts.length;
    const out = [];
    let k = 0;
    for (let i = 0; i < count; i++) {
        const target = (i / count) * total;
        while (k < n - 1 && lengths[k + 1] < target) k++;
        const f = (target - lengths[k]) / ((lengths[k + 1] - lengths[k]) || 1);
        const a = pts[k];
        const b = pts[(k + 1) % n];
        const na = normals[k];
        const nb = normals[(k + 1) % n];
        const nx = na[0] + (nb[0] - na[0]) * f;
        const ny = na[1] + (nb[1] - na[1]) * f;
        const nl = Math.hypot(nx, ny) || 1;
        out.push({
            x: a[0] + (b[0] - a[0]) * f,
            y: a[1] + (b[1] - a[1]) * f,
            nx: nx / nl,
            ny: ny / nl
        });
    }
    return { samples: out, perimeter: total };
}

/**
 * A heart slab: straight walls, a rounded top edge of radius `bevelSize`, a
 * tighter one at the foot, and flat caps. Centred on its bounding box with
 * the point facing +Z, like the ExtrudeGeometry version it replaces.
 *
 * Built by hand because ExtrudeGeometry emits non-indexed triangles: the
 * walls shaded as flat facets and the bevel creased where the lobes meet.
 * Here every ring shares vertices all the way round, so normals are smooth.
 * Note the wall sits exactly on the outline (Extrude's bevel pushed it out
 * by bevelSize).
 */
export function createHeartCakeGeometry(scale, height, bevelSize) {
    const N = 168;
    const { samples } = sampleHeart(scale, N);
    const zShift = HEART_CENTER_RATIO * scale * 0.95;
    const r = Math.min(bevelSize, height * 0.45);
    const rb = r * 0.5;
    const ARC = 6;

    // Profile rows: [offset along the outward normal, height, cos, sin]
    const prof = [];
    for (let k = 0; k <= ARC; k++) {
        const phi = -Math.PI / 2 + (k / ARC) * (Math.PI / 2);
        prof.push([-rb + rb * Math.cos(phi), rb + rb * Math.sin(phi), Math.cos(phi), Math.sin(phi)]);
    }
    for (let k = 0; k <= ARC; k++) {
        const phi = (k / ARC) * (Math.PI / 2);
        prof.push([-r + r * Math.cos(phi), height - r + r * Math.sin(phi), Math.cos(phi), Math.sin(phi)]);
    }
    const rows = prof.length;

    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    const toWorld = (p, d, h) => [p.x + p.nx * d, h - height / 2, -(p.y + p.ny * d + zShift)];

    // Side: N + 1 columns so the UV seam (at the cleft, facing away) can wrap
    for (let i = 0; i <= N; i++) {
        const p = samples[i % N];
        for (let j = 0; j < rows; j++) {
            const [d, h, c, sn] = prof[j];
            pos.push(...toWorld(p, d, h));
            nor.push(p.nx * c, sn, -p.ny * c);
            uv.push(i / N, h / height);
        }
    }
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < rows - 1; j++) {
            const a = i * rows + j;
            const b = (i + 1) * rows + j;
            idx.push(a, b, b + 1, a, b + 1, a + 1);
        }
    }
    const sideIndexCount = idx.length;

    // Caps: flat, with their own vertices (planar UVs), triangulated from the
    // innermost ring of the rounded edges.
    const up = new THREE.Vector3();
    const faceNormal = (a, b, c) => {
        const va = new THREE.Vector3().fromArray(pos, a * 3);
        const vb = new THREE.Vector3().fromArray(pos, b * 3).sub(va);
        const vc = new THREE.Vector3().fromArray(pos, c * 3).sub(va);
        return vb.cross(vc);
    };
    const cap = (row, dir) => {
        const base = pos.length / 3;
        const contour = [];
        for (let i = 0; i < N; i++) {
            const w = toWorld(samples[i], prof[row][0], prof[row][1]);
            pos.push(...w);
            nor.push(0, dir, 0);
            uv.push(w[0] / 3 + 0.5, w[2] / 3 + 0.5);
            contour.push(new THREE.Vector2(w[0], w[2]));
        }
        up.set(0, dir, 0);
        THREE.ShapeUtils.triangulateShape(contour, []).forEach(([a, b, c]) => {
            if (faceNormal(base + a, base + b, base + c).dot(up) >= 0) idx.push(base + a, base + b, base + c);
            else idx.push(base + a, base + c, base + b);
        });
    };
    cap(rows - 1, 1);
    cap(0, -1);

    // Side winding follows the outline's direction, so test one wall quad
    // against its intended normal and flip the side if it faces inward.
    const wall = ARC; // first vertex of the straight wall in column 0
    const wantN = new THREE.Vector3().fromArray(nor, wall * 3);
    if (faceNormal(wall, rows + wall, rows + wall + 1).dot(wantN) < 0) {
        for (let t = 0; t < sideIndexCount; t += 3) {
            const tmp = idx[t + 1];
            idx[t + 1] = idx[t + 2];
            idx[t + 2] = tmp;
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
}
export function buildPipedCreamGeometry(seed, detail) {
    const R = 0.1;
    // A rosette is ~0.15 units wide on screen; the ridges stop being
    // resolvable well before the segment count does, so phones drop to a
    // coarser sphere. There can be over a hundred of these on one cake.
    const geo = detail < 1
        ? new THREE.SphereGeometry(R, 18, 12)
        : new THREE.SphereGeometry(R, 28, 18);
    const pos = geo.attributes.position;

    // A real star nozzle leaves 5 vertical ridges, and lifting the bag while
    // piping twists them into a spiral. That silhouette — not a smooth dome —
    // is what reads as piped cream rather than a white ball.
    const RIDGE_COUNT = 5;

    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        if (y > 0) {
            // Clamp at 0: the top pole vertex can land a hair above the radius
            // in float math, and Math.pow(negative, 0.45) is NaN — which
            // poisoned the whole geometry's bounding sphere (breaking frustum
            // culling and raycast hits on the cream).
            const factor = Math.max(0, 1.0 - (y / R));
            x *= Math.pow(factor, 0.45);
            z *= Math.pow(factor, 0.45);
            y *= 1.35; // pull tip upwards
        }

        const radial = Math.hypot(x, z);
        if (radial > 1e-6) {
            const theta = Math.atan2(z, x);
            const heightT = THREE.MathUtils.clamp((y + R) / (R * 2), 0, 1);
            // Keep this shallow — around a tenth of the radius. Deeper than
            // that and the rosette turns into sharp fins instead of cream.
            const depth = R * 0.11 * (1 - heightT);
            const ridge = Math.cos(theta * RIDGE_COUNT + heightT * 2.4 + seed) * depth;
            const scale = (radial + ridge) / radial;
            x *= scale;
            z *= scale;
        }

        // Per-instance lean so a ring of them never looks stamped from one mold
        x += y * (Math.sin(seed) * 0.07);

        pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
}

/**
 * A piped shell — the sideways teardrop a star nozzle leaves when you squeeze,
 * drag and release. Rings of these are the classic top-and-bottom cake border,
 * and they read very differently from a ring of upright rosettes.
 */
