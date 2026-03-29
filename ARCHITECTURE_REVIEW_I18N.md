# Architecture Review: MindShift i18n Translation Fix

## CRITICAL ISSUE FOUND: DO NOT RUN translate.mjs WITHOUT FIX

### Executive Summary

The proposed fix to translate 236 Mochi strings to 5 languages has a **critical blocker**: the `translate.mjs` script contains a bug that breaks array deserialization. All 5 non-English locales already have this bug, and running the translation script WILL PERPETUATE IT.

**Current Status:**
- ⚠️ CRITICAL BUG: `unflatten()` in `translate.mjs` breaks array deserialization
- ⚠️ CURRENT IMPACT: All 5 non-English locale files have broken Mochi arrays right now
- ⚠️ RISK: Running translate script without fix will make it permanent

---

## Problem 1: The Core Bug in translate.mjs

### Evidence (Verified 2026-03-29)

Testing all locale files shows a clear pattern:

```
en.json    - phase_release: [ "msg1", "msg2", ... ]  ✓ CORRECT (array)
ru.json    - phase_release: { "0": "msg1", "1": "msg2", ... }  ✗ BROKEN (object)
az.json    - phase_release: { "0": "msg1", "1": "msg2", ... }  ✗ BROKEN (object)
tr.json    - phase_release: { "0": "msg1", "1": "msg2", ... }  ✗ BROKEN (object)
de.json    - phase_release: { "0": "msg1", "1": "msg2", ... }  ✗ BROKEN (object)
es.json    - phase_release: { "0": "msg1", "1": "msg2", ... }  ✗ BROKEN (object)
```

### Root Cause Analysis

**Step 1: `flatten()` converts arrays to numeric-keyed objects**

File: `scripts/translate.mjs` lines 34-45

```javascript
function flatten(obj, prefix = '') {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value, fullKey))  // ← Arrays treated as objects
    } else {
      result[fullKey] = value
    }
  }
  return result
}
```

**Problem:** The condition `typeof value === 'object' && value !== null` matches BOTH objects AND arrays. Arrays should be handled specially.

**Example:**
```
Input:  { "mochi": { "neutral": { "phase_release": ["msg1", "msg2", "msg3"] } } }

After flatten():
  mochi.neutral.phase_release.0 = "msg1"
  mochi.neutral.phase_release.1 = "msg2"
  mochi.neutral.phase_release.2 = "msg3"
```

**Step 2: `unflatten()` doesn't restore arrays from numeric keys**

File: `scripts/translate.mjs` lines 48-60

```javascript
function unflatten(obj) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.')
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = current[parts[i]] || {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value  // ← Always creates object property
  }
  return result
}
```

**Problem:** This function has NO logic to detect that numeric-keyed objects should be converted back to arrays. It just creates nested objects.

**Example:**
```
Input:
  mochi.neutral.phase_release.0 = "msg1"
  mochi.neutral.phase_release.1 = "msg2"
  mochi.neutral.phase_release.2 = "msg3"

After unflatten():
  mochi.neutral.phase_release = {
    "0": "msg1",
    "1": "msg2",
    "2": "msg3"
  }
  ↑ THIS IS AN OBJECT, NOT AN ARRAY
```

---

## Problem 2: Runtime Failure in MochiSessionCompanion

### How the Bug Manifests in Production

File: `src/features/focus/MochiSessionCompanion.tsx` lines 164-168

```javascript
const getPool = useCallback((key: string): string[] => {
  const result = translate(key, { returnObjects: true })
  if (Array.isArray(result)) return result as string[]
  return [translate('mochi.fallback')]  // FALLBACK TRIGGER
}, [translate])
```

### Scenario: Russian User, 7+ Minute Focus Session

1. User starts focus session in Russian locale
2. After 7 minutes, `BUBBLE_TRIGGERS[0]` fires (phase_release trigger)
3. `getFallbackMessage()` calls `getPool('mochi.neutral.phase_release')`
4. i18n library returns: `{"0": "...", "1": "...", "2": "..."}`  (object)
5. `Array.isArray({"0": "msg"})` evaluates to **FALSE**
6. Code returns fallback: `[translate('mochi.fallback')]`
7. User sees: "Все еще здесь с тобой" (same message)

### Impact

- **236 translated Mochi strings become completely inaccessible**
- Mochi shows the same fallback message for every trigger (7m, 15m, 30m, 60m)
- User gets repetitive, boring Mochi experience
- No error in logs (silent failure)
- Developer has no way to know something is wrong

### User Experience Result

```
Session timeline (what user sees):

7 min:  "Все еще здесь с тобой"  (fallback, should be 1 of 10 variants)
15 min: "Все еще здесь с тобой"  (fallback, should be different)
30 min: "Все еще здесь с тобой"  (fallback, should be different)
45 min: "Все еще здесь с тобой"  (fallback, should be different)
60 min: "Все еще здесь с тобой"  (fallback, should be different)

Expected:
7 min:  "Past the hardest part 🌊" or "Your brain needed a minute to warm up"
15 min: "Deep focus. I'm here if you need me 🌙"
30 min: "Half an hour. No matter what happens next, this counted"
45 min: "Still here with you. Steady progress"
60 min: "One full hour 🌟"
```

