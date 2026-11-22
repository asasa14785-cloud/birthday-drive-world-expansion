/**
 * Minimal local replacement for HBD's `sharedMaterial` / `sharedTexture`
 * caches (src/cake/parts.js, MIT — Copyright (c) 2026 GitBababoo).
 * Plain Map caches + an explicit dispose, no LRU (the scene only ever builds
 * a handful of distinct materials).
 */
const materials = new Map()
const textures = new Map()
const ids = new WeakMap()
let nextId = 1

const keyOf = (value) =>
{
    if(value && value.isColor) { return `c${value.getHex()}` }
    if(value && value.isTexture) { return `t${value.uuid}` }
    if(value && typeof value === 'object') { return `{${Object.keys(value).sort().map((k) => `${k}:${keyOf(value[k])}`).join(',')}}` }
    return String(value)
}

export function sharedMaterial(Ctor, params = {})
{
    if(!ids.has(Ctor)) { ids.set(Ctor, nextId++) }
    const key = `${ids.get(Ctor)}|${keyOf(params)}`
    if(!materials.has(key)) { materials.set(key, new Ctor(params)) }
    return materials.get(key)
}

export function sharedTexture(key, paint)
{
    if(!textures.has(key)) { textures.set(key, paint()) }
    return textures.get(key)
}

/** Flame uTime uniforms are shared by every candle: one tick drives them all. */
export function forEachShaderMaterial(callback)
{
    materials.forEach((m) => { if(m.isShaderMaterial) { callback(m) } })
}

export function disposeShared()
{
    materials.forEach((m) => m.dispose())
    textures.forEach((t) => t.dispose())
    materials.clear()
    textures.clear()
}
