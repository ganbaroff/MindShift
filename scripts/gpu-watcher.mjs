#!/usr/bin/env node
/**
 * GPU Watcher — uses local Gemma 4 via Ollama to continuously analyze project state.
 *
 * Loops forever (unless --once):
 *   1. Pull latest git log (last 10 commits)
 *   2. For each new commit, ask Gemma 4 for Constitution violations + risks
 *   3. Append findings to memory/gpu-watcher-findings.md
 *   4. Sleep 10 min, repeat
 *
 * Usage: node scripts/gpu-watcher.mjs [--once] [--model=gemma4:latest]
 * Requires: Ollama running at localhost:11434
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = process.argv.find(a => a.startsWith('--model='))?.split('=')[1] || 'gemma4:latest';
const ONCE = process.argv.includes('--once');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const FINDINGS_FILE = path.join(REPO_ROOT, 'memory', 'gpu-watcher-findings.md');
const STATE_FILE = path.join(REPO_ROOT, 'memory', '.gpu-watcher-state.json');
const SLEEP_MS = 10 * 60 * 1000;

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { analyzed: [] }; }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getRecentCommits(limit = 10) {
  try {
    const out = execSync(`git log -${limit} --pretty=format:"%H|%s|%an|%ar"`, {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    return out.split('\n').filter(Boolean).map(line => {
      const [hash, subject, author, ago] = line.split('|');
      return { hash, subject, author, ago };
    });
  } catch (e) {
    console.error('git log failed:', e.message);
    return [];
  }
}

function getCommitDiff(hash, maxChars = 8000) {
  try {
    return execSync(`git show ${hash} --stat`, { encoding: 'utf8', cwd: REPO_ROOT }).slice(0, maxChars);
  } catch { return ''; }
}

async function askGemma(prompt) {
  // Keep prompt short and use minimal options — Gemma 4 returns empty on complex prompts
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return data.response || '';
}

function extractFiles(diff) {
  // Extract just the file list from stat output
  const lines = diff.split('\n');
  const files = lines
    .filter(l => l.match(/\s\|\s+\d+/))
    .map(l => l.trim().split('|')[0].trim())
    .slice(0, 20);
  return files.join(', ');
}

function buildPrompt(commit, diff) {
  const files = extractFiles(diff);
  return `Review this git commit in one paragraph. Check for: red colors in code, shame language in UI text, animations over 500ms, multiple CTAs. Subject: "${commit.subject}". Files changed: ${files}. Respond with issues found or just say "CLEAN" if no issues.`;
}

async function analyzeCommit(commit) {
  const diff = getCommitDiff(commit.hash);
  if (!diff) return null;
  try {
    return (await askGemma(buildPrompt(commit, diff))).trim();
  } catch (e) {
    return `[ERROR] ${e.message}`;
  }
}

function appendFinding(commit, finding) {
  const header = `\n## ${commit.hash.slice(0, 8)} — ${commit.subject}\n*${commit.author} · ${commit.ago} · ${new Date().toISOString()}*\n\n`;
  fs.appendFileSync(FINDINGS_FILE, header + finding + '\n\n---\n', 'utf8');
}

async function tick() {
  console.log(`[gpu-watcher] ${new Date().toISOString()} checking...`);
  const state = loadState();
  const commits = getRecentCommits(10);
  const fresh = commits.filter(c => !state.analyzed.includes(c.hash));

  if (fresh.length === 0) {
    console.log('[gpu-watcher] no new commits');
    return;
  }

  if (!fs.existsSync(FINDINGS_FILE)) {
    fs.writeFileSync(FINDINGS_FILE, '# GPU Watcher Findings\n\nContinuous Gemma 4 analysis of MindShift commits vs Constitution Laws 1-5.\n');
  }

  console.log(`[gpu-watcher] analyzing ${fresh.length} new commits`);
  for (const commit of fresh) {
    process.stdout.write(`  ${commit.hash.slice(0, 8)} ${commit.subject.slice(0, 60)} ... `);
    const finding = await analyzeCommit(commit);
    if (finding) {
      appendFinding(commit, finding);
      state.analyzed.push(commit.hash);
      saveState(state);
      console.log(finding.split('\n')[0].slice(0, 80));
    } else {
      console.log('(skip)');
    }
  }
}

async function main() {
  console.log(`[gpu-watcher] model=${MODEL} once=${ONCE} root=${REPO_ROOT}`);
  await tick();
  if (ONCE) return;
  setInterval(tick, SLEEP_MS);
  console.log(`[gpu-watcher] perpetual mode, next check in ${SLEEP_MS / 60000}min`);
}

main().catch(e => { console.error('[gpu-watcher] fatal:', e); process.exit(1); });
