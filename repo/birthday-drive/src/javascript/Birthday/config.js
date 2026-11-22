/**
 * Birthday Drive — content configuration + validation layer.
 *
 * The engine never reads raw JSON: everything goes through `validateConfig`,
 * which fills defaults, normalises paths and records warnings instead of
 * throwing. A broken/missing config.json falls back to DEFAULT_CONFIG so the
 * world always starts.
 *
 * Rules (see docs/CUSTOMIZATION_GUIDE.md):
 *  - photos are referenced by path/URL only; `data:` / `blob:` payloads are
 *    rejected (no personal binaries inside URLs or configs);
 *  - optional fields (caption, date, audio, extra photos) may be missing.
 */

export const ZONES = ['childhood', 'friends', 'landmarks']

export const DEFAULT_CONFIG = {
    recipient: 'Friend',
    sender: 'From Someone Special',
    carColor: '#F2A6BA',
    welcome: 'A World Made for You',
    theme: {
        floorTopLeft: '#f6c6d0',
        floorTopRight: '#fbd5c4',
        floorBottomRight: '#fff1d6',
        floorBottomLeft: '#f3b9c9',
        accent: '#F2A6BA',
        gold: '#ffd76a'
    },
    cake: {
        shape: 'tiered',
        tiers: 2,
        frosting: '#fff3f6',
        sponge: '#F2A6BA',
        candles: 7,
        candleColor: '',
        topper: ''
    },
    stations: [],
    finale: { title: 'Happy Birthday', message: 'A world made from our memories.' }
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const MAX_TEXT = 220

const str = (value, fallback = '', max = MAX_TEXT) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback

const color = (value, fallback, warnings, label) =>
{
    if(value === undefined || value === null || value === '') { return fallback }
    if(typeof value === 'string' && HEX.test(value.trim())) { return value.trim() }
    warnings.push(`${label}: "${value}" is not a hex colour, using ${fallback}`)
    return fallback
}

/** Returns a safe, relocatable URL or null. Leading "/" becomes "./" (the game is built with base "./"). */
export function normalizeAssetPath(value, warnings, label)
{
    if(typeof value !== 'string' || !value.trim()) { return null }
    const path = value.trim()
    if(/^(data|blob|javascript):/i.test(path) || path.length > 2048)
    {
        warnings.push(`${label}: inline/oversized payloads are not allowed (use a file path)`)
        return null
    }
    if(/^https?:\/\//i.test(path)) { return path }
    if(path.startsWith('/')) { return `.${path}` }
    return path
}

const validatePhotos = (raw, warnings, label) =>
{
    const list = []
    if(Array.isArray(raw.photos))
    {
        for(let i = 0; i < raw.photos.length; i++)
        {
            const item = raw.photos[i]
            const entry = typeof item === 'string' ? { src: item } : item
            const src = normalizeAssetPath(entry && entry.src, warnings, `${label}.photos[${i}]`)
            if(src) { list.push({ src, caption: str(entry.caption, '') }) }
        }
    }
    if(!list.length && raw.photo)
    {
        const src = normalizeAssetPath(raw.photo, warnings, `${label}.photo`)
        if(src) { list.push({ src, caption: '' }) }
    }
    return list
}

export function validateConfig(raw)
{
    const warnings = []
    const source = raw && typeof raw === 'object' ? raw : {}
    if(source !== raw) { warnings.push('config is missing or invalid, using defaults') }

    const config = {
        recipient: str(source.recipient, DEFAULT_CONFIG.recipient, 40),
        sender: str(source.sender, DEFAULT_CONFIG.sender, 80),
        welcome: str(source.welcome, DEFAULT_CONFIG.welcome, 80),
        carColor: color(source.carColor, DEFAULT_CONFIG.carColor, warnings, 'carColor'),
        theme: {},
        cake: {},
        stations: [],
        finale: {},
        warnings
    }

    const theme = source.theme || {}
    for(const key of Object.keys(DEFAULT_CONFIG.theme))
    {
        config.theme[key] = color(theme[key], DEFAULT_CONFIG.theme[key], warnings, `theme.${key}`)
    }

    const cake = source.cake || {}
    config.cake.shape = ['round', 'tiered', 'heart'].includes(cake.shape) ? cake.shape : DEFAULT_CONFIG.cake.shape
    config.cake.tiers = Math.min(3, Math.max(1, Math.round(Number(cake.tiers) || DEFAULT_CONFIG.cake.tiers)))
    config.cake.candles = Math.min(24, Math.max(1, Math.round(Number(cake.candles) || DEFAULT_CONFIG.cake.candles)))
    config.cake.frosting = color(cake.frosting, DEFAULT_CONFIG.cake.frosting, warnings, 'cake.frosting')
    config.cake.sponge = color(cake.sponge, DEFAULT_CONFIG.cake.sponge, warnings, 'cake.sponge')
    config.cake.candleColor = color(cake.candleColor, '', warnings, 'cake.candleColor')
    config.cake.topper = str(cake.topper, config.recipient, 24)

    const finale = source.finale || {}
    config.finale.title = str(finale.title, `Happy Birthday ${config.recipient}`, 80)
    config.finale.message = str(finale.message, DEFAULT_CONFIG.finale.message, 240)

    const seen = new Set()
    const stations = Array.isArray(source.stations) ? source.stations : []
    stations.forEach((item, index) =>
    {
        const label = `stations[${index}]`
        if(!item || typeof item !== 'object') { warnings.push(`${label}: skipped (not an object)`); return }
        let id = str(item.id, `memory-${String(index + 1).padStart(2, '0')}`, 60)
        if(seen.has(id)) { warnings.push(`${label}: duplicate id "${id}", renamed`); id = `${id}-${index}` }
        seen.add(id)

        let zone = item.zone
        if(!ZONES.includes(zone))
        {
            warnings.push(`${label}: unknown zone "${zone}", using "childhood"`)
            zone = 'childhood'
        }

        config.stations.push({
            id,
            zone,
            title: str(item.title, 'A Memory', 60),
            caption: str(item.caption, ''),
            date: str(item.date, '', 60),
            photos: validatePhotos(item, warnings, label),
            audio: normalizeAssetPath(item.audio, warnings, `${label}.audio`)
        })
    })

    return config
}

export async function loadBirthdayConfig(url = './birthday/config.json')
{
    let raw = null
    try
    {
        const response = await fetch(url, { cache: 'no-cache' })
        if(!response.ok) { throw new Error(`HTTP ${response.status}`) }
        raw = await response.json()
    }
    catch(error)
    {
        console.warn('[birthday] config.json unavailable, using defaults:', error.message)
    }
    const config = validateConfig(raw)
    if(config.warnings.length) { console.warn('[birthday] config warnings:\n - ' + config.warnings.join('\n - ')) }
    return config
}
