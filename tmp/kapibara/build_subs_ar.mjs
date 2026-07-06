import { readFileSync, writeFileSync } from 'node:fs'
// EN show, AR ONLY in the bottom subtitles. Chrome/monitor/ticker/brand stay English.
// Cloned from build_subs_az.mjs — same merge, Arabic instead of Azerbaijani.
const data = JSON.parse(readFileSync('data.json', 'utf8'))
const ar = JSON.parse(readFileSync('ar_final.json', 'utf8'))
const out = {
  ...data,
  lines: data.lines.map((l, i) => ({ ...l, text: ar.lines[i] ?? l.text })),
  // intentionally NO brand/live/ai/tickerLabel/tickers, items unchanged → everything else English
}
writeFileSync('data_subs_ar.json', JSON.stringify(out))
console.log('data_subs_ar.json: EN chrome + AR subtitles only')
