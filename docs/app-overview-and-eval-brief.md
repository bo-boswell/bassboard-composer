# Bassboard Composer — Overview & Evaluation Brief

*Living document. Current build: v0.8.0. Live (unlisted beta): https://bo-boswell.github.io/bassboard-composer/*

---

## 1. What it is

**Bassboard Composer** is a browser-based tool for building **Nashville Number System (NNS)**
charts by clicking the notes you'd play on a **virtual bass fretboard**. Instead of typing chord
symbols, a bass player clicks notes on the neck the way they think about the music, and the app
turns those into a printable number chart.

**The promise:** *Click the notes you play on a bass fretboard and turn them into a printable
Nashville Number System chart.*

It was built by a working bass player (not a professional developer, with AI assistance) to chart
real recording-session songs, then hardened toward a small, dependable public beta.

## 2. Who it's for

- **Primary:** bass players and worship/session musicians who build number charts and think on the fretboard.
- **Secondary:** songwriters and casual players who want to sketch chord progressions quickly.
- Range of proficiency, from "knows a few chords" to touring/session pros.

## 3. Core workflow

1. Pick **key**, **meter**, and **tuning**.
2. **Start a Chart**, then click fretboard notes — each becomes a scale-degree chord.
3. Set each chord's **length** by dragging on the beat grid; add **quality** (minor, 7th…), a
   **slash** bass note, or a **measure note**.
4. Group the chart into named **sections** (Intro, Verse, Chorus…).
5. **Play** it back (with optional metronome), **View/Print** a clean chart, or **Save** a backup file.

## 4. Feature list (current)

**Fretboard & input**
- Interactive 4-string bass fretboard (15 frets + open strings); click to hear a note or add it to the chart.
- Fretboard label modes: note names / fret numbers / Nashville numbers / off.
- Tunings: Standard (E A D G), Drop D, ½-step down.
- Collapsible fretboard to free up room for the chart.

**Key, meter, transpose**
- Keys C–B; one-tap **transpose** up/down (re-spells the whole chart live).
- Meters: 4/4, 3/4, 2/4, 6/8.

**Charting**
- Scale-degree chords with auto-diatonic minor on the 2 and 6.
- Qualities: major, minor, diminished, augmented, sus, dominant 7, maj7, m7 (hover tooltips).
- Slash / bass notes.
- **Sixteenth-note beat grid** — drag to set any duration (sixteenth → whole note, dotted values).
- **Rests** (silent) and **muted / dead notes** (percussive), plus **repeat-bar (%)** symbol.
- **Measure notes** (per-bar text, e.g. "Drums only, Build").
- **Sections**: inline-named, add (＋ per section and at the end), reorder (▲▼), delete (✕).
- Phrase **line breaks** within a section.
- Multi-step **undo/redo** (⌘Z / ⌘⇧Z), **insert-after** (duplicate a chord), mid-chart editing.
- **Chart display toggle: Nashville numbers ↔ chord letters** (letters computed from the key).

**Playback**
- 3-way transport: **Play / Play + Metronome / Metronome only**.
- Meter-aware metronome with a one-bar count-in; can be toggled live during playback.
- BPM + speed slider (25–150%); per-section **loop**; playing chord is highlighted.
- Web Audio synthesis (no audio files) — a simple bass tone and a percussive muted-note sound.

**Output**
- **Print / Save as PDF**: clean, auto one/two-column flowing number chart with section names,
  split-bar underlines, and beat tick marks; follows the numbers/letters toggle.
- **Copy chart**: plain text and rich formatted (includes writer and measure notes).

**Files & data**
- **Save / Load** JSON; loads and losslessly migrates older files.
- **Autosave** to the browser; reopens where you left off.
- Import validation (bad files are rejected without harming your work).
- Built-in **sample chart** + first-run intro and "how it works".

## 5. Architecture & hard constraints

- **Single static web app**: `index.html` + `app.js` + `styles.css`. **No backend, no accounts, no
  database, no third-party libraries, no network calls.** Everything runs in the browser and nothing
  leaves it. Chart data lives in browser storage; the JSON download is the durable backup.
