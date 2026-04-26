#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MindShift — Direct APK Sideload Build Script
#
# CEO directive 2026-04-26: Google Play Developer аккаунт в блоке (реджектят
# документы). P0 pivot — Direct APK Sideloading на CEO-устройство для
# internal testing. Локальные данные (память / стейт / токены) ДОЛЖНЫ
# сохраняться при накатывании новых версий.
#
# What this script does (in order):
#   1. Loads keystore env vars from .env (MINDSHIFT_KEYSTORE_*).
#   2. Verifies keystore exists at MINDSHIFT_KEYSTORE_PATH (or default
#      android/app/release.keystore).
#   3. Reads current versionCode + versionName from android/app/build.gradle.
#   4. Auto-increments versionCode by 1 (in-place edit), so each install is
#      treated as an upgrade, NOT a fresh install (data preserved).
#   5. Optionally syncs Capacitor (npx cap sync android) if --sync passed.
#   6. Runs ./gradlew assembleRelease (or gradlew.bat on Windows / Git Bash).
#   7. Copies app-release.apk → repo root as
#      mindshift-v<versionName>-<versionCode>.apk.
#   8. Prints SHA-256 + size for sanity check before sending via Telegram.
#
# Why data is preserved (Android signature contract):
#   - applicationId stays "com.mindshift.app" (build.gradle line 7).
#   - Same signing keystore (same SHA fingerprint) → Android treats new APK
#     as an upgrade of existing app, not a different app. App data dir
#     /data/data/com.mindshift.app/* survives.
#   - Different keystore = different signature = Android refuses the install
#     ("App not installed") OR (if user uninstalls first) data is wiped.
#   - DO NOT lose the keystore. No keystore = no future updates ever for this
#     installed APK. (For Play Store this is permanent; for sideload at least
#     CEO can uninstall + install fresh, but loses local state in the process.)
#
# Usage:
#   bash scripts/build_apk.sh              # build only
#   bash scripts/build_apk.sh --sync       # npx cap sync first, then build
#   bash scripts/build_apk.sh --no-bump    # skip versionCode increment
#                                          # (rebuild same version, only safe
#                                          # when no APK was distributed yet)
#
# Required ENV (in .env at repo root, or exported in shell):
#   MINDSHIFT_KEYSTORE_PATH       — absolute path to release.keystore
#                                   (default: android/app/release.keystore)
#   MINDSHIFT_KEYSTORE_PASSWORD   — store password
#   MINDSHIFT_KEY_ALIAS           — key alias
#   MINDSHIFT_KEY_PASSWORD        — key password
#
# Exit codes:
#   0  — build succeeded, APK at repo root
#   2  — env vars missing
#   3  — keystore file missing
#   4  — gradle build failed
#   5  — APK output missing after gradle reported success
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Resolve repo root (script lives in <repo>/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

BUILD_GRADLE="android/app/build.gradle"
APK_OUTPUT_DIR="android/app/build/outputs/apk/release"

# ── Args ─────────────────────────────────────────────────────────────────────
SYNC_FIRST=0
BUMP_VERSION=1
for arg in "$@"; do
  case "$arg" in
    --sync)     SYNC_FIRST=1 ;;
    --no-bump)  BUMP_VERSION=0 ;;
    *) echo "[build_apk] unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Load .env ────────────────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^MINDSHIFT_' .env | sed 's/\r$//')
  set +a
fi

