// validate_brief.test.mjs — Test suite for brief and episode validation gates.
import { validateBrief, validateEpisodes } from './validate_brief.mjs';

let pass = 0, fail = 0;
const ok = (n) => { console.log(`  ✓ ${n}`); pass++; };
const bad = (n, e) => { console.log(`  ✗ ${n} — ${e}`); fail++; };

function assertValid(name, result) {
  if (result.valid) {
    ok(name);
  } else {
    bad(name, `Expected valid, got errors: ${result.errors.join(', ')}`);
  }
}

function assertInvalid(name, result, expectedKeyword) {
  if (!result.valid) {
    const matched = result.errors.some(err => err.toLowerCase().includes(expectedKeyword.toLowerCase()));
    if (matched) {
      ok(name);
    } else {
      bad(name, `Expected error containing "${expectedKeyword}", but got errors: ${result.errors.join(', ')}`);
    }
  } else {
    bad(name, `Expected invalid, but it passed successfully!`);
  }
}

// ── Test Data ──

const baseBrief = {
  brief_id: "test-uuid-12345",
  created_by: "ceo-telegram",
  format: "ladder",
  duration_target_sec: 60,
  duration_tolerance_sec: 8,
  voice: "Algieba",
  style: "Warm host style",
  language: "en",
  topic: "llm-basics",
  source_material: "bank:llm-basics",
  cta: "subscribe",
  n_items: 5,
  state: "draft",
  approvals: {
    brief: null,
    script: null,
    voice_sample: null,
    final: null
  }
};

const makeValidEpisodes = (n = 5) => {
  const eps = [];
  const correctIdPool = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < n; i++) {
    eps.push({
      rung: i + 1,
      startLit: i,
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
        { id: 'C', text: 'Option C' },
        { id: 'D', text: 'Option D' }
      ],
      correctId: correctIdPool[i % correctIdPool.length], // will vary: A, B, C, D, A
      vo: {
        bridge: i < n - 1 ? "Keep moving up!" : "",
        cta: i === n - 1 ? "Follow for more!" : ""
      }
    });
  }
  return eps;
};

console.log('--- Brief Validation Checks ---');
assertValid('Valid base brief', validateBrief(baseBrief));

const voiceOverrideBrief = { ...baseBrief, voice: "Procyon" };
assertInvalid('Factory Law 6: Reject Procyon voice', validateBrief(voiceOverrideBrief), 'Locked to "Algieba"');

const missingCtaBrief = { ...baseBrief, cta: "" };
assertInvalid('Reject empty CTA', validateBrief(missingCtaBrief), 'cta must be a non-empty string');


console.log('\n--- Episode Distribution & Layout Validation Checks ---');
assertValid('Valid 5-rung episode set (diverse correctIds)', validateEpisodes(makeValidEpisodes(5), baseBrief));

// Test All-A distribution failure
const allAEpisodes = makeValidEpisodes(5);
allAEpisodes.forEach(ep => ep.correctId = 'A');
assertInvalid('Reject uniform correctIds (all-A)', validateEpisodes(allAEpisodes, baseBrief), 'distribution violation');

// Test startLit order check
const badLitEpisodes = makeValidEpisodes(5);
badLitEpisodes[2].startLit = 0; // expected 2
assertInvalid('Reject out-of-order startLit', validateEpisodes(badLitEpisodes, baseBrief), 'startLit must be 2');

// Test bridge placement check
const badBridgeEpisodes = makeValidEpisodes(5);
badBridgeEpisodes[4].vo.bridge = "Oops, last rung has bridge!";
assertInvalid('Reject bridge on last rung', validateEpisodes(badBridgeEpisodes, baseBrief), 'bridge must be empty for the last rung');

// Test cta placement check
const badCtaEpisodes = makeValidEpisodes(5);
badCtaEpisodes[0].vo.cta = "CTA on rung 1!";
assertInvalid('Reject CTA on non-last rung', validateEpisodes(badCtaEpisodes, baseBrief), 'cta must be empty for non-last rungs');

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