Mochi feature **completely broken for non-English users**.

---

## Problem 3: Translation Script Will Perpetuate the Bug

### What Happens When You Run: `node scripts/translate.mjs ru`

**Current Broken Workflow:**

1. Script reads `en.json` (phase_release is correct array)
2. Calls `flatten(en)`
   - Converts arrays to `mochi.neutral.phase_release.0/1/2/...`
3. For each flattened key, translates via Google Translate API
   - `mochi.neutral.phase_release.0` → "сообщение1"
   - `mochi.neutral.phase_release.1` → "сообщение2"
   - etc. (236+ API calls)
4. Calls `unflatten(translated)`
   - Recreates broken structure: `{"0": "сообщение1", "1": "сообщение2"}`
5. Writes new `ru.json` with broken arrays

**Result:**
- Wasted 236+ Google Translate API calls
- Slower script execution
- New Russian translations exist but are inaccessible
- **Bug perpetuated forever** until someone manually fixes it or the code

---

## Problem 4: Silent Degradation (Most Dangerous)

### Why This Bug Is Particularly Insidious

1. **No Build Errors**
   - TypeScript compiles fine (JSON structure is valid syntax)
   - Runtime has no errors (objects are valid data structures)

2. **No Runtime Errors**
   - `Array.isArray(obj)` doesn't throw an error
   - Fallback mechanism works as designed
   - Code gracefully falls back to hardcoded message

3. **No Test Coverage**
   - No Playwright tests for non-English locales
   - Tests run in English where arrays ARE correct
   - Fallback message is valid UI (tests pass)
   - No assertion on message variety/content

4. **Silent User Impact**
   - User sees Mochi message (UI looks normal)
   - User doesn't know it's broken (it shows something)
   - User experience is degraded but not obviously broken

5. **Developer Can't Detect It Without Manual Testing**
   - Must manually test each locale
   - Must run focus session >= 7 minutes
   - Must understand Mochi triggers
   - Must know what messages should show
   - Likely never tested this way

**This is the most dangerous type of bug:** everything looks fine until a paying user complains about repetitive Mochi messages.

---

## Problem 5: No Test Coverage for Non-English Mochi

Current test suite only covers English locale:
- E2E tests run in browser default locale (English)
- No explicit locale switching in MochiSessionCompanion tests
- No assertion that `phase_release` is an array
- No validation of message diversity

When `Array.isArray()` check fails, tests still pass because:
- Fallback message still renders (valid HTML)
- UI still works (button still appears)
- No assertion on whether message came from array or fallback

---

## What Breaks When Implemented

### Specific Scenario: Russian User

**Initial State:**
- User account set to Russian locale
- Russian JSON files already have broken arrays (from previous translation)
- User never noticed because they haven't used Russian yet

**Action:**
- User switches app to Russian
- User starts 45-minute deep focus session

**What Happens:**
- 7 min: trigger fires, getPool() called, returns object not array
- Falls back to: "Все еще здесь с тобой"
- 15 min: same message (should be "Deep focus. I'm here if you need me 🌙")
- 30 min: same message (should be "Half an hour...")
- 45 min: same message (should be "45 minutes of sustained focus")

**User Experience:**
- Mochi feels broken/boring/repetitive
- No context-aware personalization
- Feature doesn't feel like it works
- User report: "Mochi just says the same thing over and over"

**Developer Impact:**
- User support tickets about Mochi being broken
- Difficult to diagnose (bug is in JSON, not code)
- Requires full German/Russian/Turkish testing to find
- May get reported as "localization is broken"

---

## All Problems Summary Table

| # | Problem | File | Lines | Severity | Status | Impact |
|---|---------|------|-------|----------|--------|--------|
| 1 | `flatten()` treats arrays as objects | scripts/translate.mjs | 34-45 | CRITICAL | Active | All 236 strings broken |
| 2 | `unflatten()` doesn't restore arrays | scripts/translate.mjs | 48-60 | CRITICAL | Active | Numeric objects persisted |
| 3 | `getPool()` checks `Array.isArray()` | src/features/focus/MochiSessionCompanion.tsx | 164-168 | High | By Design | Falls back when gets object |
| 4 | Silent degradation (no errors) | Entire system | N/A | High | By Design | Bug invisible to devs |
| 5 | No E2E tests for non-English | e2e/ | N/A | Medium | Missing | Bug undetected for duration |
| 6 | Script will perpetuate bug | scripts/translate.mjs | N/A | CRITICAL | Future Risk | Bug becomes permanent |
| 7 | No pre-translation validation | scripts/translate.mjs | N/A | Medium | Missing | No safeguard against arrays |

---

## WHAT YOU MUST DO BEFORE RUNNING translate.mjs

