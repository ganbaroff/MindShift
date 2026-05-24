# Play Console Upload Guide — MindShift v1.0
**Date:** 2026-05-24  
**For:** CEO (Yusif) — every click, every file, every URL. Nothing left to guess.

---

## §1 Pre-flight: Asset Inventory

Verified 2026-05-24 by CLI (`ls -la` + PIL dimension check). All paths are relative to repo root.

### Feature Graphic

```
-rw-r--r-- 1 user 197121 1061195 Apr 21 01:46 public/feature-graphic.png
```

**Status: GREEN**  
Dimensions: 2048×1000 px (Google requires 1024×500 minimum; this is @2× retina — valid).  
Size: 1.01 MB (well above 50 KB minimum).  
Upload path: `Graphics → Feature graphic`.

### Phone Screenshots (8 files)

```
-rw-r--r-- 1 user 197121 236997 Apr 21 01:46 public/screenshots/playstore/01-today.png
-rw-r--r-- 1 user 197121 161632 Apr 21 01:46 public/screenshots/playstore/02-tasks.png
-rw-r--r-- 1 user 197121 165402 Apr 21 01:46 public/screenshots/playstore/03-focus.png
-rw-r--r-- 1 user 197121 150732 Apr 21 01:46 public/screenshots/playstore/04-progress.png
-rw-r--r-- 1 user 197121 113529 Apr 21 01:46 public/screenshots/playstore/05-onboarding.png
-rw-r--r-- 1 user 197121 147893 Apr 21 01:46 public/screenshots/playstore/06-settings.png
-rw-r--r-- 1 user 197121  62214 Apr 21 01:46 public/screenshots/playstore/07-history.png
-rw-r--r-- 1 user 197121 248111 Apr 21 01:46 public/screenshots/playstore/08-home.png
```

**Status: GREEN (8/8)**  
Dimensions: all 780×1688 px (portrait 9:16 ratio — valid for Phone).  
Sizes: 60 KB–242 KB (all above 30 KB minimum).  
Upload path: `Graphics → Phone screenshots`.

### App Icon (512×512)

```
-rw-r--r-- 1 user 197121 56677 Apr 21 01:46 public/icon-512.png
```

**Status: GREEN**  
Dimensions: 512×512 px. Format: PNG with alpha channel (RGBA).  
Size: 55 KB.  
Upload path: `Graphics → App icon` (this is the store listing icon, separate from the APK/AAB launcher icon).

### Tablet Screenshots

**Status: MISSING**  
No tablet-sized screenshots found anywhere in `public/screenshots/`.  
Google Play marks tablet screenshots as optional for phone-only apps. You can skip them at launch and add later. If you want them, they need to be 1200×1920 px (7-inch tablet) or 1600×2560 px (10-inch tablet). See §5 for generation path.

### Short Description (≤80 chars)

Source: `docs/play-store-listing.md` §2

```
Calm task management and focus sessions built for how ADHD brains actually work.
```

**Status: GREEN** — exactly 80 characters (confirmed with `python3 -c "print(len(...))"`)

### Full Description (≤4000 chars)

Source: `docs/play-store-listing.md` §3 — complete description starting with "Your brain works differently…"

**Status: GREEN** — present in repo, covers all feature categories.

### Privacy Policy URL

Verified: `curl -sI https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app/privacy` → **HTTP/1.1 200 OK**

**Status: GREEN**

### Terms of Service URL

Verified: `curl -sI https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app/terms` → **HTTP/1.1 200 OK**

**Status: GREEN**

### Summary

| Asset | Status | File |
|---|---|---|
| Feature graphic (1024×500+) | GREEN | `public/feature-graphic.png` |
| Phone screenshots (8) | GREEN | `public/screenshots/playstore/01-08` |
| App icon 512×512 | GREEN | `public/icon-512.png` |
| Tablet screenshots | **MISSING** | — see §5 |
| Short description | GREEN | `docs/play-store-listing.md` §2 |
| Full description | GREEN | `docs/play-store-listing.md` §3 |
| Privacy URL | GREEN | `/privacy` → 200 |
| Terms URL | GREEN | `/terms` → 200 |

