import { launch, boot, start } from './lib.mjs'
import fs from 'fs'
const [,, name, W, H, touch, quality, reduced] = process.argv
const t = await launch(+W, +H, { touch: touch === '1', reduced: reduced === '1' })
const out = '/home/user/sandbox/docs/screenshots/phase3/'
const shot = async (n) => { await t.p.screenshot({ path: `${out}${name}-${n}.png` }) }
const res = { name, W: +W, H: +H, touch: touch === '1', quality, emulation: 'headless Chromium + SwiftShader software WebGL (NOT a real device)', steps: {} }
await boot(t, `http://localhost:4173/game/index.html?quality=${quality}`)
await shot('01-start')
await start(t)
await shot('02-world')
res.steps.world = await t.p.evaluate(() => ({ q: window.quality.tier, touchClass: document.body.classList.contains('bd-touch'), hud: !!document.querySelector('.bd-hud'), sound: !!document.querySelector('.bd-sound-btn') }))
// drive (keyboard on desktop, state check)
if (touch !== '1') {
  const y0 = await t.p.evaluate(() => window.application.world.car.chassis.object.position.y)
  await t.p.keyboard.down('ArrowUp'); await t.p.waitForTimeout(5000)
  await shot('03-driving')
  await t.p.keyboard.up('ArrowUp')
  const y1 = await t.p.evaluate(() => window.application.world.car.chassis.object.position.y)
  res.steps.keyboardDrive = { y0, y1, moved: Math.abs(y1 - y0) > 1 }
}
const tp = (i) => t.p.evaluate((i) => {
  const b = window.birthday, s = b.stations[i], car = b.physics.car.chassis.body
  const a = s.areaPosition
  car.position.set(a.x, a.y, 0.6); car.velocity.set(0, 0, 0); car.angularVelocity.set(0, 0, 0)
  return [a.x, a.y]
}, i)
const cycle = async (i, final) => {
  const r = {}
  r.pos = await tp(i)
  await t.p.waitForTimeout(3500)
  r.near = await t.p.evaluate(() => ({ nearby: !!window.birthday.viewer.nearby, prompt: document.querySelector('.bd-prompt')?.className }))
  if (final) await shot('prompt-' + i)
  await t.p.keyboard.press('Enter')
  await t.p.waitForFunction(() => window.birthday.viewer.state === 'open', null, { timeout: 30000 }).catch(() => {})
  await t.p.waitForTimeout(1200)
  r.state = await t.p.evaluate(() => ({ state: window.birthday.viewer.state, status: window.birthday.stations.map(s => s.status), tex: window.application.renderer.info.memory.textures }))
  if (final) await shot('memory-' + i)
  await t.p.keyboard.press('Escape')
  await t.p.waitForFunction(() => window.birthday.viewer.state === 'idle', null, { timeout: 30000 }).catch(() => {})
  await t.p.waitForTimeout(2200)
  r.after = await t.p.evaluate(() => ({ state: window.birthday.viewer.state, weight: window.application.camera.focus.weight, locked: window.application.world.controls.birthdayLocked }))
  return r
}
res.steps.memories = []
for (const i of [0, 1, 2, 0, 1, 2, 3, 4, 5]) res.steps.memories.push(await cycle(i, [0, 1].includes(i) && !res.steps.memories.some(m => m.shotDone === i) && (res.steps.memories.length < 2)))
// multi-photo: next photo on station 1
await tp(1); await t.p.waitForTimeout(2500); await t.p.keyboard.press('Enter')
await t.p.waitForFunction(() => window.birthday.viewer.state === 'open', null, { timeout: 30000 }).catch(() => {})
await t.p.waitForTimeout(800)
await t.p.click('.bd-next').catch(() => {}); await t.p.waitForTimeout(2500)
await shot('memory-1-photo2')
res.steps.photo2 = await t.p.evaluate(() => ({ idx: window.birthday.stations[1].photoIndex, status: window.birthday.stations[1].status }))
await t.p.click('.bd-close').catch(() => {}); await t.p.waitForTimeout(2500)
res.steps.closeButton = await t.p.evaluate(() => window.birthday.viewer.state)
// finale
await t.p.evaluate(() => { const f = window.birthday.finale, c = window.birthday.physics.car.chassis.body, p = { x: f.center.x - 8.6, y: f.center.y }; c.position.set(p.x, p.y, 0.6); c.velocity.set(0,0,0) })
await t.p.waitForTimeout(5000)
await shot('finale-intro')
await t.p.keyboard.press('Enter')
await t.p.waitForTimeout(9000)
await shot('finale-celebration')
res.steps.finale = await t.p.evaluate(() => ({ state: window.birthday.finale.state }))
await t.p.waitForTimeout(6000)
await shot('finale-message')
res.steps.finale2 = await t.p.evaluate(() => ({ state: window.birthday.finale.state, buttons: [...document.querySelectorAll('.bd-sheet-final button')].map(b => b.textContent) }))
// replay
await t.p.evaluate(() => window.birthday.finale.replay()); await t.p.waitForTimeout(9000)
res.steps.afterReplay = await t.p.evaluate(() => ({ state: window.birthday.finale.state, locked: window.application.world.controls.birthdayLocked }))
await shot('finale-replay')
res.render = await t.p.evaluate(() => { const i = window.application.renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length } })
res.quality = await t.p.evaluate(() => window.quality.summary())
res.heap = await t.p.evaluate(() => performance.memory ? { usedMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) } : null)
res.consoleErrors = t.logs.filter(l => /^(error|PAGEERROR)/.test(l)); res.warnings = t.logs.filter(l => /^warning/.test(l)).slice(0, 8)
res.failedRequests = t.failed
fs.writeFileSync(`/home/user/sandbox/docs/test-results-phase3-${name}.json`, JSON.stringify(res, null, 1))
console.log(JSON.stringify(res, null, 1).slice(0, 4000))
await t.b.close()
