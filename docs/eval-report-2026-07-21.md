# Bassboard Composer — Pre-Launch Evaluation

*2026-07-21 · Claude (Fable 5) · per the evaluation brief in `app-overview-and-eval-brief.md`*

**Surfaces inspected:** live app (desktop Chrome, real interaction: charting, durations, quality,
slash, letters toggle, transpose, undo-to-ground-truth, playback, meter change to 6/8, sample load,
first-run, print view); full `app.js` and `index.html` at HEAD; README; defects backlog; workflow
checklist; capture log; git history; one fixture JSON; all print baselines. Not inspected: audio by
ear, Safari, iPad hardware, real file-import dialog, `styles.css` in depth. Fixture song titles are
deliberately omitted from this document.

Evidence labels: **[Observed]** live in the running app · **[Code]** confirmed by reading source ·
**[Doc]** documented/known · **[Hyp]** hypothesis needing user testing.

---

## 1. Executive verdict: READY WITH CONDITIONS

The core promise works: I charted, edited, transposed, played back, and printed without a single
console error, and multi-step undo restored the working chart byte-identically to its pre-test
state ([Observed] — verified against a saved copy). This is launchable after a short list of
trust and data-safety conditions, none of them large.

**Three strongest aspects**

1. **Data-safety discipline.** Validate-before-mutate import, lossless v1→v2 migration (verified
   live: sample scaled ×4 and re-saved as v2), defensive id recomputation, and an undo stack that
   provably round-trips. Rare at this project's size.
2. **The core loop is fast and musically correct.** Click → correct degree with auto-minor on 2/6;
   letters mode and one-tap transpose re-spell correctly and instantly ([Observed] in D and Db).
3. **Process.** Milestoned changes, a regression harness on real charts, byte-identical print
   checks. The odds of silent regressions before launch are unusually low.

**Must-address before public beta (5)**

| # | Condition | Why | Effort |
|---|-----------|-----|--------|
| C1 | New-entry duration default (see UX-1) | Friction on nearly every note added | S |
| C2 | Slash notes: validate input and voice them in playback (UX-2/MC-4) | Trust — the slash **is** the bass note in a bass tool | S |
| C3 | Silent autosave failure (`catch {}`) — surface it once | User believes work is saved when it isn't | S |
| C4 | localStorage key namespacing (D19, already planned M8) + decide on the single-slot question (R1) | Top remaining data-loss vector | S |
| C5 | iPad Safari real-device pass (already on the checklist) | Half the target device matrix is unverified | — |

**Confidence:** high on code-level findings; moderate on UX (desktop Chrome only); playback audio
quality and count-in feel remain by-ear checks I cannot perform. Main limit: I did not test the
file-import dialog or print output on paper.

---

## 2. Source-of-truth discrepancies

1. **README architecture section is stale** [Observed]. Says "one self-contained HTML file" and
   "`index.html` currently byte-identical to the baseline" — false since M2 split the app into
   three files. → Update README.
2. **Tuning count differs everywhere** [Observed]. Code implements five tunings; the UI
   deliberately offers three (M6.4 decision, kept five in `TUNINGS` for file compatibility);
   README advertises five; the brief says three. → README should say three (with a note that
   old five-tuning files still load); this was a deliberate product decision, not a bug.
3. **`private/baseline/_sample.print.html` is stale** [Observed] — it's the M5-era boxed layout;
   the four fixture baselines are current (flowing layout). → Regenerate the sample baseline.
4. **Backlog D22 narrative is superseded** [Doc]. The fixed-width-bar fix it describes was retired
   wholesale by the M6.2 flowing redesign. Nothing wrong in behavior; the record just points at
   code that no longer exists. → One-line note in the backlog.
5. **"Tempo field" references** in older docs/checklist predate M6.3's removal of the free-text
   tempo (BPM is now the single source). Minor.

---

## 3. Musical-correctness audit

Assumed convention: major-key-relative Nashville numbers, flat-side chromatic degrees, underlined
split bars — i.e., the app's own declared rules, which sit within mainstream Nashville practice.
Where scenes differ (dots vs. tick marks, minor-key charts written in 1-of-relative-major), I flag
rather than rule.

