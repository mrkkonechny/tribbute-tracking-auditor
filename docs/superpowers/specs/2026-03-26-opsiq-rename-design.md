# opsIQ Rename Design

## Goal

Rename the Chrome extension from "TRIBBUTE Auditor" to "opsIQ" across all files, including user-facing display names, internal JavaScript identifiers, event names, guard flags, report headers, and documentation.

## Files Affected

| File | Changes |
|------|---------|
| `manifest.json` | `"name"`: `"TRIBBUTE Auditor"` → `"opsIQ"` |
| `popup.html` | `<title>` and `<h1>`: `TRIBBUTE Auditor` → `opsIQ` |
| `popup.js` | File comment, report headers (`TRIBBUTE TRACKING AUDIT REPORT`, `TRIBBUTE SCHEMA AUDIT REPORT`, `TRIBBUTE TRACKING AUDITOR REPORT`) |
| `content.js` | File comment, all `__tribbute` guard flags and `__tribbute_event__` / `__tribbute_tracking__` event names |
| `injected.js` | File comment, all `__tribbute` guard flags and `__tribbute_event__` / `__tribbute_tracking__` event names |
| `background.js` | File comment, console.log strings |
| `CLAUDE.md` | Project name, directory path references |
| `README.md` | All user-facing TRIBBUTE references (repo URLs left as-is — requires separate GitHub repo rename) |

## Rename Mapping

| Before | After |
|--------|-------|
| `TRIBBUTE Auditor` | `opsIQ` |
| `TRIBBUTE Tracking Auditor` | `opsIQ` |
| `TRIBBUTE TRACKING AUDIT REPORT` | `opsIQ TRACKING AUDIT REPORT` |
| `TRIBBUTE SCHEMA AUDIT REPORT` | `opsIQ SCHEMA AUDIT REPORT` |
| `TRIBBUTE TRACKING AUDITOR REPORT` | `opsIQ TRACKING AUDITOR REPORT` |
| `__tribbute` (guard flag) | `__opsiq` |
| `__tribbute_event__` | `__opsiq_event__` |
| `__tribbute_tracking__` | `__opsiq_tracking__` |

## Out of Scope

- GitHub repo URL (`mrkkonechny/tribbute-tracking-auditor`) — requires a GitHub repo rename, done separately
- Folder name on disk — requires OS-level rename, done separately
- `popup.css` — no TRIBBUTE references found
