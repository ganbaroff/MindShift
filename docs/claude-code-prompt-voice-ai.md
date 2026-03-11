# Voice AI Improvement — Claude Code Verification Prompt

## Context
Cowork session wrote all code changes for the Voice AI improvement sprint.
Your job: **verify, fix type errors, run tests, ensure nothing is broken.**

Branch: `main` (current HEAD).
Changes were made to these files:

### New files
1. `src/shared/lib/voiceClassify.ts` — extracted `ClassifyResult` type + `parseClassifyResult()` + `isLowConfidence()` + `CONFIDENCE_THRESHOLD`
2. `src/shared/lib/__tests__/voiceClassify.test.ts` — 20+ test cases covering:
   - Happy path (task/idea/reminder, EN + RU)
   - Auto-correction (invalid pool, clamped minutes, fallback title, truncation)
   - Garbage input (null, undefined, string, empty object, error responses)
   - Confidence threshold logic
   - Routing test phrases (11 representative inputs)

### Modified files
3. `supabase/functions/classify-voice-input/index.ts` — Gemini prompt improvements:
   - Added `confidence` field (0.0-1.0) to prompt schema
   - Added 5 few-shot examples (EN + RU + ambiguous)
   - Added explicit multilingual instruction: "Return title in same language as input"
   - Added `confidence` to validation/sanitization block
   - JSON parse fallback now returns `confidence: 0.3` (low)
   - Updated parsed type to include `confidence`

4. `src/features/tasks/AddTaskModal.tsx` — Client-side integration:
   - Replaced inline `ClassifyResult` interface with import from `voiceClassify.ts`
   - `classifyVoice()` now uses `parseClassifyResult()` for runtime validation
   - Added `lowConfidence` state + `voiceTranscript` state
   - Low confidence (< 0.7) → shows type picker UI ("What is this? Task / Idea / Reminder")
   - Empty transcript → toast "Nothing captured — try again in a quiet spot"
   - Voice error → toast "Voice input stopped — you can type instead"
   - Unsupported browser → shows disabled mic with tooltip instead of hiding
   - Error fallback message changed from aggressive to gentle: "Recorded your note — edit the details below"
   - Mochi branding on spinner: "Mochi is thinking…"
   - `resetAndClose()` now clears `lowConfidence` + `voiceTranscript`

## Verification Steps

### Step 1: Type check
```bash
npx tsc --noEmit
```
Fix any type errors. Key things to watch:
- `ClassifyResult` now has a `confidence` field — make sure AddTaskModal's usage is compatible
- The `parseClassifyResult` return type includes `confidence` — verify `handleSaveVoiceResult` still works
- The `voiceResult` state is now `ClassifyResult | null` (with confidence) — check all references

### Step 2: Run all tests
```bash
npx vitest run
```
Expected: All existing 82 tests pass + new `voiceClassify.test.ts` tests pass.
If a test fails, fix the issue — don't skip it.

### Step 3: Full build
```bash
npm run build
```
Verify clean build with no warnings.

### Step 4: Manual review checklist
- [ ] `voiceClassify.ts` exports: `ClassifyResult`, `parseClassifyResult`, `isLowConfidence`, `CONFIDENCE_THRESHOLD`
- [ ] `AddTaskModal.tsx` imports from `@/shared/lib/voiceClassify` (not inline type)
- [ ] Edge function returns `confidence` field in all code paths (success + JSON parse fallback)
- [ ] Low confidence UI shows 3 buttons (Task/Idea/Reminder) with gold border
- [ ] Selecting "Idea" in low-confidence picker auto-saves to Someday
- [ ] Unsupported browser shows disabled mic button (not hidden)
- [ ] `resetAndClose()` clears `lowConfidence` and `voiceTranscript`

### Step 5: Potential fixes needed
If `tsc` complains about `ClassifyResult` missing from import — check that `voiceClassify.ts` has `export interface ClassifyResult` (it should).

If the `handleSaveVoiceResult` function doesn't work with the new `ClassifyResult` (which now has `confidence`) — the extra field is harmless since it's not saved to DB. No changes needed.

If tests fail on `parseClassifyResult` with negative `estimatedMinutes` — the function uses `Number.isFinite(rawMin) && rawMin > 0` which correctly returns false for negative values, falling through to default.

## Design Rules (do NOT violate)
- No red anywhere (Research #8)
- Low confidence border: gold (#F59E0B) — warm, non-alarming
- Toast messages: gentle, non-shaming ("Recorded your note" not "Error")
- All buttons: min 44px touch target
- motion-reduce: respect `animate-spin` → `motion-reduce:animate-none`

## After verification
```bash
git add src/shared/lib/voiceClassify.ts src/shared/lib/__tests__/voiceClassify.test.ts src/features/tasks/AddTaskModal.tsx supabase/functions/classify-voice-input/index.ts
git commit -m "feat(voice): confidence scoring, runtime validation, low-confidence fallback UI

- Extract ClassifyResult + parseClassifyResult to shared/lib/voiceClassify.ts
- Add 20+ unit tests for classification routing (EN + RU, edge cases)
- Improve Gemini prompt: few-shot examples, multilingual, confidence field
- Low confidence (<0.7) shows type picker instead of auto-classifying
- Empty transcript / voice error: gentle toast instead of silence
- Unsupported browser: disabled mic with tooltip instead of hidden
- Runtime validation prevents crashes on malformed API responses"
```
