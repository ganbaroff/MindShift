// conveyor_worker.mjs — queue poller for content briefs.
// Claims and runs briefs in runnable states (brief_ok, script_ok, voice_ok, qa_pass).
//
// Runs BOTH locally and in CI:
//   node conveyor_worker.mjs            # process ONE oldest runnable brief, then exit
//   node conveyor_worker.mjs --drain    # process ALL runnable briefs, then exit
//
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { requireEnv, PROJECT_ROOT } from './env.mjs';

const MOCK = process.env.PULT_MOCK === '1' || process.argv.includes('--mock-db');
const DRAIN = process.argv.includes('--drain');

let SUPA_URL, SVC_KEY, REST;
if (!MOCK) {
  SUPA_URL = requireEnv('VITE_SUPABASE_URL');
  SVC_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  REST = `${SUPA_URL}/rest/v1/pult_briefs`;
}

// REST helper
async function rest(method, query, body) {
  const r = await fetch(`${REST}${query}`, {
    method,
    headers: {
      apikey: SVC_KEY,
      Authorization: `Bearer ${SVC_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  return { ok: r.ok, status: r.status, data: txt ? JSON.parse(txt) : [] };
}

async function getRunnableBriefs() {
  if (MOCK) {
    if (existsSync('briefs/mock_db.json')) {
      const db = JSON.parse(readFileSync('briefs/mock_db.json', 'utf8'));
      return Object.values(db).filter(r => 
        ['brief_ok', 'script_ok', 'voice_ok', 'qa_pass'].includes(r.state)
      ).sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''));
    }
    return [];
  }

  const q = `?state=in.(brief_ok,script_ok,voice_ok,qa_pass)&order=created_at.asc`;
  const { ok, data } = await rest('GET', q);
  return ok ? data : [];
}

async function run() {
  console.log('[conveyor_worker] polling active briefs...');
  const briefs = await getRunnableBriefs();
  
  if (briefs.length === 0) {
    console.log('[conveyor_worker] no runnable briefs found.');
    return;
  }

  console.log(`[conveyor_worker] found ${briefs.length} runnable brief(s).`);

  const targetBriefs = DRAIN ? briefs : briefs.slice(0, 1);

  for (const b of targetBriefs) {
    console.log(`\n[conveyor_worker] processing brief=${b.id} state=${b.state}`);
    try {
      // conveyor.mjs does all the state-specific execution and validation steps.
      // We pass the mock env variable if in mock mode.
      const env = { ...process.env };
      if (MOCK) {
        env.PULT_MOCK = '1';
      }
      execFileSync('node', ['conveyor.mjs', '--store=db', `--brief-id=${b.id}`], {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
        env
      });
      console.log(`[conveyor_worker] successfully processed brief=${b.id}`);
    } catch (e) {
      console.error(`[conveyor_worker] failed processing brief=${b.id}: ${e.message}`);
      // In non-drain mode, we exit immediately on first error
      if (!DRAIN) {
        process.exit(1);
      }
    }
  }
}

run().catch(e => {
  console.error(`[conveyor_worker] fatal crash: ${e.message}`);
  process.exit(1);
});
