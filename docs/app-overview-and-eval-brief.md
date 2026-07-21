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

> You are an expert product and UX reviewer with a background in music software and Nashville Number
> System charting. Above is an overview of **Bassboard Composer**, a source-available, single-file
> web app. The live beta is at https://bo-boswell.github.io/bassboard-composer/ and the code is
> public (HTML/CSS/JS, readable in one repo) — inspect both if you can.
>
> Please produce an evaluation with these parts:
>
> 1. **Heuristic UX review** — walk the core workflow (set key/meter/tuning → chart notes → set
>    durations → sections → playback → print/save). Identify friction, confusing moments, and
>    anything that violates least-surprise, grouped by severity.
> 2. **Feature ideas I might be missing** — this is the priority. Suggest capabilities that would
>    make the tool meaningfully more useful for bass players, worship/session musicians, and
>    songwriters. Favor ideas that fit the constraints (single static file, no backend/accounts,
>    self-contained, browser-only). For each idea give: the user need, a one-line description, rough
>    effort (S/M/L), and why it matters. Include at least a few **non-obvious / lateral** ideas.
> 3. **Prioritization** — rank your feature ideas into "before public launch," "fast follow," and
>    "someday," and say what you'd cut to keep the beta small and dependable.
> 4. **Musical-correctness check** — flag anywhere the app's notation or music behavior looks wrong
>    or oversimplified (e.g. how it handles minor keys, accidentals/spelling, 6/8, tick marks,
>    rests). Ask questions rather than assuming NNS rules.
> 5. **Risks & failure modes** — where might a real musician lose work, get a wrong-sounding chart,
>    or give up? What's fragile about a browser-storage, no-account model?
>
> Constraints to respect: keep suggestions compatible with a self-contained static web app (no
> server, accounts, or paid services required to run it). The items in "Deliberately deferred" are
> known — only raise them if you have a strong reason to reprioritize. Don't re-list features that
> already exist. Be specific and opinionated; a clear recommendation beats a list of options.