### Step 1: Fix `unflatten()` Function

The fix needs to detect numeric-keyed objects and convert them to arrays.

**Algorithm:**
1. After building the nested object structure (lines 48-60)
2. Walk the entire tree recursively
3. For any object whose keys are ALL numeric (0, 1, 2, ...) and sequential
4. Convert that object to an array with the same values in order

**Pseudocode:**
```javascript
function convertNumericObjectsToArrays(obj) {
  if not an object:
    return obj unchanged

  if all keys are numeric and sequential starting at 0:
    return array of values (recursively converted)

  otherwise:
    return object with all values recursively converted
}

// Apply after unflatten()
return convertNumericObjectsToArrays(result)
```

### Step 2: Test Locally

Create a test to verify arrays survive flatten/unflatten:

```bash
# Create test JSON with arrays
cat > test_arrays.json << 'EOF'
{
  "mochi": {
    "neutral": {
      "phase_release": ["msg1", "msg2", "msg3"],
      "phase_flow": ["flow1", "flow2"]
    }
  }
}
EOF

# Run flatten then unflatten
node -e "
const test = require('./test_arrays.json')
const flat = flatten(test)
const restored = unflatten(flat)
console.log(Array.isArray(restored.mochi.neutral.phase_release))  // Should be true
"
```

### Step 3: Run translate.mjs Only AFTER Fix Verified

```bash
node scripts/translate.mjs ru  # Now creates correct arrays
node scripts/translate.mjs az
node scripts/translate.mjs tr
node scripts/translate.mjs de
node scripts/translate.mjs es
```

### Step 4: Verify Output

```bash
python3 << 'EOF'
import json

for locale in ['en', 'ru', 'az', 'tr', 'de', 'es']:
    with open(f'src/locales/{locale}.json', encoding='utf-8') as f:
        data = json.load(f)
        phase_release = data['mochi']['neutral']['phase_release']
        is_array = isinstance(phase_release, list)
        status = "PASS" if is_array else "FAIL"
        print(f"{locale}: {status}")
EOF
```

All 6 should print `PASS`.

### Step 5: TypeScript Check

```bash
tsc -b
```

### Step 6: E2E Tests

```bash
npx playwright test
```

### Step 7: Commit

```bash
git add scripts/translate.mjs src/locales/
git commit -m "fix: restore arrays in i18n translation script

- translate.mjs flatten() was converting arrays to numeric-keyed objects
- unflatten() was not reversing this transformation
- Added convertNumericObjectsToArrays() to detect and restore arrays
- All non-English locales now have correct array structures for Mochi strings
- Fixes silent fallback issue in MochiSessionCompanion for non-English users"
```

---

## Verification Checklist

Before marking complete:

- [ ] Reviewed translate.mjs fix locally
- [ ] Tested flatten/unflatten with array test case
- [ ] All 6 locales report PASS after translation
- [ ] tsc -b passes
- [ ] npx playwright test passes
- [ ] No hardcoded array indices elsewhere in codebase
- [ ] Git diff shows only translate.mjs and locale files changed
- [ ] Commit message follows conventional format

---

## Risk Assessment

**Current Risk Level: CRITICAL**

If you run `translate.mjs` WITHOUT fixing `unflatten()`:
- **Severity:** User-facing feature broken
- **Scope:** 236 strings × 5 languages, all Mochi bubbles fail silently
- **Duration:** Persists until manual JSON fix or code rewrite
- **Detectability:** Hard (requires manual testing each language with timed triggers)
- **Blast Radius:** All non-English users affected

**After Fix Applied:**
- **Risk Eliminated:** Arrays preserved through entire pipeline
- **Build Safe:** tsc validates, E2E validates
- **User Safe:** All 236 Mochi strings accessible in all languages

---

## Files Affected

- **To Fix:** `/c/Users/user/Downloads/mindshift/scripts/translate.mjs` (lines 48-60)
- **To Update:** `/c/Users/user/Downloads/mindshift/src/locales/{ru,az,tr,de,es}.json`
- **Potentially Helpful:** Add E2E test for non-English Mochi behavior

---

## Questions Answered

**Q: What's the bug in the current code?**
A: `flatten()` converts arrays to numeric-keyed objects. `unflatten()` doesn't convert them back.

**Q: When does it break?**
A: When a non-English user reaches 7+ minute mark in focus session and Mochi tries to show a message.

**Q: Why hasn't this been noticed?**
A: No one has tested non-English locales with timed focus sessions. The fallback message still works, so there's no error.

**Q: What happens if I run translate.mjs now?**
A: You'll get 236+ translated strings but they'll be inaccessible. Script perpetuates the bug.

**Q: How do I fix it?**
A: Add post-processing to convert numeric-keyed objects back to arrays after unflattening.

---

**Document Generated:** 2026-03-29
**Status:** REVIEW COMPLETE — DO NOT PROCEED WITH translate.mjs UNTIL FIX APPLIED
