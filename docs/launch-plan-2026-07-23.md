# Bassboard Composer — Launch Plan (from the 2026-07-21 eval)

*2026-07-23 · Plan for addressing `eval-report-2026-07-21.md`. Supersedes nothing; extends the
M-milestone sequence. All report claims load-bearing to this plan were re-verified against
`app.js` at HEAD before writing it (autosave `catch {}` L1884, unvalidated slash input L1365,
root-only `entryToMidi` L200–206, half-bar default L730).*

## Decisions locked (Bo, 2026-07-23)

1. **Slash playback voices the slash note only** — the bass plays what the bassist plays.
2. **Slash entry accepts degree tokens AND note letters**; letters auto-convert to degrees in
   the current key on entry, so they transpose.
3. **Storage safety for beta:** namespaced key + autosave-failure toast + "last saved" footer
   + a two-deep shadow slot restorable from the File menu. Full multi-chart library (F5) stays
   fast-follow/someday.
4. **iPad Safari pass happens before invites**, run by Bo on his own device.

---

## M7 — Trust & correctness (code, before invites)

The five launch conditions plus the two findings that reach the printed page. Everything here
is S effort per the report; the whole milestone is a few sessions, not weeks.

| # | Item | Source | Notes |
|---|------|--------|-------|
| 7.1 | New-entry duration default: fill-remainder-of-bar; teach shift-click in the intro + first-chart hint | C1 / UX-1 / F2 | Change `preferred` in `addEntry` (L730). Decide: does shift-click still mean full bar? Yes — keep, just document it. |
| 7.2 | Slash input validation: accept degree tokens; auto-convert letters using current key; reject garbage with a hint | C2 / MC-5 / UX-2 | Convert at entry time so stored value is always a degree token → transpose works for free. Migrate/normalize existing letter slashes on load. |
| 7.3 | Playback voices the slash note as the bass voice | C2 / MC-4 / F1 | Extend `entryToMidi` to prefer the slash degree when present. |
| 7.4 | Autosave failure visibility: one-time toast on first failed write + "last saved HH:MM" in footer | C3 / R2 | Replace the bare `catch {}` at L1884. |
| 7.5 | Key-name spelling agreement: `KEY_NAMES` ↔ `FLAT_KEYS` per key (picker, letters mode, print header) | MC-2 / UX-7 | It prints — that's why it's before launch. **Regenerates print baselines** (header text changes). |
| 7.6 | Unset tempo: omit from print, or prefix "≈" when never touched | MC-7 | Also regenerates baselines. Bundle with 7.5 so baselines regen once. |
| 7.7 | Document the pragmatic letter-spelling choice (no Cb/E#/doubles) in "How it works" | MC-1 | Text only. |

**Verification:** `verify-m7.mjs` extending the harness — slash conversion table (letters → degrees
in several keys, incl. transposition round-trip), slash-voiced MIDI values, duration-default cases
(empty bar, partial bar, shift-click), key-spelling agreement across picker/letters/print for all
12 keys. Regenerate all print baselines **once**, after 7.5 + 7.6 land, and diff intentionally.

## M8 — Storage safety & launch hygiene (before invites)

Existing planned M8 scope plus the storage decisions.

| # | Item | Source |
|---|------|--------|
| 8.1 | Namespace localStorage key (`nns-chart` → `bassboard-composer:chart` or similar), with one-time migration from the old key | D19 / C4 |
| 8.2 | Two-deep shadow slot: before Load/Load Sample/Clear overwrite, current chart rotates into a "previous chart" slot; restorable from File menu | R1 / C4 |
| 8.3 | Backup nudge: "you haven't downloaded a backup in a while" after N changes (N≈50 mutations or 7 days, tune later) | R3 / R4 |
| 8.4 | Favicon, page description, Open Graph tags | D20 |
| 8.5 | Doc drift cleanup: README architecture + tuning count (three, with old-file note), D22 backlog note, tempo-field references; regenerate stale `_sample.print.html` baseline | §2 all five items |

**Verification:** harness checks for key migration (old key present → migrated, new key wins),
shadow-slot rotation order, and that Load/Clear never leave zero recoverable copies.

## M9 — Pre-invite device pass (Bo, no code)

- Full workflow on **iPad Safari landscape** on a music stand: charting, touch targets, editor
  dock, playback during a run-through, print behavior from the popup. (Checklist §Device matrix.)
- **Desktop Safari** smoke pass (still untested).
- **By-ear checks:** count-in feel in 3/4 and 6/8; the new slash voicing on a real chart.
- Real **file-import dialog** test (the eval never exercised it) and one print **on paper**.

Anything found here feeds back into M7/M8 scope before invites go out.

**Gate: invites go out only after M7 + M8 + M9 are green.**

## M10 — Fast follow (first weeks of beta, roughly in order)

| Item | Source | Effort |
|------|--------|--------|
| Diamond (held/let-ring) marker | F3 | S |
| Keyboard duration entry (1–8 = beats; closes the a11y gap) | F7 / UX-3 | S |
| Duplicate section | F9 | S |
| Section repeat counts ("Chorus ×4") | F8 | S |
| Tap tempo | F6 | S |
| Active-section highlight (watch pilot users first — sized [Hyp]) | UX-5 | S |
| Meter-change overflow: tint overflowing bars + "rescale durations" option | MC-6 / UX-4 | M |
| Push/anticipation marks (`<`) | F4 | M |
| Fretboard labels re-spelled from key (flat keys show flats) | MC-3 / UX-6 | S |
| Stage mode + Screen Wake Lock | F10 | S–M |
| Print fallback: Blob-URL or same-tab view instead of `about:blank` popup | R5 | S–M |

## Someday (unchanged from report)

Small multi-chart library (F5 — reassess after shadow-slot experience), walk-up/walk-down glyphs
(F11), paste-to-chart (F12), undo debounce for text inputs (UX-8), plus the standing deferred list.
Nothing currently in the app gets cut.

---

## Critique pass — assumptions and failure modes

**Assumptions this plan makes, and how each is verified:**

1. *Slash letters can be unambiguously converted to degrees in the current key.* Mostly true, but
   enharmonics bite: in Db, does typed "B" mean the b7 (the app's pragmatic spelling) or a #6?
   **Verify:** write the conversion table first, run it through the harness in all 12 keys before
   touching the UI. This is the plan's riskiest assumption — do it as the first M7 task.
2. *Fill-remainder duration default is what players want.* [Hyp] in the report too. **Verify:**
   Bo charts one real song with the new default before it ships; usability task #1 confirms with
   a pilot user.
3. *Existing saved files may contain letter slashes* (free text today). Normalizing on load is a
   silent data mutation. **Verify:** run all four fixtures + Bo's real charts through the
   normalizer and diff; anything unconvertible must be preserved as-is, never dropped.
4. *Shadow slot doubles localStorage footprint.* Fine at these chart sizes (~20 KB), but the
   failure toast (7.4) must land first or a quota failure stays invisible. Sequencing: 7.4 before 8.2.
5. *Baseline regeneration (7.5/7.6) is intentional churn.* Worst failure: a real regression hides
   inside an expected diff. Mitigation: regen once, and hand-review the header lines of each
   baseline diff rather than accepting wholesale.
6. *Two-tab last-writer-wins remains partially open* even after 8.2 — the shadow slot softens it
   but doesn't fix it. Accepted for beta; revisit only if a pilot user hits it.

**Worst failure mode per milestone:** M7 — slash conversion mangles existing charts (mitigated by
#3); M8 — key migration loses the autosave for existing users, i.e. Bo (mitigated by migrate-then-
read-old-key-fallback, and Bo exports JSON before updating); M9 — iPad reveals layout problems big
enough to reopen M7 scope (that's the point of gating invites on it).

**Security pass:** not applicable — no auth, no data leaves the browser, no new inputs cross a
trust boundary. The slash input change is client-side parsing of the user's own data. XSS surface
verified 2026-07-23: in-app rendering is `textContent` throughout, and `generateOutputHTML`/print
wrap all user text in `escHtml()` — keep both patterns when touching slash rendering in 7.2/7.3.
