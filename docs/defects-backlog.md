# Bassboard Composer — Defect Backlog (prioritized)

Established in M1. Each item verified against the real code (2,331-line baseline) and,
where noted, against the four private fixtures via the M1 harness.

**Confidence:** `confirmed` = reproduced this session; `code-confirmed` = proven by reading
the code; `untested` = plausible but not yet reproduced.

**Reassuring M1 result:** all four fixtures **load, save→reload losslessly, and generate
copy + print output without error.** The data-safety defects below are about *runtime state
and typed metadata*, not about the saved fixture files themselves — which is why the files
round-trip clean.

**Fixed in M3 (2026-07-17):** D1, D2, D3, D4, D5, D6, D7, D9 — all verified by the
`verify-m3.mjs` harness (43 checks incl. a security pass; fixtures still render byte-identical
to the M1 baseline). New chart files carry optional `tuning`/`bpm` fields; `version` stays 1 so
old and new files remain mutually loadable.

**Fixed in M4 (2026-07-17):** D14 (real multi-step undo/redo via a snapshot stack + Cmd-Z/
Cmd-Shift-Z), D15 (mid-chart insert — "+ After" duplicates the selected chord), D16 (meter
change warns before regrouping bars). Also added (features Bo requested, not defects): section
reordering (▲▼). Verified by `verify-m4.mjs` (20 checks; fixtures still byte-identical to M1
baseline). **Fixed in M5 (2026-07-17):** D17 (section rename now a touch-reliable input; 44px tap
targets for touch devices via `pointer:coarse`), D18 (first-run intro panel + sample chart +
relabeled entry button + "how it works"). Added: status toasts, aria-labels on icon buttons,
:focus-visible outlines. iPad touch sizing still needs a real-device pass (M6/pilot).

**Fixed in M6 (2026-07-17):** D8 (count-in now one bar in every meter; accent realigned —
final check by ear), D10 (auto columns: one column ≤16 bars, two columns above — short charts
no longer leave an empty half-page), D11 (copy output includes writer + per-bar measure notes),
D12 (`break-inside:avoid` on sections/rows for clean page breaks), D13 (blocked-popup message).
Print baselines in `private/baseline/` were intentionally regenerated to the new M6 layout —
that is now the regression baseline for future milestones. Verified by `verify-m6.mjs` (14 checks).

**Fixed post-M6 (2026-07-17, Bo-found on live site):** D22 — print barlines didn't line up
into vertical columns because bars with split chords rendered slightly wider than single-chord
bars (grid tracks grew to content). Fixed by locking every bar to a fixed width with even
`1fr` columns + `min-width:0` on chords. Verified by high-res render of the real 6/8 chart:
barlines now align in both one- and two-column layouts. Baselines regenerated.

**Still open:** D19, D20 → M8 (favicon/meta, localStorage key namespacing).
D21 addressed by the in-app storage note. All P0–P1 defects resolved.

---

## P0 — Data safety / looks-like-data-loss (target: M3)

| ID | Defect | Confidence | Where |
|----|--------|-----------|-------|
| D1 | Autosaved chart is restored into memory on load but never rendered — reopening the app shows the empty-state message until the next action. Reads as total data loss. | confirmed | init block, ~L2318 |
| D2 | Title, writer, tempo, and slash inputs have no autosave listeners; their typed values persist only when the *next* chart mutation triggers a save. Type + reload = lost. | code-confirmed | input handlers absent |
| D3 | Imported JSON is applied on the sole check `version===1`; a malformed-but-versioned file can throw during render, and because autosave wraps render, poison the saved slot. | code-confirmed | `restoreSnapshot`, `loadChart` |
| D4 | One localStorage slot (`nns-chart`) holds everything; Load and Clear overwrite it silently, and two tabs fight over it. Downloaded JSON is the only durable copy, and nothing says so. | code-confirmed | `autosave`, `clear` |

## P1 — Correctness / trust (target: M3, and M6 for playback)