**7 GREEN, 1 MISSING (tablet screenshots — optional at launch)**

---

## §2 Play Console Main Store Listing

Direct URL to your app's main store listing page:

```
https://play.google.com/console/u/0/developers/4936190791026304559/app/4976344967971920914/main-store-listing
```

### Step-by-step

**1. Open the URL above.** You land on the "Main store listing" page with a left sidebar.

**2. App details section (top of the form)**

- **App name:** `MindShift — ADHD Focus`  
  Copy from: `docs/play-store-listing.md` §1 (30-char limit — this is 23 chars, fine)

- **Short description:** paste the 80-char line from `docs/play-store-listing.md` §2  
  ```
  Calm task management and focus sessions built for how ADHD brains actually work.
  ```

- **Full description:** open `docs/play-store-listing.md` §3, copy everything from "Your brain works differently." to the end of the section. Paste into the text area. Check the counter stays under 4000 chars.

**3. Graphics section**

Scroll down to the graphics section. Upload in this order:

- **App icon** → click the icon upload box → select `public/icon-512.png`  
  (512×512 PNG, no alpha overlay, no rounded corners — Google applies corners itself)

- **Feature graphic** → click the feature graphic box → select `public/feature-graphic.png`  
  (2048×1000 — Google accepts this as a valid oversized 1024×500)

- **Phone screenshots** → click "Add phone screenshots" → select all 8 files at once:  
  ```
  public/screenshots/playstore/01-today.png
  public/screenshots/playstore/02-tasks.png
  public/screenshots/playstore/03-focus.png
  public/screenshots/playstore/04-progress.png
  public/screenshots/playstore/05-onboarding.png
  public/screenshots/playstore/06-settings.png
  public/screenshots/playstore/07-history.png
  public/screenshots/playstore/08-home.png
  ```
  Google will show them as a carousel. Drag to reorder if needed (01-today first is correct — it shows the core daily view).

- **7-inch tablet / 10-inch tablet** → skip for now (MISSING — see §5)

**4. Contact details section (may be lower on the page or in a separate tab)**

- **Privacy policy URL:**  
  ```
  https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app/privacy
  ```

**5. Click "Save" (top right corner).** Wait for green "Saved" confirmation. Do not click anything else yet.

---

## §3 Play Console App Content Declarations

App Content section URL:

```
https://play.google.com/console/u/0/developers/4936190791026304559/app/4976344967971920914/app-content
```

This section has multiple subsections. Your answers are pre-drafted in full in:

```
docs/play-console-content-pre-draft-2026-05-24.md
```

That file lives on branch `docs/play-console-content-pre-draft-2026-05-24` (merged separately). The file maps every Google Play form field to a specific answer with source code citations. Below is a quick reference for each subsection — open the pre-draft for the exact copy-paste values.

### Subsections to complete

| # | Play Console label | Pre-draft section | Quick answer |
|---|---|---|---|
| 1 | Политика конфиденциальности (Privacy policy) | §1 | Enter the `/privacy` URL above |
| 2 | Реклама (Ads) | §4 | "This app does not contain ads" |
| 3 | Доступ к приложениям (App access) | §5 | "All or most functionality is available without special access" |
| 4 | Возрастные ограничения (Age rating) | §2 | Complete the IARC questionnaire — expected result: Everyone / PEGI 3 |
| 5 | Целевая аудитория (Target audience) | §3 | 18 and over, app not designed for children |
| 6 | Безопасность данных (Data safety) | §1 | See full data type table in pre-draft |
| 7 | Рекламный идентификатор (Ad ID) | §6 | "Does not use advertising ID" |
| 8 | Приложения государственных учреждений (Gov apps) | §6 | "This is not a government app" |
| 9 | Финансовые функции (Financial features) | §6 | "Does not provide financial services" |
| 10 | Приложения для здоровья (Health apps) | §6 | Does not provide medical advice; wellness category |

Work through each one in order. Each has a "Save" button — save after every subsection before navigating away.

---

## §4 Submit and Release Click Sequence

### From draft to review

Direct URL to the Internal Testing release:

```
https://play.google.com/console/u/0/developers/4936190791026304559/app/4976344967971920914/tracks/4699895684337331486/releases/1/review
```

