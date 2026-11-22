// Storybook world asset pipeline (Phase 1).
// Merges the SELECTED Quaternius Stylized Nature MegaKit models (+ a few 3dassets.dev Meadow Courier pieces)
// into ONE optimized GLB so every texture is uploaded once.  Originals in research/world-expansion/raw/ are never modified.
//
// Run from /tmp/pw (where @gltf-transform/*, draco3dgltf, meshoptimizer and sharp are installed):
//   cp scripts/world-assets.mjs /tmp/pw/ && cd /tmp/pw && node world-assets.mjs <repoRoot>
import { NodeIO, Document } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { mergeDocuments, dedup, prune, weld, simplify, textureCompress, unpartition, dequantize, getBounds } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const root = process.argv[2] || process.cwd()
const rawQ = path.join(root, 'research/world-expansion/raw/quaternius-nature/glTF')
const rawM = path.join(root, 'research/world-expansion/raw/3dassets')
const outDir = path.join(root, 'birthday-drive/static/models/storybook')
fs.mkdirSync(outDir, { recursive: true })

const Q = (name, ratio, error = 0.02) => ({ id: name, file: path.join(rawQ, `${name}.gltf`), ratio, error })
const SELECTED = [
    // trees (dominant silhouette family)
    Q('CommonTree_1', 0.25, 0.15), Q('CommonTree_2', 0.25, 0.15), Q('CommonTree_4', 0.25, 0.15),
    Q('Pine_1', 0.25, 0.15), Q('Pine_3', 0.25, 0.15),
    Q('TwistedTree_1', 0.2, 0.2), // giant landmark tree
    // understory
    Q('Bush_Common', 0.6), Q('Bush_Common_Flowers', 0.5),
    Q('Flower_3_Group', 0.6), Q('Flower_4_Group', 0.6),
    Q('Grass_Common_Tall', 1), Q('Grass_Wispy_Short', 1),
    Q('Fern_1', 0.6), Q('Clover_1', 0.6),
    Q('Mushroom_Common', 0.5), Q('Mushroom_Laetiporus', 0.5),
    // stones
    Q('Rock_Medium_1', 1), Q('Rock_Medium_2', 1), Q('Pebble_Round_1', 1),
    // supplement: 3dassets.dev Meadow Courier (CC0) — one village landmark piece + sign
    { id: 'MC_GardenCottage', file: path.join(rawM, 'meadow-courier-garden-cottage.glb'), ratio: 1 },
    { id: 'MC_RouteSign', file: path.join(rawM, 'meadow-courier-village-route-sign.glb'), ratio: 1 }
]

await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

const tris = (doc) => { let t = 0; for(const m of doc.getRoot().listMeshes()) for(const p of m.listPrimitives()) t += (p.getIndices()?.getCount() || 0) / 3; return Math.round(t) }

const out = new Document()
out.createBuffer()
const outScene = out.createScene('storybook')
const report = []

for(const item of SELECTED)
{
    const doc = await io.read(item.file)
    const before = tris(doc)
    await doc.transform(dequantize())
    // The shared Lambert look does not use normal / ORM maps: they are dead weight.
    for(const mat of doc.getRoot().listMaterials()) { mat.setNormalTexture(null); mat.setMetallicRoughnessTexture(null) }
    if(item.ratio < 1) { await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: item.ratio, error: item.error ?? 0.02 })) }
    const after = tris(doc)
    const bounds = getBounds(doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0])
    mergeDocuments(out, doc)
    report.push({ id: item.id, trisBefore: before, trisAfter: after, size: bounds.max.map((v, i) => +(v - bounds.min[i]).toFixed(2)).join(' x '), minY: +bounds.min[1].toFixed(2) })
}

// Each merged source scene -> one named top-level node
const scenes = out.getRoot().listScenes().filter((s) => s !== outScene)
scenes.forEach((s, i) =>
{
    const holder = out.createNode(SELECTED[i].id)
    for(const child of s.listChildren()) { s.removeChild(child); holder.addChild(child) }
    outScene.addChild(holder)
    s.dispose()
})
out.getRoot().setDefaultScene(outScene)
await out.transform(
    dedup(), prune(), unpartition(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }),
    prune()
)
const file = path.join(outDir, 'storybook-kit.glb')
await io.write(file, out)

const summary = {
    file: 'birthday-drive/static/models/storybook/storybook-kit.glb',
    bytes: fs.statSync(file).size,
    totalTriangles: tris(out),
    textures: out.getRoot().listTextures().map((t) => ({ name: t.getName(), mime: t.getMimeType(), size: t.getSize() })),
    models: report
}
fs.writeFileSync(path.join(root, 'research/world-expansion/PIPELINE_RESULT.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify({ bytes: summary.bytes, tris: summary.totalTriangles, textures: summary.textures.length }, null, 1))
console.table(report)