**Internally correct (verified):**

- Degree mapping and auto-minor on 2/6 — [Observed].
- Letters mode, key D: 1=D, 6-=Bm, 2-=Em, b7=C, 5-/3=Am/F# — all correct [Observed].
- Transpose re-spell, D→Db: Bbm/Ebm/Db/Ab, slash Abm/F — correct [Observed].
- v1→v2 duration migration ×4; sample re-saved as v2; 12-cell 3/4 bars — [Observed].
- 6/8 model: 12 cells, two dotted-quarter pulses, eighth-note ticks (documented house style),
  `10/bpm` per cell so BPM = dotted quarter — [Code], consistent throughout.
- Count-in is one bar in every meter and the accent counter starts at the count-in bar, so beat 1
  lands correctly afterward — [Code]. Final feel check is by ear (open on the checklist).
- Repeat-% replays the previous bar; equal splits underline without ticks; unequal splits tick per
  quarter (eighth in 6/8) — [Code], matches the fixture print output [Observed].

**Findings:**

- **MC-1 · Letter spelling is pragmatic, not theory-complete** [Observed]. In Db, the b7 degree
  renders as **B** rather than Cb; there are no E#/Cb/double accidentals. This is a documented v1
  decision and defensible for working charts — but it should be stated in "How it works" so a
  theory-literate user reads it as a choice, not an error.
- **MC-2 · Key-name spelling is inconsistent across surfaces** [Code/Observed]. The picker shows
  "C# / Db"; letters mode spells that key flat (Db); the print header prints "Key: C#". F#/Gb gets
  the opposite treatment (sharp side). One printed page can imply two different spellings of its
  own key. Cheap fix: make `KEY_NAMES` agree with `FLAT_KEYS` per key.
- **MC-3 · Fretboard labels always spell sharps** [Observed]. In Eb, the board says D# while the
  chart says Eb. Cosmetic, but it undermines the "think on the fretboard" promise in flat keys.
- **MC-4 · Playback ignores the slash note** [Code]. `entryToMidi` voices the chord root; a 5/7 or
  1/3 plays the root, not the inversion the bassist actually plays. For a bass-first tool this is
  the single biggest gap between what the chart says and what the ear hears.
- **MC-5 · Slash input is unvalidated free text** [Code]. Typing a letter ("G") instead of a degree
  produces a slash that silently refuses to transpose. Restrict to degree tokens, or auto-convert
  letters to degrees using the current key on entry.
- **MC-6 · Meter change keeps durations** [Code]. A 4/4 chart of whole notes (16 cells) switched to
  6/8 (12-cell bars) yields overflow bars with no visual flag. The confirm dialog warns, and undo
  recovers, but the resulting chart can read wrong without looking wrong.
- **MC-7 · Unset tempo prints "Tempo: 120"** [Observed in fixture baseline]. The BPM default
  masquerades as the song's tempo. Omit when never touched, or prefix "≈".
