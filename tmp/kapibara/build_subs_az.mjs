import { readFileSync, writeFileSync } from 'node:fs'
// RU show, AZ ONLY in the bottom subtitles. Chrome/monitor/ticker/brand stay Russian.
const data = JSON.parse(readFileSync('data.json', 'utf8'))
const az = JSON.parse(readFileSync('az_final.json', 'utf8'))
const out = {
  ...data,
  lines: data.lines.map((l, i) => ({ ...l, text: az.lines[i] ?? l.text })),
  // intentionally NO brand/live/ai/tickerLabel/tickers, items unchanged → everything else Russian
}
writeFileSync('data_subs_az.json', JSON.stringify(out))
console.log('data_subs_az.json: RU chrome + AZ subtitles only')