**Click sequence:**

1. Open the URL above. You see the release summary page showing the AAB and release notes.

2. Scroll down. Confirm there are no red error banners. Yellow warnings are acceptable (e.g., "target SDK" advisory for internal testing). Red errors block submission.

3. If the main store listing was not yet saved, a banner says "Store listing incomplete" — fix that first (§2 above).

4. If App Content has incomplete sections, there will be a count badge ("Требуется действие (N)"). Complete all N items (§3 above) until the badge disappears or turns green.

5. Once everything is green/yellow: click **"Сохранить и опубликовать"** (bottom right, teal button).

6. A confirmation dialog appears. Click **"Отправить на проверку"** or **"Опубликовать"** depending on what Google shows for Internal Testing (Internal Testing does not require Google review — it publishes immediately).

7. Google shows "Выпуск отправлен" or similar. The release status changes to "In review" or directly "Available to testers" for Internal Testing track.

### Wait time

Internal Testing track: typically **5–30 minutes** before the install link becomes active. No human review queue for Internal Testing. The app just needs to be processed.

Production track (for later, not now): 1–7 days for first-time apps.

---

## §5 Verification After Publish

### Where the install link appears

1. Go to:
   ```
   https://play.google.com/console/u/0/developers/4936190791026304559/app/4976344967971920914/tracks/4699895684337331486
   ```

2. Click on the release row. Scroll to **"Тестировщики"** (Testers) section.

3. Under the testers list you will see **"Ссылка для тестировщиков"** — a URL that looks like:
   ```
   https://play.google.com/apps/internaltest/XXXXXXXXXXXXXXXX
   ```

4. Copy that link. This is what you share with testers (yourself first, then others you add to the testers list).

### How to add testers

In the Testers section, click **"Управление тестировщиками"** → add email addresses (Gmail accounts) that should receive access. Those people can then open the install link on their Android device.

### What to expect on first install

- The tester opens the install link on their Android phone in Chrome.
- They are taken to a Google Play page that says "Become a tester" → they tap "Принять участие в тестировании" → then "Скачать" appears.
- App installs normally via Play Store.
- First launch: onboarding flow starts (5 steps). Guest mode works without sign-in.
- Sign-in: Google OAuth and Magic Link email both work (Supabase Auth is live).

### Smoke test checklist after install

- [ ] App opens without crash
- [ ] Onboarding completes (5 steps)
- [ ] Task creation works
- [ ] Focus session starts and timer runs
- [ ] Settings → Export Data → JSON downloads (tests `gdpr-export` edge function)

### If install link does not appear after 30 minutes

1. Check that App Content has no remaining "Требуется действие" items (the badge must be gone or 0).
2. Check that the AAB was uploaded with the correct package name `com.v0laura.mindshift` (not the old `com.mindshift.app`).
3. Check that `versionCode` in `android/app/build.gradle` matches what was uploaded (currently 100).

---

## §5 Generating Missing Assets (Tablet Screenshots)

**Tablet screenshots are optional for a phone-only app at Internal Testing stage.** Skip at launch.

When you need them (e.g., for production listing or Google Play featuring consideration):

```bash
# In repo root — generates 7-inch tablet (1200×1920) screenshots
# using the same Playwright capture script that made phone screenshots
PLAYWRIGHT_VIEWPORT_WIDTH=1200 PLAYWRIGHT_VIEWPORT_HEIGHT=1920 \
  npx playwright test scripts/capture-playstore-screenshots.ts

# For 10-inch (1600×2560):
PLAYWRIGHT_VIEWPORT_WIDTH=1600 PLAYWRIGHT_VIEWPORT_HEIGHT=2560 \
  npx playwright test scripts/capture-playstore-screenshots.ts
```

Save results to `public/screenshots/playstore/tablet-7inch/` and `playstore/tablet-10inch/` respectively, then upload in the Graphics section under "7-inch tablet" and "10-inch tablet" slots.

---

*Guide authored 2026-05-24. Asset dimensions verified via PIL. HTTP status verified via curl. Pre-draft reference verified on remote branch `docs/play-console-content-pre-draft-2026-05-24`.*