- **MC-8 · Chromatic degrees are flat-only** (no #4-style spellings) [Code]. Consistent with
  flat-side NNS practice; fine — document as house style. *(Convention, not error.)*

**Editor / playback / copy / JSON / print agreement:** verified consistent for the paths tested
(same `getEntrySymbol` feeds all outputs; fixture print baseline matches the JSON) — [Code/Observed].

---

## 4. UX and accessibility findings (top 8, by severity)

| ID | Sev | Label | Finding | Recommendation | Effort | Phase |
|----|-----|-------|---------|----------------|--------|-------|
| UX-1 | High | [Observed] | Every new note defaults to a **half-bar** duration. In the dominant one-chord-per-bar idiom this is wrong nearly every time; full-bar entry hides behind undocumented shift-click (the intro's "How it works" never mentions it). Charting 32 bars means 32 corrections or knowing a secret. | Default to fill-remainder-of-bar (or repeat last duration); say "shift-click = full bar" in the intro and as a first-chart hint. | S | Before launch |
| UX-2 | High | [Code] | Slash notes neither validated nor voiced (MC-4/MC-5). | Degree-token validation + play the slash as the bass voice. | S | Before launch |
| UX-3 | Med | [Code] | **Beat grid is mouse/touch only.** Fretboard and buttons are keyboard-reachable (real buttons, aria-labels, focus-visible — good), but duration editing has no keyboard path, so the workflow is not keyboard-completable. | Arrow keys / number keys adjust duration while an entry is selected. Also closes a power-user speed gap. | S–M | Fast follow |
| UX-4 | Med | [Code] | Meter-change overflow bars have no visual flag (MC-6). | Tint bars whose cell sum exceeds `cellsPerBar`; offer "rescale durations" in the confirm. | M | Fast follow |
| UX-5 | Med | [Hyp] | With several sections, the target of the next fretboard click (`currentSec`) is set by last interaction and shown only by the empty-hint or nothing. Fast charting may drop notes into the wrong section. | Highlight the active section header. Needs a real-user test to size. | S | Fast follow |
| UX-6 | Low | [Observed] | Fretboard always sharp-spelled (MC-3). | Re-spell board labels from the key. | S | Fast follow |
| UX-7 | Low | [Observed] | Key spelling disagreement across picker / letters / print header (MC-2). | Align `KEY_NAMES` with `FLAT_KEYS`. | S | Before launch (it prints) |
| UX-8 | Low | [Code] | Slash and measure-note typing checkpoints undo per keystroke — undo walks back a note letter by letter. | Debounce history for text inputs. | S | Someday |

**Accessibility posture** otherwise solid for the stack: aria-labels on icon buttons and every
note dot, `:focus-visible` outlines, 44px `pointer:coarse` targets [Code/Observed]. iPad
real-device confirmation remains open (device matrix) [Doc]. Out-of-key fretboard dots rely on
dimming plus text labels, so color isn't the sole channel [Observed].

---

## 5. Top 5 risks of the browser-storage, no-account model

1. **One autosave slot, last-writer-wins** [Observed — my eval session would have overwritten the
   real chart autosaved in this browser had I not backed it up manually; a beta user with two tabs
   or a curious click on "Load Sample" does this innocently]. *Mitigation (S):* namespaced key
   (D19) plus a two-deep "previous chart" shadow slot restorable from the File menu.
2. **Autosave failure is invisible** [Code — `catch {}`]. Private browsing, storage eviction, or a
   full quota silently disables persistence while the UI behaves identically. *Mitigation (S):*
   one-time toast on first failed write + "last saved 21:42" text in the footer.
3. **Storage eviction on iOS/iPadOS Safari** (7-day ITP eviction for unused sites) [Doc/Hyp]. A
   worship musician who charts monthly can return to nothing. *Mitigation (S):* the existing
   footer note plus a "you haven't downloaded a backup in a while" nudge after N changes; the JSON
   download already is the right durable answer.
4. **Clearing browser data = total loss, and users won't connect the two** [Doc]. The footer says
   it, but at loss time there's no recovery path. *Mitigation (S):* same nudge as #3; consider
   auto-triggering a JSON download on Clear.
5. **Print flow lives in an `about:blank` popup** [Observed]. Blocked popups are handled with a
   clear toast (D13 ✓), but the page can't be reloaded/bookmarked, and iPad Safari print behavior
   is unverified. *Mitigation (S–M):* Blob-URL or same-tab printable view as fallback.

---

## 6. Feature gaps (12, ranked — grounded in session/worship practice)

| # | Idea | User need / rationale | Effort | Phase |
|---|------|----------------------|--------|-------|
| F1 | **Voice the slash note in playback** | The bass line is the product; hearing root instead of inversion breaks trust (MC-4) | S | Before launch |
| F2 | **Smart duration default + shift-click hint** | UX-1; the single biggest per-note friction | S | Before launch |
| F3 | **Diamond (held/let-ring) marker** | A staple of real NNS charts; "1◇" says *hold*, plain "1" says *groove* — the chart is ambiguous without it | S | Fast follow |
| F4 | **Push/anticipation marks (`<` before a chord)** | Pushes are core session vocabulary; charts without them aren't rehearsal-complete for band use | M | Fast follow |
| F5 | **Small multi-chart library (3–5 named localStorage slots)** | Deferred-list item, but the single slot is also the top data-loss vector (R1) — a ring of named slots is 80% of the value of a "library" at 5% of the cost, no accounts needed | M | Fast follow |
| F6 | **Tap tempo** | Session players feel tempo, they don't know the number; tap 4, set BPM | S | Fast follow |
| F7 | **Keyboard duration entry (1–8 = beats)** | Closes the a11y gap (UX-3) and doubles charting speed for power users | S | Fast follow |
| F8 | **Section repeat counts ("Chorus ×4")** | Worship charts live on repeat structure; today it needs a measure note | S | Fast follow |
| F9 | **Duplicate section** | V2 is almost always V1's pattern; rebuild-by-hand is the current path | S | Fast follow |
| F10 | **Stage mode + Screen Wake Lock** *(lateral)* | iPad on a music stand sleeps mid-song; one tap = fretboard/editor hidden, big type, `navigator.wakeLock` held during playback — pure browser API, fits constraints | S–M | Fast follow |
| F11 | **Walk-up/walk-down glyphs between chords** *(lateral, bass-native)* | The idiom bass charts add beyond generic NNS; nobody else's tool does it well — differentiator | M | Someday |
| F12 | **Paste-to-chart ("1 4 5 1" → bars)** *(lateral)* | Songwriters sketch in text; a forgiving parser turns a voice-memo note into a starting chart | M | Someday |

**Do not build now:** audio-to-chart, MIDI, accounts/sync, ChordPro/MusicXML, minor-key mode —
the deferred list stands; nothing I found argues for reprioritizing any of them ahead of the
above. **Nothing currently in the app needs cutting** — the feature set is already tight; the
simplification opportunities are documentation-level (drift items in §2), not feature-level.

---

## 7. Ranked Top 5 (defects and opportunities together)

1. **C2/F1 — slash validation + slash playback.** Correctness of the instrument the tool is named
   for; small effort, direct trust payoff; outranks #2 because it can mislead *even when nothing
   goes wrong with storage*.
2. **C1/F2 — duration default + shift-click discoverability.** Touches every note of every chart;
   outranks #3 because friction is certain while data loss is probabilistic.
3. **C3/C4 — autosave failure visibility + key namespacing (+ shadow slot).** The remaining
   credible data-loss story; outranks #4 because losing a chart ends a beta relationship.
4. **F3+F4 — diamond and push marks.** The gap between "prints a chart" and "prints a chart a
   band reads without questions"; outranks #5 because it affects the printed artifact.
5. **§2 doc drift cleanup + stale sample baseline.** Zero user impact, but it's the difference
   between a repo that external reviewers (and future you) can trust and one they can't.

---

## 8. Questions for the product owner

1. Should playback voice the slash note *instead of* the root, or root-then-slash? (Affects F1.)
2. Slash entry: restrict to degree tokens, or accept letters and auto-convert in the current key?
3. Is "equal splits underline, no ticks" your intended house style everywhere, or should ticks be
   forceable per bar for readability in dense charts?
4. For beta: is one autosave slot acceptable with a stronger backup nudge, or do you want the
   shadow-slot/small-library safety first?
5. When does the iPad Safari device pass happen — before invites, or as the pilot's first task?

## 9. Five usability-test tasks for real musicians

1. Unaided, chart the intro of a song they know (4/4, four chords) within ten minutes — watch for
   the half-bar default and shift-click discovery (UX-1).
2. Split one bar 3+1 beats, add a slash chord, then print — is the printed bar read correctly by a
   second musician? (ticks, underline, slash).
3. Change the meter of an existing chart, decide it was a mistake, and recover (UX-4, undo).
4. Save to file, clear browser data, reload, and recover the chart from the file (R4 messaging).
5. Full workflow on iPad in landscape on a music stand, including playback during a run-through
   (touch targets, editor dock, screen sleep — F10).
