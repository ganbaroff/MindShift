import { getEnv } from './env.mjs'
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
const k = getEnv('ELEVENLABS_API_KEY')
const VOICE = process.env.EL_VOICE || 'IKne3meq5aSn9XLyUdCD'
const MODEL = 'eleven_v3', GAP = 0.26, MAXTOTAL = 22.5
const OUT = 'el_native'; rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true })
const LINES = [
  'Saytınız müştərini ilk saniyələrdə tutmasa, onu itirdiniz.',
  'Yavaş, köhnə dizayn etibar qazandırmır.',
  'Biz sürətli, canlı saytlar qururuq — mağaza, panel, analitika.',
  'Nəticə — daha çox müştəri, daha çox satış.',
  'Bizə yazın — sorğu göndərin.',
]
const SUB = ['Saytınız 3 saniyədə tutmalıdır.','Yavaş sayt = itirilmiş müştəri.','Sürətli saytlar — mağaza, panel, analitika.','Daha çox müştəri, daha çox satış 📈','Bizə yazın — sorğu göndərin']
const dur = f => parseFloat(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0', f]).toString().trim())
const durs = []
for (let i = 0; i < LINES.length; i++) {
  const mp3 = `${OUT}/l${i}.mp3`, wav = `${OUT}/p${i}.wav`
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method:'POST', headers:{'xi-api-key':k,'Content-Type':'application/json'},
    body: JSON.stringify({ text: LINES[i], model_id: MODEL, voice_settings:{ stability:0.5, similarity_boost:0.75, style:0.0, use_speaker_boost:true } }) })
  if (!r.ok){ console.log('HTTP',r.status,(await r.text()).slice(0,200)); process.exit(1) }
  writeFileSync(mp3, Buffer.from(await r.arrayBuffer())); durs.push(dur(mp3))
  const pad = i < LINES.length-1 ? GAP : 0
  execFileSync('ffmpeg', ['-y','-i',mp3,'-af',`apad=pad_dur=${pad},aresample=44100`,'-ar','44100','-ac','1',wav], {stdio:'ignore'})
}
writeFileSync(`${OUT}/list.txt`, LINES.map((_,i)=>`file 'p${i}.wav'`).join('\n'))
execFileSync('ffmpeg', ['-y','-f','concat','-safe','0','-i',`${OUT}/list.txt`,'-c','copy',`${OUT}/raw.wav`], {stdio:'ignore'})
let total = dur(`${OUT}/raw.wav`), tempo = total > MAXTOTAL ? Math.min(1.25, +(total/MAXTOTAL).toFixed(4)) : 1.0
execFileSync('ffmpeg', ['-y','-i',`${OUT}/raw.wav`,'-af',`atempo=${tempo},loudnorm=I=-16:TP=-1.5:LRA=11`,'-c:a','libmp3lame','-b:a','192k','agency_voice.mp3'], {stdio:'ignore'})
let t=0; const meta=[]
LINES.forEach((_,i)=>{ const d=durs[i]/tempo; meta.push({ text:SUB[i], start:+t.toFixed(2), end:+(t+d).toFixed(2) }); t += d + GAP/tempo })
writeFileSync('agency_vo_meta.json', JSON.stringify(meta,null,2))
console.log(`[el] Charlie — lines ${durs.map(d=>d.toFixed(1)).join(',')} total ${dur('agency_voice.mp3').toFixed(2)}s`)
