// mix_music.mjs — voice (full) + Lyria music bed (ducked under voice) → agency_mix.mp3, TIMED to the voice.
import { execFileSync } from 'node:child_process'
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())
const D = +dur('agency_voice.mp3').toFixed(2)
const fadeSt = (D - 1.2).toFixed(2)
const fc =
  `[1:a]volume=0.24,afade=t=out:st=${fadeSt}:d=1.2[mus];` +
  '[mus][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=6:release=260[duck];' +
  '[duck][0:a]amix=inputs=2:duration=first:dropout_transition=0,' +
  'loudnorm=I=-15:TP=-1.5:LRA=11[out]'
execFileSync('ffmpeg', ['-y', '-i', 'agency_voice.mp3', '-i', 'music_bed.mp3',
  '-filter_complex', fc, '-map', '[out]', '-t', String(D), '-c:a', 'libmp3lame', '-b:a', '192k', 'agency_mix.mp3'],
  { stdio: 'ignore' })
console.log('[mix] agency_mix.mp3 =', dur('agency_mix.mp3'), 's (voice', D, 's)')