- Hosted on **GitHub Pages**; **source-available** (readable, all rights reserved).
- Target devices: **desktop + iPad-landscape**. Phone is not layout-optimized.
- Personal, non-commercial project in private beta. Simplicity and dependability over breadth.

## 6. Deliberately deferred / out of scope (today)

These are known and intentionally not built yet — treat as "not gaps unless you can argue otherwise":
phone-optimized layout; accounts / cloud sync / multi-song library / setlists; five- and six-string
instruments; a dedicated minor-key mode (it's major-key NNS today); MIDI in/out; audio-to-chart;
ChordPro / MusicXML import-export; shareable links; lyrics; offline/PWA install.

---

## 7. Evaluation brief — for another AI

*Paste the section below (plus this whole document as context) into another AI system.*

**Before sending, attach:** (1) this document, (2) `app.js`, (3) a real saved chart JSON
(e.g., `your-song.json`), (4) the printed-chart output for that same song
(print HTML or PDF). The prompt is built around these artifacts — don't skip them.

**Adjust for the target:** if the AI can actually browse and operate the live app
(e.g., an agentic system with browser access), delete the "you probably cannot interact"
paragraph and instead require it to exercise the live app before writing anything.

> You are reviewing **Bassboard Composer** to help me decide what to build, fix, or cut
> before opening the beta beyond a handful of users. The full overview doc is above.
> Attached: (1) a real saved chart JSON, (2) the printed-chart output for that same
> song, (3) `app.js`. Live app: https://bo-boswell.github.io/bassboard-composer/ — repo:
> https://github.com/bo-boswell/bassboard-composer (single index.html + app.js +
> styles.css, vanilla JS, no libraries).
>
> Hard constraints, non-negotiable: single static file set, no backend, no accounts,
> no paid services, browser-only, desktop + iPad-landscape. The "Deliberately
> deferred" list in the doc is known — raise those items only to argue a
> reprioritization. Do not re-list existing features. Known bugs are already
> tracked separately; focus on design and gaps, not bug-hunting.
>
> Epistemics rule: you probably cannot interact with the running app. Tag every
> finding **[Observed]** (seen in code or the attached artifacts), **[Inferred]** (from
> the doc), or **[Assumed]**. Never describe UI behavior as if you experienced it.
> No praise or preamble — findings only.
>
> Produce, in this order and weighting:
>
> 1. **FEATURE GAPS** (the priority — spend half your effort here). 12–15 ideas that
>    make this meaningfully better for bass players, worship/session musicians,
>    and songwriters, at least 4 non-obvious or lateral. Ground them in how
>    working musicians actually handle charts today (including what tools like
>    OnSong or 1Chart solve that this doesn't). For each: user need, one-line
>    description, why it matters, effort S/M/L — where effort assumes an
>    AI-assisted non-professional developer in a ~2,100-line vanilla JS codebase.
>
> 2. **LAUNCH CALL.** Sort your ideas into before-launch / fast-follow / someday,
>    plus anything currently in the app you'd cut to keep the beta small. Tie
>    each before-launch item to the decision: what goes wrong at launch without it?
>
> 3. **MUSICAL-CORRECTNESS AUDIT** of the attached JSON and printed chart. Check
>    accidental spelling, minor-key handling, 6/8 notation, tick marks, rests,
>    split bars. State which NNS convention you're assuming; where conventions
>    differ across scenes (Nashville session vs. worship), say so rather than
>    declaring one wrong.
>
> 4. **UX REVIEW**, capped at your top 8 findings, ordered by severity, on the core
>    workflow (key/meter/tuning → chart → durations → sections → playback →
>    print). Only findings supportable from the code, doc, or artifacts — tag each.
>
> 5. **TOP 5 RISKS** of the browser-storage, no-account model, each with the cheapest
>    mitigation that fits the constraints.
>
> Close with: your three highest-conviction recommendations overall, and the one
> thing most likely to make a working session bassist abandon the tool in the
> first ten minutes.
