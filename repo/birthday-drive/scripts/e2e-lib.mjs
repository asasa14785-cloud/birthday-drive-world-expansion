import { chromium } from 'playwright'
export async function launch(W, H, { touch = false, query = '', reduced = false } = {}) {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  p.setDefaultTimeout(120000)
  const logs = [], failed = []
  p.on('console', m => { const t = m.text(); if (!t.includes('%c')) logs.push(m.type() + ': ' + t) })
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message))
  p.on('requestfailed', r => failed.push(r.url()))
  p.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()) })
  return { b, p, logs, failed, W, H }
}
export async function boot(t, url) {
  await t.p.goto(url, { waitUntil: 'load' })
  await t.p.waitForFunction(() => window.application && window.application.world && window.application.world.startingScreen, null, { timeout: 120000 })
  await t.p.waitForTimeout(7000)
}
export async function start(t) {
  const { W, H } = t
  await t.p.mouse.move(W * 0.497, H * 0.505); await t.p.waitForTimeout(800)
  await t.p.mouse.click(W * 0.497, H * 0.505)
  await t.p.waitForFunction(() => window.birthday && window.birthday.stations && window.birthday.stations.length, null, { timeout: 120000 })
  await t.p.waitForTimeout(8000)
}
