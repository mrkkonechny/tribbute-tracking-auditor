# Deployment Runbook

> **PDS Document 06** | Last Updated: 2026-03-26

---

## 1. Overview

opsIQ is a client-side Chrome extension with no backend, no database, and no build pipeline. Deployment consists of two distinct paths:

- **Development deployment:** Load the unpacked extension directly from the repository into Chrome.
- **Production deployment:** Package the extension as a `.zip` file and submit it to the Chrome Web Store.

There is no staging environment, no CI/CD pipeline, and no server infrastructure to manage.

---

## 2. Prerequisites

### Development

| Requirement | Version / Notes |
|---|---|
| Google Chrome | Version 88 or later (Manifest V3 minimum) |
| Git | Any recent version; for cloning and version control |
| Text editor or IDE | VS Code recommended; no build tooling required |
| Chrome Developer Mode | Must be enabled in `chrome://extensions/` |

### Production (Chrome Web Store)

| Requirement | Notes |
|---|---|
| Chrome Developer Account | One-time $5 USD registration fee at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) |
| Zip utility | macOS built-in `zip`, Windows built-in, or any archiver |
| Review of Chrome Web Store policies | Mandatory before first submission; review [program policies](https://developer.chrome.com/docs/webstore/program-policies/) |

---

## 3. Development Deployment

### 3.1 Initial Load

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/tribbute-tracking-auditor.git
   cd tribbute-tracking-auditor
   ```

2. Open Chrome and navigate to `chrome://extensions/`.

3. Enable **Developer mode** using the toggle in the top-right corner.

4. Click **Load unpacked**.

5. Select the repository root directory (the directory containing `manifest.json`).

6. The opsIQ extension icon appears in the Chrome toolbar. If it is not visible, click the puzzle piece icon and pin opsIQ.

### 3.2 Reloading After Changes

Different file changes require different reload procedures:

| File Changed | Reload Procedure |
|---|---|
| `popup.html`, `popup.css`, `popup.js` | Close and reopen the popup. No extension reload needed. |
| `content.js` | Click the reload icon (↻) on the extension card at `chrome://extensions/`, then refresh the target tab. |
| `injected.js` | Click the reload icon at `chrome://extensions/`, then refresh the target tab. |
| `background.js` | Click the reload icon at `chrome://extensions/`. Service worker restarts automatically. |
| `manifest.json` | Click the reload icon at `chrome://extensions/`. |

### 3.3 Debugging per Context

Each execution context has its own DevTools inspector:

**Popup (popup.js):**
1. Right-click the extension popup while it is open.
2. Select "Inspect".
3. DevTools opens attached to the popup window.
4. Console, Sources, and Network tabs are available.
5. Note: The popup closes when DevTools loses focus unless you move the DevTools window.

**Service Worker (background.js):**
1. Navigate to `chrome://extensions/`.
2. Find the opsIQ card and click "service worker" (shown as a blue link next to "Inspect views").
3. DevTools opens attached to the service worker context.

**Content Script (content.js):**
1. Open DevTools on the target tab (`F12` or right-click → Inspect).
2. In the Console, use the context selector dropdown (top-left of console panel) to switch from "top" to "content.js (opsIQ)".
3. Alternatively, set breakpoints in Sources → Page → (extension files).

**Injected Script (injected.js):**
1. Open DevTools on the target tab.
2. The injected script runs in the page context, so it is visible in the standard "top" console frame.
3. In Sources → Page, the script appears as `injected.js` under the extension origin URL.

### 3.4 Common Development Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| Extension icon missing from toolbar | Extension not loaded or not pinned | Check `chrome://extensions/` for errors; pin the extension |
| Popup shows blank or no tracking data | Content script not injected; tab not refreshed after reload | Reload extension at `chrome://extensions/`, refresh the target tab |
| Events not appearing in Events tab | `injected.js` blocked by CSP; or SW context invalid (BUG-0003) | Check browser console on target page for CSP errors; reload extension |
| "Cannot read properties of undefined" in popup | `tab.url` undefined due to missing `tabs` permission (BUG-0002) | Known issue; fix planned for v1.3.0 |
| Events appear multiple times | Double-wrap guard not firing; `.__opsiq` flag missing | Check `window.dataLayer.__opsiq` in page console; reload extension |

---

## 4. Production Deployment

### 4.1 Pre-Release Checklist

Complete all items before creating the production package:

- [ ] All planned changes for the release are committed and pushed to `main`
- [ ] `manifest.json` version number is updated (e.g., `"version": "1.3.0"`)
- [ ] Full regression checklist in [docs/05-TEST_PLAN.md](05-TEST_PLAN.md) has been executed and all items pass
- [ ] BUG-0001 (XSS via `item.source`) is confirmed fixed or explicitly acknowledged as deferred with a severity note
- [ ] No `console.log` debug statements with sensitive data remain in production code
- [ ] No hardcoded test IDs, API keys, or credentials exist in any file
- [ ] `README.md` reflects the new version and any user-facing changes
- [ ] [docs/10-CHANGELOG.md](10-CHANGELOG.md) has a versioned entry for this release
- [ ] Icons exist in all three sizes: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
- [ ] `web_accessible_resources` in `manifest.json` includes only `injected.js` (no test files)

### 4.2 Creating the Package

Run from the repository root:

```bash
# Navigate to the repo root (parent of the extension files)
cd /path/to/tribbute-tracking-auditor

# Create the zip package, excluding development and documentation files
zip -r opsiq-v1.3.0.zip \
  manifest.json \
  popup.html \
  popup.css \
  popup.js \
  content.js \
  injected.js \
  background.js \
  icons/

# Verify contents
unzip -l opsiq-v1.3.0.zip
```

**Files to exclude from the package** (do not include in the zip):
- `docs/` — PDS documentation
- `README.md` — GitHub documentation
- `CLAUDE.md` — Agent context
- `.claude/` — Agent rules
- `.git/` — Version control history
- `*.zip` — Previous packages
- `.DS_Store` — macOS metadata

### 4.3 Chrome Web Store Upload

1. Navigate to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

2. Log in with the developer account associated with the opsIQ listing.

3. Click the **opsIQ** item in your dashboard (or click "New Item" for first-time submission).

4. Click **Upload new package**.

5. Upload the `opsiq-vX.X.X.zip` file created in step 4.2.

6. Review the auto-populated fields. Update the following if needed:
   - **Description** — ensure it matches `README.md` and the new feature set
   - **Screenshots** — update if the UI has changed significantly
   - **Version notes** — add a brief changelog for reviewers (mirrors `10-CHANGELOG.md`)

7. Click **Save Draft** and review the Store listing preview.

8. Click **Submit for Review**.

9. Note the submission timestamp. Chrome Web Store review typically takes 1–7 business days for updates and up to 14 days for first-time submissions or submissions after a policy-flagged review.

### 4.4 Post-Publish Verification

After the extension is approved and live:

1. Install the published extension from the Web Store on a clean Chrome profile (not the developer profile with the unpacked version loaded).

2. Run the full regression checklist from [docs/05-TEST_PLAN.md](05-TEST_PLAN.md) against the published build.

3. Verify the version number displayed in `chrome://extensions/` matches the released version.

4. Confirm no unintended permissions appear in the Web Store listing's "Permissions" section.

5. Update [docs/10-CHANGELOG.md](10-CHANGELOG.md) with the publish date.

---

## 5. Rollback

**There is no instant rollback mechanism for Chrome Web Store extensions.** Once a version is published, users on auto-update will receive the new version within 24–48 hours and there is no way to force a downgrade.

### Rollback Procedure

If a critical bug is discovered post-publish:

1. **Immediately:** Fix the bug in the codebase. Do not amend existing commits — create a new commit with the fix.

2. **Update** `manifest.json` version to the next patch version (e.g., `1.3.0` → `1.3.1`).

3. **Run** the regression checklist from [docs/05-TEST_PLAN.md](05-TEST_PLAN.md) against the fixed version locally.

4. **Package** the fixed version using the procedure in section 4.2.

5. **Submit** the patch to the Chrome Web Store following section 4.3. Mark it as a critical fix in the version notes to request expedited review (note: expedited review is not guaranteed).

6. **Communicate** the issue and timeline to any known affected users via the GitHub Issues tracker or the Web Store listing's support tab.

7. **Log** the bug in [docs/09-BUG_LOG.md](09-BUG_LOG.md) and the fix in [docs/10-CHANGELOG.md](10-CHANGELOG.md) under the patch version.

### Preventing Future Rollback Scenarios

- Never ship a release without completing the full regression checklist.
- For critical security fixes (e.g., BUG-0001 XSS), treat as P0 and expedite through the pre-release checklist.
- Maintain the unpacked development version on the developer machine at all times for rapid local testing without a Store round-trip.
