// brief_store.mjs — DB adapter for public.pult_briefs.
// Supports both live REST (PostgREST) and mock offline storage for testing/CI.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { requireEnv } from './env.mjs';

const MOCK = process.env.PULT_MOCK === '1' || process.argv.includes('--mock-db');

let SUPA_URL, SVC_KEY, REST;
if (!MOCK) {
  SUPA_URL = requireEnv('VITE_SUPABASE_URL');
  SVC_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  REST = `${SUPA_URL}/rest/v1/pult_briefs`;
}

// Memory db for mock
let mockDb = {};
const MOCK_FILE = 'briefs/mock_db.json';

function loadMockDb() {
  if (existsSync(MOCK_FILE)) {
    try { mockDb = JSON.parse(readFileSync(MOCK_FILE, 'utf8')); } catch {}
  }
}

function saveMockDb() {
  writeFileSync(MOCK_FILE, JSON.stringify(mockDb, null, 2), 'utf8');
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

export async function loadBrief(id) {
  if (MOCK) {
    loadMockDb();
    if (!mockDb[id]) {
      // Bootstrap from local test brief if it exists
      if (existsSync('briefs/test-ladder.json')) {
        const brief = JSON.parse(readFileSync('briefs/test-ladder.json', 'utf8'));
        mockDb[id] = {
          id,
          chat_id: 5150355926,
          state: brief.state,
          brief,
          episodes: brief.episodes || [],
          receipts: brief.receipts || {},
          rework_reason: brief.rework_reason || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        saveMockDb();
      } else {
        throw new Error(`[brief_store] mock brief ${id} not found and no template exists`);
      }
    }
    return mockDb[id];
  }

  const { ok, data, status } = await rest('GET', `?id=eq.${id}`);
  if (!ok || data.length === 0) {
    throw new Error(`[brief_store] Failed to load brief ${id}: status=${status}`);
  }
  return data[0];
}

export async function saveBrief(id, updates) {
  if (MOCK) {
    loadMockDb();
    if (!mockDb[id]) mockDb[id] = { id };
    Object.assign(mockDb[id], updates, { updated_at: new Date().toISOString() });
    saveMockDb();
    return mockDb[id];
  }

  const { ok, data, status } = await rest('PATCH', `?id=eq.${id}`, {
    ...updates,
    updated_at: new Date().toISOString()
  });
  if (!ok || data.length === 0) {
    throw new Error(`[brief_store] Failed to save brief ${id}: status=${status}`);
  }
  return data[0];
}

export async function claimBrief(id, expectedState, targetState) {
  if (MOCK) {
    loadMockDb();
    const row = mockDb[id];
    if (row && row.state === expectedState) {
      row.state = targetState;
      row.updated_at = new Date().toISOString();
      saveMockDb();
      return row;
    }
    return null; // mismatch/already claimed
  }

  const { ok, data } = await rest('PATCH', `?id=eq.${id}&state=eq.${expectedState}`, {
    state: targetState,
    updated_at: new Date().toISOString()
  });
  return ok && data.length ? data[0] : null;
}
