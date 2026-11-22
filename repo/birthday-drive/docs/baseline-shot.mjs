// Baseline screenshot harness (Playwright, software WebGL). Usage:
//   node baseline-shot.mjs <url> <out-prefix> [width] [height]
// Click the START tile, wait for reveal, then drive with arrow keys.
import { chromium } from 'playwright'
const url = process.argv[2], out = process.argv[3]
const W = parseInt(process.argv[4] || '640'), H = parseInt(process.argv[5] || '360')
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport:{ width:W, height:H } })
p.setDefaultTimeout(180000)
const logs=[]
p.on('console', m=>logs.push(m.type()+': '+m.text()))
p.on('pageerror', e=>logs.push('PAGEERROR: '+e.message))
p.on('requestfailed', r=>logs.push('REQFAIL: '+r.url()))
await p.goto(url, { waitUntil:'load' })
await p.waitForTimeout(20000)
await p.screenshot({ path: out+'-01-start-screen.png' })
const cx = Math.round(W*0.497), cy = Math.round(H*0.505)
await p.mouse.move(cx,cy); await p.waitForTimeout(1500)
await p.mouse.click(cx,cy)
await p.waitForTimeout(25000)
await p.screenshot({ path: out+'-02-world-revealed.png' })
await p.keyboard.down('ArrowUp'); await p.waitForTimeout(12000)
await p.screenshot({ path: out+'-03-driving-forward.png' })
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(12000)
await p.screenshot({ path: out+'-04-turning.png' })
await p.keyboard.up('ArrowUp'); await p.keyboard.up('ArrowRight')
console.log(logs.filter(l=>!l.includes('%c')).slice(0,30).join('\n'))
console.log('DONE')
await b.close()