# ── Verify required env ──────────────────────────────────────────────────────
missing=()
[[ -z "${MINDSHIFT_KEYSTORE_PASSWORD:-}" ]] && missing+=("MINDSHIFT_KEYSTORE_PASSWORD")
[[ -z "${MINDSHIFT_KEY_ALIAS:-}" ]]         && missing+=("MINDSHIFT_KEY_ALIAS")
[[ -z "${MINDSHIFT_KEY_PASSWORD:-}" ]]      && missing+=("MINDSHIFT_KEY_PASSWORD")
if (( ${#missing[@]} > 0 )); then
  echo "[build_apk] ERROR: missing env var(s): ${missing[*]}"
  echo "[build_apk] Add them to .env or export them before re-running."
  exit 2
fi

# Resolve keystore path
KEYSTORE_PATH="${MINDSHIFT_KEYSTORE_PATH:-${REPO_ROOT}/android/app/release.keystore}"
if [[ ! -f "${KEYSTORE_PATH}" ]]; then
  echo "[build_apk] ERROR: keystore not found at ${KEYSTORE_PATH}"
  echo "[build_apk] Set MINDSHIFT_KEYSTORE_PATH to the absolute path or"
  echo "[build_apk] place the keystore at android/app/release.keystore."
  exit 3
fi
export MINDSHIFT_KEYSTORE_PATH="${KEYSTORE_PATH}"

# ── Read current version ─────────────────────────────────────────────────────
read_version_code() {
  grep -E '^[[:space:]]*versionCode[[:space:]]+[0-9]+' "${BUILD_GRADLE}" \
    | head -n1 | awk '{print $2}'
}
read_version_name() {
  grep -E '^[[:space:]]*versionName[[:space:]]+"' "${BUILD_GRADLE}" \
    | head -n1 | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/'
}

current_code="$(read_version_code)"
current_name="$(read_version_name)"

if [[ -z "${current_code}" || -z "${current_name}" ]]; then
  echo "[build_apk] ERROR: could not parse versionCode/versionName from ${BUILD_GRADLE}"
  exit 4
fi

# ── Bump versionCode ─────────────────────────────────────────────────────────
if (( BUMP_VERSION == 1 )); then
  new_code=$((current_code + 1))
  echo "[build_apk] Bumping versionCode: ${current_code} → ${new_code}"
  # Cross-platform sed (BSD sed on Mac uses -i ''; GNU sed and Git-Bash sed use -i)
  if sed --version >/dev/null 2>&1; then
    sed -i -E "s/(^[[:space:]]*versionCode[[:space:]]+)${current_code}([[:space:]]*$)/\1${new_code}\2/" "${BUILD_GRADLE}"
  else
    sed -i '' -E "s/(^[[:space:]]*versionCode[[:space:]]+)${current_code}([[:space:]]*\$)/\1${new_code}\2/" "${BUILD_GRADLE}"
  fi
  current_code="${new_code}"
else
  echo "[build_apk] --no-bump: keeping versionCode at ${current_code}"
fi

echo "[build_apk] Building MindShift v${current_name} (versionCode ${current_code})"
echo "[build_apk] Keystore: ${KEYSTORE_PATH}"

# ── Capacitor sync (optional) ────────────────────────────────────────────────
if (( SYNC_FIRST == 1 )); then
  echo "[build_apk] Running: npm run build && npx cap sync android"
  npm run build
  npx cap sync android
fi

# ── Choose gradlew flavor (Linux/Mac vs Windows Git-Bash) ────────────────────
if [[ "${OS:-}" == "Windows_NT" || "$(uname -s 2>/dev/null)" =~ MINGW|MSYS|CYGWIN ]]; then
  GRADLEW_CMD="./gradlew.bat"
else
  GRADLEW_CMD="./gradlew"
fi

# ── Run gradle ───────────────────────────────────────────────────────────────
pushd android > /dev/null
echo "[build_apk] Running: ${GRADLEW_CMD} assembleRelease"
if ! "${GRADLEW_CMD}" assembleRelease; then
  popd > /dev/null
  echo "[build_apk] ERROR: gradle assembleRelease failed"
  exit 4
fi
popd > /dev/null

# ── Copy APK to repo root with versioned name ────────────────────────────────
SOURCE_APK="${APK_OUTPUT_DIR}/app-release.apk"
if [[ ! -f "${SOURCE_APK}" ]]; then
  echo "[build_apk] ERROR: expected APK not found at ${SOURCE_APK}"
  echo "[build_apk] Check ${APK_OUTPUT_DIR} for actual output filename."
  exit 5
fi

OUTPUT_NAME="mindshift-v${current_name}-${current_code}.apk"
cp "${SOURCE_APK}" "${REPO_ROOT}/${OUTPUT_NAME}"

# ── Sanity ───────────────────────────────────────────────────────────────────
APK_SIZE_BYTES="$(wc -c < "${REPO_ROOT}/${OUTPUT_NAME}" | tr -d ' ')"
APK_SIZE_MB="$(awk "BEGIN { printf \"%.2f\", ${APK_SIZE_BYTES}/1024/1024 }")"

if command -v sha256sum >/dev/null 2>&1; then
  APK_SHA="$(sha256sum "${REPO_ROOT}/${OUTPUT_NAME}" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  APK_SHA="$(shasum -a 256 "${REPO_ROOT}/${OUTPUT_NAME}" | awk '{print $1}')"
else
  APK_SHA="(no sha256 tool found)"
fi

echo ""
echo "[build_apk] ✅ Build OK"
echo "[build_apk]    File:    ${OUTPUT_NAME}"
echo "[build_apk]    Path:    ${REPO_ROOT}/${OUTPUT_NAME}"
echo "[build_apk]    Size:    ${APK_SIZE_MB} MB (${APK_SIZE_BYTES} bytes)"
echo "[build_apk]    SHA-256: ${APK_SHA}"
echo "[build_apk]    Version: v${current_name} (versionCode ${current_code})"
echo "[build_apk]"
echo "[build_apk] Next step: drag-and-drop ${OUTPUT_NAME} into Telegram Saved"
echo "[build_apk] Messages, then install on device. Existing app data preserved"
echo "[build_apk] because applicationId + signing keystore are unchanged."
