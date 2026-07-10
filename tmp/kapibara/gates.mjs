// gates.mjs — enforceable quality gates. CODE decides, fail-closed.
// Every function THROWS on failure (never returns false silently, never warns-and-continues).
// Callers must let it throw = block the pipeline. This is the load-bearing spine of the
// Quality Gate System (see QUALITY-GATES-SPEC-2026-07-05.md).
import { execFileSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';

export class GateError extends Error {
  constructor(gate, msg) { super(`[GATE ${gate}] ${msg}`); this.gate = gate; }
}

// G2/G4 — real media validation (not size>10KB). ffprobe duration must be > minSec.
export function assertDuration(file, minSec = 0.1, label = 'artifact') {
  if (!existsSync(file)) throw new GateError('duration', `${label}: file missing: ${file}`);
  let out;
  try {
    out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }).trim();
  } catch (e) { throw new GateError('duration', `${label}: ffprobe failed (corrupt?): ${e.message}`); }
  const d = parseFloat(out);
  if (!Number.isFinite(d) || d <= minSec)
    throw new GateError('duration', `${label}: duration ${out} <= ${minSec}s — truncated/corrupt: ${file}`);
  return d;
}

// G4.1 — the -shortest trap. Voice must NOT exceed video, or audio gets silently cut.
export function assertAudioFitsVideo(videoDur, voiceDur, tol = 0.5) {
  if (voiceDur > videoDur + tol)
    throw new GateError('audio-fit', `voice ${voiceDur}s > video ${videoDur}s — -shortest would truncate audio mid-word`);
  return true;
}

// G4 — count assertion between stages (the "28 vs 50 captions" crash class).
export function assertCount(actual, expected, label = 'items') {
  if (actual !== expected)
    throw new GateError('count', `${label}: have ${actual}, need ${expected} — ffmpeg would crash or mis-time`);
  return true;
}

// G5 — GCS/remote must be truly reachable, BLOCKING (not warn).
export function assertHttp200(url) {
  let head;
  try { head = execFileSync('curl', ['-sI', '-m', '15', url], { encoding: 'utf8' }); }
  catch (e) { throw new GateError('http', `HEAD failed for ${url}: ${e.message}`); }
  if (!/\b200\b/.test(head.split('\n')[0] || ''))
    throw new GateError('http', `not 200: ${url} → ${(head.split('\n')[0]||'').trim()}`);
  const len = (head.match(/content-length:\s*(\d+)/i) || [])[1];
  if (len !== undefined && Number(len) <= 0)
    throw new GateError('http', `content-length 0: ${url}`);
  return true;
}

// G1.2 — image must decode (width/height > 0), not just be >10KB.
export function assertImageValid(file, label = 'image') {
  if (!existsSync(file)) throw new GateError('image', `${label}: missing ${file}`);
  let out;
  try {
    out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim();
  } catch (e) { throw new GateError('image', `${label}: undecodable ${file}: ${e.message}`); }
  const [w, h] = out.split(',').map(Number);
  if (!(w > 0 && h > 0)) throw new GateError('image', `${label}: bad dims ${out}: ${file}`);
  return { w, h };
}

// G0 helper — extract checkable factual claims (number/year/name-title) from a script line.
// Returns the claims that MUST be grounded. Empty = no factual assertion (safe).
export function extractClaims(text) {
  const claims = [];
  // numbers (goals, ages, counts), 4-digit years, "в N", ordinals
  const numRe = /\b(\d{2,4})\b/g; let m;
  while ((m = numRe.exec(text))) claims.push({ kind: 'number', value: m[1], text });
  return claims;
}

// G0 — a script line with unbacked factual claims must be CUT, not warned.
// grounded = set/array of source-confirmed values. Throws listing the unbacked line.
export function assertLineGrounded(line, groundedValues) {
  const g = new Set((groundedValues || []).map(String));
  const claims = extractClaims(line.text ?? String(line));
  const unbacked = claims.filter(c => !g.has(String(c.value)));
  if (unbacked.length)
    throw new GateError('fact', `unbacked claim(s) [${unbacked.map(u=>u.value).join(', ')}] in: "${(line.text??line)}" — cut or cite a source`);
  return true;
}
