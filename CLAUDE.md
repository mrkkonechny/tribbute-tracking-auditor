# opsIQ

A Chrome extension that audits tracking implementations, schema markup, and monitors real-time events.

## Project Structure (v1.3.0+)

```
opsIQ/
├── manifest.json      # MV3: sidePanel, tabs, activeTab, scripting permissions
├── sidepanel.html     # Side panel UI entry point
├── sidepanel.css      # CSS variables, flex layout, bottom nav, :focus-visible
├── sidepanel.js       # ES module, OpsIQPanel class
├── content.js         # Content script: DOM scanning, event capture, port-based panel detection
├── injected.js        # Page context: wraps dataLayer/gtag/fbq with __opsiq guards
├── background.js      # Service worker: side panel behavior, port relay, navigation events
├── icons/             # Extension icons (16, 48, 128px)
├── popup.html         # RETIRED (kept for reference)
├── popup.css          # RETIRED (kept for reference)
└── popup.js           # RETIRED (kept for reference)
```

### Architecture Notes

- Side panel opens via `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
- `sidepanel.js` connects a `chrome.runtime` port named `'opsiq-panel'` on load.
  `background.js` relays `PANEL_OPEN` to the active tab's content script on connect,
  and `PANEL_CLOSED` on disconnect — replacing the old `isPopupOpen + window.unload` pattern.
- `content.js` `safeSendMessage` distinguishes transient SW restart errors from fatal context
  invalidation — transient errors skip the send without permanently disabling the content script.
- Events are capped at `EVENT_CAP = 200` in `sidepanel.js`. The `capturedEvents[]` array in
  `content.js` is unbounded (accumulates for page lifetime); the cap is enforced on display.
- `PAGE_NAVIGATED` messages from `background.js tabs.onUpdated` insert boundary markers in the
  events list (SPA pushState navigations will NOT trigger this — known limitation).

## Product Development Standard (PDS)

This project follows the opsIQ PDS. Read `docs/00-PDS_README.md` for the full structure and `.claude/rules/pds-protocol.md` for operational rules.

### Documentation Structure
- `docs/01-06` — Product definition and operations (update with explicit instruction only)
- `docs/07-10` — Tracking files (update proactively during work)
- `docs/.context/` — Ephemeral agent handoff files (overwrite each task)

### ID Systems
- **DEC-NNNN** → Decision Log (07)
- **ROAD-NNNN** → Roadmap (08)
- **BUG-NNNN** → Bug Log (09)

When you encounter a bug, complete a feature, make an architectural decision, or identify tech debt during any task, update the relevant tracking files and cross-reference IDs.
