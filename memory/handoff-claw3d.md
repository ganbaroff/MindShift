# Handoff: Claw3D Virtual Office for ZEUS Agents

**Priority:** HIGH
**Date:** 2026-04-06
**Repo cloned:** C:\Users\user\Downloads\claw3d-fork

## VERIFIED: What Claw3D Actually Is

- Next.js 16 + React Three Fiber + Drei (3D)
- WebSocket server (`server/demo-gateway-adapter.js`, 513 lines)
- MIT license, 505+ stars
- Runs with `npm run dev` + `npm run demo-gateway`

## THE KEY FILE: server/demo-gateway-adapter.js

This is a standalone WebSocket server that feeds agents to the 3D office.
It has 3 mock agents. We need 47 real ones.

Agent data structure (line 10-40):
```javascript
const agents = new Map([
  ["agent-id", {
    id: "agent-id",
    name: "Display Name",
    role: "Role Title",
    workspace: "/path/to/workspace"
  }]
])
```

WebSocket protocol:
- Events: chat, presence, heartbeat
- Methods: status, skills.status, chat/send, runs/start, runs/status
- Port: 18789 (configurable via DEMO_ADAPTER_PORT)

## EXACT STEPS

### Step 1: Install and run demo (5 min)
```bash
cd C:\Users\user\Downloads\claw3d-fork
npm install
npm run demo-gateway &   # starts WebSocket on :18789
npm run dev              # starts Next.js on :3000
```
Open http://localhost:3000 — should see 3D office with 3 demo agents.

### Step 2: Create zeus-gateway-adapter.js (30 min)
Copy `server/demo-gateway-adapter.js` → `server/zeus-gateway-adapter.js`

Replace the `agents` Map with 47 ZEUS agents.
Source: C:\Projects\VOLAURA\memory\swarm\agent-roster.md

Agent mapping:
```javascript
const agents = new Map([
  ["security-agent", { id: "security-agent", name: "Security Agent", role: "Security Expert (9.0/10)", workspace: "/volaura/security" }],
  ["architecture-agent", { id: "architecture-agent", name: "Architecture Agent", role: "System Architect (8.5/10)", workspace: "/volaura/architecture" }],
  ["product-agent", { id: "product-agent", name: "Product Agent", role: "Product Analyst (8.0/10)", workspace: "/volaura/product" }],
  // ... all 47 from agent-roster.md
])
```

### Step 3: Connect to real ZEUS status (1-2 hours)
Read agent status from:
- C:\Projects\VOLAURA\memory\swarm\agent-roster.md (static: name, role, score)
- C:\Projects\VOLAURA\memory\swarm\daily-health-log.md (dynamic: active/idle)
- C:\Projects\VOLAURA\memory\swarm\autonomous-output/ (completed tasks)

On WebSocket `status` request → read these files → return real agent state.

### Step 4: Add npm script to package.json
```json
"zeus-gateway": "node server/zeus-gateway-adapter.js"
```

### Step 5: Test
```bash
npm run zeus-gateway &
npm run dev
```
Open localhost:3000 — see 47 ZEUS agents in 3D office with real status.

## WHAT NOT TO DO
- Don't change the 3D rendering code (React Three Fiber) — it works
- Don't change the WebSocket protocol — just change the data
- Don't try to connect to Railway API yet — start with local file reading
- Don't install OpenClaw Gateway — we're replacing it

## FILES TO READ
1. This file
2. C:\Projects\VOLAURA\memory\swarm\agent-roster.md (47 agents)
3. C:\Users\user\Downloads\claw3d-fork\server\demo-gateway-adapter.js (513 lines — THE file to copy and modify)
4. C:\Users\user\Downloads\claw3d-fork\README.md (install instructions)
