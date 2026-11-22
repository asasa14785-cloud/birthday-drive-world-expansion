// Asset pipeline: inspect every GLB with glTF-Transform, write optimized COPIES (never overwrites originals).
// Run from /tmp/pw (where @gltf-transform/* is installed):  node asset-pipeline.mjs <staticModelsDir> <outDir> <reportJson>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, flatten, join, draco, getBounds } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import fs from 'fs'
import path from 'path'

const [,, srcDir, outDir, reportPath] = process.argv
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
const files = walk(srcDir).filter(f => f.endsWith('.glb'))
const stats = (doc) => {
  const root = doc.getRoot()
  let verts = 0, tris = 0
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
    verts += p.getAttribute('POSITION')?.getCount() || 0
    const idx = p.getIndices(); tris += idx ? idx.getCount() / 3 : 0
  }
  return {
    nodes: root.listNodes().length, meshes: root.listMeshes().length, materials: root.listMaterials().length,
    textures: root.listTextures().map(t => ({ name: t.getName(), mime: t.getMimeType(), size: t.getSize() })),
    vertices: verts, triangles: Math.round(tris), draco: root.listExtensionsUsed().some(e => e.extensionName === 'KHR_draco_mesh_compression'),
  }
}
const report = []
for (const f of files) {
  const rel = path.relative(srcDir, f)
  const origSize = fs.statSync(f).size
  const doc = await io.read(f)
  const before = stats(doc)
  // duplicates: identical accessors / materials / textures that dedup would merge
  const nBefore = doc.getRoot().listAccessors().length + doc.getRoot().listMaterials().length + doc.getRoot().listTextures().length
  await doc.transform(dedup(), prune(), weld({ tolerance: 0.0001 }), draco({ method: 'edgebreaker' }))
  const nAfter = doc.getRoot().listAccessors().length + doc.getRoot().listMaterials().length + doc.getRoot().listTextures().length
  const out = path.join(outDir, rel)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await io.write(out, doc)
  const optSize = fs.statSync(out).size
  report.push({ file: rel, origSize, optSize, saved: origSize - optSize, ...before, duplicateResourcesRemoved: nBefore - nAfter })
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 1))
const tot = report.reduce((a, r) => (a.o += r.origSize, a.n += r.optSize, a), { o: 0, n: 0 })
console.log('files', report.length, 'orig', tot.o, 'opt', tot.n)
