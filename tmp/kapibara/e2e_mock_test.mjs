// e2e_mock_test.mjs — Hermetic E2E test for conveyor state machine.
// Walks a test brief from draft to delivered in mock DB mode.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const MOCK_FILE = 'briefs/mock_db.json';
const TEST_ID = 'test-uuid-12345';

function cleanup() {
  if (existsSync(MOCK_FILE)) {
    rmSync(MOCK_FILE, { force: true });
  }
}

function loadDb() {
  return JSON.parse(readFileSync(MOCK_FILE, 'utf8'));
}

function saveDb(db) {
  writeFileSync(MOCK_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function runPoller() {
  execFileSync('node', ['conveyor_worker.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, PULT_MOCK: '1' }
  });
}

async function main() {
  console.log('--- STARTING HERMETIC CONVEYOR E2E TEST ---');
  cleanup();

  // 1. Bootstrap: loading the brief for the first time will create the mock db row in 'draft'
  console.log('\n[E2E] Bootstrapping mock brief...');
  execFileSync('node', ['conveyor.mjs', '--store=db', `--brief-id=${TEST_ID}`], {
    stdio: 'inherit',
    env: { ...process.env, PULT_MOCK: '1' }
  });

  let db = loadDb();
  let row = db[TEST_ID];
  if (row.state !== 'draft') {
    throw new Error(`Expected initial state 'draft', got: ${row.state}`);
  }
  console.log(`[E2E] Bootstrap OK. Initial state: ${row.state}`);

  // 2. Approve brief -> brief_ok
  console.log('\n[E2E] Approving brief...');
  db[TEST_ID].brief.approvals.brief = 'approved';
  db[TEST_ID].state = 'brief_ok';
  db[TEST_ID].updated_at = new Date().toISOString();
  saveDb(db);

  // 3. Run worker -> scripted
  console.log('\n[E2E] Running poller to generate scripts...');
  runPoller();
  db = loadDb();
  if (db[TEST_ID].state !== 'scripted') {
    throw new Error(`Expected state 'scripted', got: ${db[TEST_ID].state}`);
  }
  console.log(`[E2E] Scripting OK. State: ${db[TEST_ID].state}`);

  // 4. Approve script -> script_ok
  console.log('\n[E2E] Approving script...');
  db[TEST_ID].brief.approvals.script = 'approved';
  db[TEST_ID].state = 'script_ok';
  db[TEST_ID].updated_at = new Date().toISOString();
  saveDb(db);

  // 5. Run worker -> voiced (TTS and voice compilation)
  console.log('\n[E2E] Running poller to synthesize audio...');
  runPoller();
  db = loadDb();
  if (db[TEST_ID].state !== 'voiced') {
    throw new Error(`Expected state 'voiced', got: ${db[TEST_ID].state}`);
  }
  console.log(`[E2E] Voicing OK. State: ${db[TEST_ID].state}`);

  // 6. Approve voice sample -> voice_ok
  console.log('\n[E2E] Approving voice sample...');
  db[TEST_ID].brief.approvals.voice_sample = 'approved';
  db[TEST_ID].state = 'voice_ok';
  db[TEST_ID].updated_at = new Date().toISOString();
  saveDb(db);

  // 7. Run worker -> rendered -> qa_pass -> delivered
  console.log('\n[E2E] Running poller to render and deliver...');
  runPoller(); // voice_ok -> rendered (which immediately transitions to qa_pass because loop is changed=true)
  runPoller(); // qa_pass -> delivered
  
  db = loadDb();
  if (db[TEST_ID].state !== 'delivered') {
    throw new Error(`Expected state 'delivered', got: ${db[TEST_ID].state}`);
  }
  console.log(`[E2E] Rendering and Delivery OK. State: ${db[TEST_ID].state}`);

  cleanup();
  console.log('\n[E2E] --- ALL E2E TESTS PASSED SUCCESSFULLY! ---');
}

main().catch(e => {
  console.error(`\n[E2E] ✗ TEST FAILED: ${e.message}`);
  cleanup();
  process.exit(1);
});
