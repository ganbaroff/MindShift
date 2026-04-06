# WIP: CI is broken — edge functions not deploying

## Root cause (dual)
1. **Lint errors**: 30 errors in CI → build step fails → edge deploy never triggers
2. **Missing secrets**: SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_ID were not set

## Secret status (FIXED)
- SUPABASE_ACCESS_TOKEN: ✅ set (sbp_601f...1e57, token "mindshift-ci")
- SUPABASE_PROJECT_ID: ✅ set (awfoqycoltvhamtrsvxk)

## Lint errors (30 remaining)
Most are no-unused-vars and no-useless-escape in:
- src/shared/lib/quickParse.ts (3 useless-escape)
- src/store/index.ts (_version unused)
- supabase/functions/scheduled-push/index.ts (base64UrlDecode unused)
- Plus ~26 others from previous chat's code

## Impact
- Edge functions (classify-voice-input, decompose-task, mochi-respond) not updated since before April 1
- Voice input, task decomposition, AI Mochi may use old versions
- New features (crisis detection, categories, etc.) not deployed

## Fix needed
- Fix all 30 lint errors → push → CI passes → edge deploy triggers → functions update
