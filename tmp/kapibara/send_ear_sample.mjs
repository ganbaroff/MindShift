// send_ear_sample.mjs — synth ONE English line with LOCKED_VOICE and send it to the CEO's chat
// via the pult bot (Law 7: CEO's ear approves before a full-language switch). No secrets printed.
import { writeFileSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv, LOCKED_VOICE } from './env.mjs'

const key = requireEnv('GEMINI_API_KEY')
const tok = requireEnv('TELEGRAM_CREATORBOT_TOKEN')
const CHAT = 5150355926
const LINE = "Kapibara News! Three AI stories while the world was asleep — let's go."
const STYLE = 'Read aloud in one warm, energetic, charismatic English TV news-anchor voice — clear, upbeat, lively, never monotone:'

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`, {
  method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: `${STYLE} "${LINE}"` }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LOCKED_VOICE } } } },
  }),
})
if (!res.ok) { console.error('TTS', res.status); process.exit(1) }
const j = await res.json()
const pcm = Buffer.from(j.candidates[0].content.parts.find(p => p.inlineData).inlineData.data, 'base64')
const sr = 24000, ba = 2, br = sr * ba
const h = Buffer.alloc(44)
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8)
h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
h.writeUInt32LE(sr, 24); h.writeUInt32LE(br, 28); h.writeUInt16LE(ba, 32); h.writeUInt16LE(16, 34)
h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
writeFileSync('ear_sample_en.wav', Buffer.concat([h, pcm]))
execFileSync('ffmpeg', ['-y', '-i', 'ear_sample_en.wav', '-b:a', '128k', 'ear_sample_en.mp3'], { stdio: 'ignore' })

const fd = new FormData()
fd.append('chat_id', String(CHAT))
// sendAudio, not sendVoice — his privacy settings return VOICE_MESSAGES_FORBIDDEN for voice notes
fd.append('audio', new Blob([readFileSync('ear_sample_en.mp3')], { type: 'audio/mpeg' }), 'algieba_en.mp3')
fd.append('caption', 'Algieba по-английски — этим голосом пойдёт EN-лента. Ок или меняем?')
const r = await fetch(`https://api.telegram.org/bot${tok}/sendAudio`, { method: 'POST', body: fd })
const rj = await r.json()
console.log('sendVoice ok =', rj.ok, rj.ok ? '' : JSON.stringify(rj).slice(0, 200))
