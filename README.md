# Bassboard Composer

Build [Nashville Number System](https://en.wikipedia.org/wiki/Nashville_Number_System) charts by clicking notes on a virtual bass fretboard.

> **The promise:** Click the notes you play on a bass fretboard and turn them into a printable Nashville Number System chart.

## Status

Private beta in progress. **Not yet ready for public use** — actively being hardened toward a small, dependable public beta. The app has already been used to chart real recording-session songs, but known bugs, output-layout work, testing, and a first-run experience remain before launch.

This is a personal project. It is **source-available**: you may read the code, but all rights are reserved (see [LICENSE](LICENSE)).

## What it does today

- Interactive four-string bass fretboard (15 frets), with Standard, Drop D, and ½-step-down tunings (older files saved in other tunings still load)
- Note / fret / NNS / no-label views on the fretboard
- Keys C–B, meters 4/4, 3/4, 2/4, and 6/8; one-tap transpose
- Named sections (add / reorder / delete); chord durations on a sixteenth-note beat grid, qualities, slash chords (voiced in playback), rests, muted notes, repeat bars, measure notes
- Chart display as Nashville numbers or chord letters
- Chart playback with metronome, speed control, and section looping (Web Audio — no audio files)
- Browser-local autosave with a recoverable previous-chart slot, plus JSON save/load
- Plain-text and formatted chart copy, and a print / PDF chart view

## Architecture

Three static files — `index.html` + `styles.css` + `app.js` — vanilla JS with no backend, no build step, no third-party libraries, and no network calls. Everything runs in the browser and nothing leaves it. Static hosting only.

- `index.html` / `styles.css` / `app.js` — the live app.
- `bassboard-composer.html` — the frozen **May 26, 2026 single-file baseline**, preserved as development history. Do not edit.
- `bassboard-composer-v0.html` — an earlier build, kept as history.

## Development

Development runs in milestones (M0–M8), one at a time, each with acceptance criteria and manual testing before the next begins. See `capture-log.md` for the running development journal.

The four saved `.json` charts used as regression fixtures contain **unreleased song material** and are deliberately git-ignored. They are never committed.

## Data & privacy

Your chart lives in your browser's local storage. Nothing is uploaded. To keep a chart or move it between devices, use **Save** to download the JSON file. Clearing your browser data will erase an unsaved chart.
