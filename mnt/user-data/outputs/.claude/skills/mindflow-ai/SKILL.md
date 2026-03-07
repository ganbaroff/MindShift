---
name: mindflow-ai
description: "MindFlow Gemini AI integration rules. Use when writing, editing, or debugging any AI prompts, Gemini API calls, or AI response parsing in MindFlow."
---

# MindFlow AI Rules

## Gemini Setup

```typescript
const GEMINI_KEY = "AIzaSyDYT68Kkb5Xa1Y050-CCiJ1PPhHFXdPPAc"
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`

async function geminiFetch(prompt: string): Promise<string> {
  const r = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    })
  })
  if (!r.ok) throw new Error(`Gemini ${r.status}`)
  const d = await r.json()
  return d.candidates?.[0]?.content?.parts?.[0]?.text || ""
}
```

## Three AI Functions

### 1. aiParse — Brain dump → structured thoughts
- Input: raw text + language
- Output: `{ items: ThoughtItem[], response: string }`
- JSON response only — always strip ```json fences before parse
- Max 10 items per parse
- Fallback: if JSON parse fails → treat entire text as single note

### 2. aiReflection — Evening coach message
- Input: done count, missed count, language
- Output: plain text, 100-120 words
- Tone: warm, ADHD-aware, non-judgmental
- No headers, no bullet points — only paragraphs

### 3. aiFocus — Today's task prioritization
- Input: active tasks array (max 20), language  
- Output: `{ picks: string[], reason: string }`
- Exactly 3 picks
- ADHD strategy: balance urgency + curiosity + quick wins

## Prompt Rules

1. Always specify language in prompt: `"Respond in ${langName}"`
2. Always say "Return ONLY JSON, no markdown, no explanation"
3. Always parse with: `raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()`
4. Wrap all Gemini calls in try/catch with graceful fallback
5. Never show raw API errors to user — show friendly message

## Supported Languages

```typescript
const LANG_NAMES = { en: "English", ru: "Russian", az: "Azerbaijani" }
```

## Future: Streaming

When adding streaming responses (typing effect):
```typescript
// Use gemini-2.0-flash-streaming endpoint
// Show text progressively as it arrives
// Only for aiReflection (long text) — not aiParse (needs full JSON)
```
