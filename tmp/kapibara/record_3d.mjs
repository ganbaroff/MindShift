import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { readFileSync, rmSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const dur = f => parseFloat(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim())
const { marks } = JSON.parse(readFileSync('recm/marks.json','utf8'))
const OFF = +(dur('demo3.mp4') - marks.end/1000).toFixed(2)
const REC = +(marks.end/1000 + 0.3).toFixed(2)   // play from hero to end
rmSync('rec3',{recursive:true,force:true}); mkdirSync('rec3',{recursive:true})
const b = await chromium.launch()
const ctx = await b.newContext({ viewport:{width:1080,height:1920}, recordVideo:{dir:'rec3',size:{width:1080,height:1920}} })
const p = await ctx.newPage()
await p.goto(pathToFileURL(process.cwd()+'/device_stage.html').href,{waitUntil:'networkidle'}).catch(()=>{})
await p.evaluate((off)=>{const v=document.getElementById('v');v.currentTime=off;return v.play().catch(()=>{})}, OFF)
await p.waitForTimeout(REC*1000)
await ctx.close(); await b.close()
console.log('3d recorded. OFF=',OFF,'REC=',REC)