| ID | Defect | Confidence | Where |
|----|--------|-----------|-------|
| D5 | Time dropdown desyncs on every load: `restoreSnapshot` sets value `'4/4'` but option values are `'44'` → dropdown blanks. Internal state stays correct; display lies. | confirmed | `restoreSnapshot`, ~L2246 |
| D6 | Selected tuning is not in the save snapshot; every loaded chart resets to Standard. | confirmed | `chartSnapshot` |
| D7 | Playback BPM is not saved; resets to 120 on load. Free-text tempo and playback BPM are unreconciled overlapping state. | confirmed | `chartSnapshot` |
| D8 | 3/4 count-in is hardcoded to 4 beats (1⅓ bars), and the metronome accent counter starts at the count-in, so strong-beat clicks land on the wrong beat for the rest of 3/4 playback. 4/4, 2/4, 6/8 align by arithmetic luck. | code-confirmed | `startPlayback` |
| D9 | `loadChart` re-calls `initBeatGrid`, stacking a fresh set of mouse/touch/document listeners on every Load. Latent now; a live hazard once M4 changes editing. | code-confirmed | `loadChart` |

## P1 — Output (Bo's flagged priority; target: M6)

| ID | Defect | Confidence | Where |
|----|--------|-----------|-------|
| D10 | Short charts (≈≤16 bars) put all sections in the left print column, leaving an empty right column with an orphan vertical divider — looks broken. Medium/long charts (incl. 6/8) balance correctly. | confirmed (Fixture C print) | `viewChart` column split |
| D11 | Copy output (plain and formatted) omits the writer and **all** measure notes; the print view includes both. Anyone relying on copied output silently loses measure notes. | code-confirmed | `generateOutput`, `generateOutputHTML` |
| D12 | The print layout is two fixed columns with no page-break handling. All four fixtures fit one page, so overflow to page 2 is unproven — a risk for charts longer than any fixture. | untested | `viewChart` |
| D13 | `window.open('', '_blank')` in View Chart has no null check; a popup blocker makes the button silently do nothing. | code-confirmed | `viewChart` |

## P2 — Editing / usability (target: M4 / M5)

| ID | Defect | Confidence | Where |
|----|--------|-----------|-------|
| D14 | "Undo" is Remove-Last of the *current section only*: can't undo edits, deletions, duration/quality changes; no redo; silently deletes the whole section if it's empty; can remove from a different section than the one being edited. | code-confirmed | `undo-btn` handler |
| D15 | No way to insert an entry between two existing entries — only append, edit-in-place, delete. M4's "correct without rebuilding a section" depends on closing this. | code-confirmed | entry model |
| D16 | Changing meter while entries exist silently regroups every bar and reinterprets durations. No warning. | code-confirmed | `time-select` handler |
| D17 | iPad-landscape note dots shrink to ~30px (guideline 44px); section rename uses contentEditable, unreliable on touch. | code-confirmed | CSS media queries, `renderChart` |
| D18 | First run is a bare fretboard; the entire charting feature is hidden behind an unexplained "Transcribe" button. No sample, no guidance. | code-confirmed | initial DOM |

## P3 — Launch hygiene (target: M8)

| ID | Defect | Confidence | Where |
|----|--------|-----------|-------|
| D19 | localStorage key `nns-chart` is generic; on a shared origin it collides with other apps. Mitigated by the project's own repo subpath, but worth namespacing. | code-confirmed | `autosave` |
| D20 | No favicon, page description, or Open Graph tags. | confirmed | `<head>` |
| D21 | No in-app statement that chart data is browser-local and JSON download is the real backup. | confirmed | UI |

---

## Deliberately not defects (design decisions, confirmed with Bo)
- Major-key-only NNS (auto-minor on 2 and 6). Standard practice; documented limitation for v1.
- 6/8 split-bar tick marks count eighth-note cells. Bo's charts use this; kept as-is.
- Five-string support deferred past v1.
