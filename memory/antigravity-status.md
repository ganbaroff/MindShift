# Antigravity Status Card
**Date:** 2026-06-24

## Receipts
- Updated root `.gitignore` to use granular exclusions instead of blanket `android/` exclusion, allowing tracking of native Android resources.
- Staged all 5 native localization files (`values-ru/az/tr/de/es/strings.xml`) and the push notification monochrome icon (`drawable/ic_stat_mindshift.xml`) to Git.
- Verified that "MindShift" is a brand name and trademark, and is intentionally identical (untranslated) across all locales (matching the web i18n implementation in `ru.json`, etc.).
- Ran `tsc -b`: Success (no errors).
- Ran `npm run test`: Success (227 tests passed).

## Blockers
- **Owner-only:** Google Play account verification is ⏳ pending. Push notification pg_cron activation needs manual Supabase Dashboard action.

## Next Step
- Pending review of the Git tracking fixes.

## Lesson
- When dealing with multi-project architectures (like Capacitor/React), blanket ignores of subdirectory wrappers (e.g. `android/`) will hide native source changes. Use granular ignores so native configurations can be committed and tracked.
