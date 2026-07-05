// voice_smoke.mjs — one-line TTS smoke: does LOCKED_VOICE exist on the pinned TTS model?
import { writeFileSync } from 'node:fs'
import { requireEnv, LOCKED_VOICE } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')
const MODEL = process.argv[2] || 'gemini-2.5-flash-preview-tts'
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Read aloud warmly: "Капибара Новости — проверка голоса."' }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LOCKED_VOICE } } } },
  }),
})
if (!res.ok) { console.error(`${MODEL} + ${LOCKED_VOICE}: HTTP ${res.status} ${(await res.text()).slice(0, 180)}`); process.exit(1) }
const j = await res.json()
const b64 = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data
if (!b64) { console.error('no audio in response'); process.exit(1) }
const pcm = Buffer.from(b64, 'base64')
console.log(`${MODEL} + ${LOCKED_VOICE}: OK, ${(pcm.length / 48000).toFixed(2)}s audio`)
writeFileSync('voice_smoke.pcm', pcm)
