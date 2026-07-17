
  /* ── Constants ───────────────────────────────────── */

  const CHROMATIC    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const MAJOR_SCALE  = [0, 2, 4, 5, 7, 9, 11];
  const DEGREE_NAMES = ['1','2','3','4','5','6','7'];
  const CHROM_DEG    = {1:'b2', 3:'b3', 6:'b5', 8:'b6', 10:'b7'};
  const KEY_NAMES    = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

  /*
   * cellsPerBar  = how many cells the beat grid shows (= time sig numerator)
   * cellsPerComp = how many cells equal one NNS "chord slot" in text output
   *                (1 for simple meters; 3 for 6/8 compound beats)
   * cellName     = plain-English name for one cell
   */
  // Accent level per cell position within a bar ('strong' = downbeat, 'medium' = secondary beat)
  const METRO_ACCENT = {
    '4/4': ['strong', 'soft', 'medium', 'soft'],
    '3/4': ['strong', 'soft', 'soft'],
    '2/4': ['strong', 'soft'],
    '6/8': ['strong', 'soft', 'soft', 'medium', 'soft', 'soft'],
  };

  const TIME_SIG_DATA = {
    '4/4': { cellsPerBar: 4, cellsPerComp: 1, cellName: 'quarter note'  },
    '3/4': { cellsPerBar: 3, cellsPerComp: 1, cellName: 'quarter note'  },
    '2/4': { cellsPerBar: 2, cellsPerComp: 1, cellName: 'quarter note'  },
    '6/8': { cellsPerBar: 6, cellsPerComp: 3, cellName: 'eighth note'   },
  };

  /* Human-readable note-value names for common cell counts */
  const NOTE_VALUE_LABELS = {
    '4/4': { 1:'quarter note', 2:'half note', 3:'dotted half', 4:'whole note (full bar)' },
    '3/4': { 1:'quarter note', 2:'half note', 3:'dotted half (full bar)' },
    '2/4': { 1:'quarter note', 2:'half note (full bar)' },
    '6/8': { 1:'eighth note', 2:'quarter note', 3:'dotted quarter', 4:'dotted quarter + eighth', 6:'dotted half (full bar)' },
  };

  const TUNINGS = {
    standard: [
      { name:'G', midi:55, thickness:1.5 },
      { name:'D', midi:50, thickness:2   },
      { name:'A', midi:45, thickness:2.5 },
      { name:'E', midi:40, thickness:3   },
    ],
    dropD: [
      { name:'G', midi:55, thickness:1.5 },
      { name:'D', midi:50, thickness:2   },
      { name:'A', midi:45, thickness:2.5 },
      { name:'D', midi:38, thickness:3   },
    ],
    halfDown: [
      { name:'G♭', midi:54, thickness:1.5 },
      { name:'D♭', midi:49, thickness:2   },
      { name:'A♭', midi:44, thickness:2.5 },
      { name:'E♭', midi:39, thickness:3   },
    ],
    fullDown: [
      { name:'F', midi:53, thickness:1.5 },
      { name:'C', midi:48, thickness:2   },
      { name:'G', midi:43, thickness:2.5 },
      { name:'D', midi:38, thickness:3   },
    ],
    dropC: [
      { name:'F', midi:53, thickness:1.5 },
      { name:'C', midi:48, thickness:2   },
      { name:'G', midi:43, thickness:2.5 },
      { name:'C', midi:36, thickness:3   },
    ],
  };

  let STRINGS = TUNINGS.standard;

  const FRET_COUNT = 15;
  const MARKERS    = { 3:1, 5:1, 7:1, 9:1, 12:2, 15:1 };

  const LABEL_MODES = ['notes','frets','nns','none'];
  const LABEL_TEXT  = { notes:'Labels: Notes', frets:'Labels: Frets', nns:'Labels: NNS', none:'Labels: Off' };
  let labelIndex = 0;

  /* ── Audio ───────────────────────────────────────── */

  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function midiToHz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  let masterPlayGain = null;

  function ensureMasterGain() {
    ensureAudio();
    if (!masterPlayGain) {
      masterPlayGain = audioCtx.createGain();
      masterPlayGain.connect(audioCtx.destination);
    }
    return masterPlayGain;
  }

  // durationSecs: if provided, note sustains for that duration then releases cleanly.
  // If omitted, falls back to a natural pluck decay (used for fretboard clicks).
  function synthNote(midi, startTime, dest, durationSecs) {
    const ctx = audioCtx, freq = midiToHz(midi), now = startTime;

    const gain   = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type    = 'lowpass';
    filter.Q.value = 1.0;

    let stopAt;
    if (durationSecs && durationSecs > 0.05) {
      // Sustain envelope: attack → decay to sustain level → hold → release
      const atkEnd   = now + 0.010;
      const decEnd   = now + 0.160;
      const relStart = now + Math.max(0.160, durationSecs - 0.08);
      const relEnd   = now + durationSecs + 0.05;
      gain.gain.setValueAtTime(0,    now);
      gain.gain.linearRampToValueAtTime(0.5,  atkEnd);
      gain.gain.exponentialRampToValueAtTime(0.32, decEnd);
      gain.gain.setValueAtTime(0.32, relStart);
      gain.gain.exponentialRampToValueAtTime(0.001, relEnd);
      // Filter: quick bright transient then settle warm
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.10);
      stopAt = relEnd + 0.02;
    } else {
      // Pluck envelope (fretboard clicks)
      gain.gain.setValueAtTime(0,     now);
      gain.gain.linearRampToValueAtTime(0.55, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.45);
      stopAt = now + 2.1;
    }

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;

    const osc2    = ctx.createOscillator();
    osc2.type     = 'sine';
    osc2.frequency.value = freq / 2;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.45;

    osc1.connect(gain);
    osc2.connect(subGain);
    subGain.connect(gain);
    gain.connect(filter);
    filter.connect(dest);

    osc1.start(now); osc2.start(now);
    osc1.stop(stopAt); osc2.stop(stopAt);
  }

  function playNote(midi) {
    ensureAudio();
    synthNote(midi, audioCtx.currentTime, audioCtx.destination); // no durationSecs → pluck
  }

  /* ── Playback ────────────────────────────────────── */

  const DEGREE_TO_SEMI = {
    '1':0,'b2':1,'2':2,'b3':3,'3':4,'4':5,'b5':6,'5':7,'b6':8,'6':9,'b7':10,'7':11
  };

  function entryToMidi(entry) {
    if (entry.degree === '%') return (chart.keyMidi % 12) + 36; // root note as fallback
    const semi = DEGREE_TO_SEMI[entry.degree] ?? 0;
    let midi = (chart.keyMidi % 12) + 36 + semi; // root anchored at octave 2
    if (midi > 55) midi -= 12;                    // keep within comfortable bass range
    return midi;
  }

  function secsPerCell(bpm) {
    // 6/8: BPM = dotted-quarter = 3 eighths; otherwise BPM = quarter note
    return chart.timeSig === '6/8' ? 20 / bpm : 60 / bpm;
  }

  let isPlaying        = false;
  let playbackTimeouts = [];
  let metronomeOn      = false;

  function scheduleClick(time, accent, medium) {
    const ctx  = audioCtx;
    const freq = accent ? 1200 : medium ? 900 : 700;
    const vol  = accent ? 0.38 : medium ? 0.26 : 0.18;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0,   time);
    gain.gain.linearRampToValueAtTime(vol,   time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.065);
    osc.connect(gain);
    gain.connect(ensureMasterGain());
    osc.start(time);
    osc.stop(time + 0.075);
  }

  function updatePlayBtn() {
    const btn = document.getElementById('play-btn');
    btn.textContent = isPlaying ? '■ Stop' : '▶ Play';
    btn.classList.toggle('active', isPlaying);
  }

  function highlightPlayingEntry(id) {
    document.querySelectorAll('.entry-token').forEach(t => {
      t.classList.toggle('playing-now', id !== null && parseInt(t.dataset.entryId) === id);
    });
  }

  function stopPlayback() {
    isPlaying = false;
    playbackTimeouts.forEach(clearTimeout);
    playbackTimeouts = [];
    if (masterPlayGain) {
      const t = audioCtx.currentTime;
      masterPlayGain.gain.setValueAtTime(masterPlayGain.gain.value, t);
      masterPlayGain.gain.linearRampToValueAtTime(0, t + 0.08);
      setTimeout(() => { if (masterPlayGain) { masterPlayGain.disconnect(); masterPlayGain = null; } }, 200);
    }
    highlightPlayingEntry(null);
    updatePlayBtn();
  }

  function startPlayback() {
    const hasEntries = chart.sections.some(s => s.entries.length > 0);
    if (!hasEntries && !metronomeOn) return;
    ensureAudio();

    const rawBpm = Math.max(40, Math.min(300, parseInt(document.getElementById('bpm-input').value) || 120));
    const speed  = (parseInt(document.getElementById('speed-range').value) || 100) / 100;
    const bpm    = rawBpm * speed;
    const spc    = secsPerCell(bpm);

    isPlaying = true;
    updatePlayBtn();

    const mg = ensureMasterGain();
    mg.gain.setValueAtTime(1, audioCtx.currentTime);

    if (!hasEntries) {
      const pattern = METRO_ACCENT[chart.timeSig] || METRO_ACCENT['4/4'];
      const end = audioCtx.currentTime + 0.05 + 480;
      let mt = audioCtx.currentTime + 0.05, cell = 0;
      while (mt < end) {
        const level = pattern[cell % chart.cellsPerBar] || 'soft';
        scheduleClick(mt, level === 'strong', level === 'medium');
        mt += spc; cell++;
      }
      return;
    }

    const countInSecs = metronomeOn ? 4 * spc * chart.cellsPerComp : 0;
    let t = audioCtx.currentTime + 0.05 + countInSecs;

    const loopIdx  = chart.loopSection;
    const loopReps = loopIdx !== null ? 8 : 1;
    const sectionsToPlay = loopIdx !== null ? [chart.sections[loopIdx]] : chart.sections;

    for (let rep = 0; rep < loopReps; rep++) {
      let prevNonRepeatBar = null;
      for (const sec of sectionsToPlay) {
        const bars = groupIntoBars(sec.entries, chart.cellsPerBar);
        for (const bar of bars) {
          const isRepeat = bar.length === 1 && bar[0].degree === '%';
          const playBar  = isRepeat ? prevNonRepeatBar : bar;
          if (!isRepeat) prevNonRepeatBar = bar;
          if (!playBar) { t += chart.cellsPerBar * spc; continue; }
          for (const entry of playBar) {
            synthNote(entryToMidi(entry), t, mg, entry.duration * spc);
            if (!isRepeat) {
              const delayMs = (t - audioCtx.currentTime) * 1000;
              playbackTimeouts.push(setTimeout(() => highlightPlayingEntry(entry.id), delayMs));
            }
            t += entry.duration * spc;
          }
        }
      }
    }

    if (metronomeOn) {
      const pattern = METRO_ACCENT[chart.timeSig] || METRO_ACCENT['4/4'];
      let mt = audioCtx.currentTime + 0.05, cell = 0;
      while (mt < t) {
        const level = pattern[cell % chart.cellsPerBar] || 'soft';
        scheduleClick(mt, level === 'strong', level === 'medium');
        mt += spc; cell++;
      }
    }

    const totalMs = (t - audioCtx.currentTime) * 1000;
    playbackTimeouts.push(setTimeout(stopPlayback, totalMs));
  }

  /* ── NNS utilities ───────────────────────────────── */

  function getNNSDegree(noteMidi, keyMidi) {
    const interval = (noteMidi - keyMidi + 120) % 12;
    const idx = MAJOR_SCALE.indexOf(interval);
    return idx >= 0 ? DEGREE_NAMES[idx] : (CHROM_DEG[interval] || '?');
  }

  function getNoteValueLabel(cells, timeSig) {
    const map = NOTE_VALUE_LABELS[timeSig];
    if (map && map[cells]) return map[cells];
    const d = TIME_SIG_DATA[timeSig];
    return `${cells} ${d ? d.cellName : 'beat'}${cells !== 1 ? 's' : ''}`;
  }

  /* ── Chart state ─────────────────────────────────── */

  let chart = {
    keyMidi:      9,
    timeSig:      '4/4',
    cellsPerBar:  4,
    cellsPerComp: 1,
    sections:     [{ name: '', entries: [], breaks: [], barNotes: {} }],
    currentSec:   0,
    selectedId:   null,
    lastAddedId:  null,
    nextId:       0,
    loopSection:  null,
  };

  let transcribeMode = false;

  /* ── Fretboard ───────────────────────────────────── */

  function noteName(midi)   { return CHROMATIC[midi % 12]; }
  function noteOctave(midi) { return Math.floor(midi / 12) - 1; }

  function buildFretboard() {
    const fb = document.getElementById('fretboard');
    appendRuler(fb);
    STRINGS.forEach(str => {
      const label = document.createElement('div');
      label.className = 'string-label-cell';
      label.textContent = str.name;
      fb.appendChild(label);

      for (let f = 0; f <= FRET_COUNT; f++) {
        const midi   = str.midi + f;
        const name   = noteName(midi);
        const oct    = noteOctave(midi);
        const isRoot = name === str.name;

        const cell = document.createElement('div');
        cell.className = 'fret-cell' + (f === 0 ? ' nut-col' : '');
        cell.style.setProperty('--sh', str.thickness + 'px');

        const btn = document.createElement('button');
        btn.className = 'note-dot' + (isRoot ? ' root' : '');
        btn.title = `${name}${oct} · fret ${f}`;
        btn.setAttribute('aria-label', `Play ${name}${oct}, fret ${f}, ${str.name} string`);
        btn.dataset.midi = midi;

        const mkSpan = (cls, txt) => {
          const s = document.createElement('span');
          s.className = 'lbl ' + cls;
          s.textContent = txt;
          s.setAttribute('aria-hidden', 'true');
          return s;
        };

        btn.appendChild(mkSpan('lbl-note', name));
        btn.appendChild(mkSpan('lbl-fret', f));
        btn.appendChild(mkSpan('lbl-nns',  ''));

        btn.addEventListener('click', (ev) => {
          playNote(midi);
          triggerAnimation(btn);
          if (transcribeMode) {
            if (!ev.shiftKey && chart.selectedId !== null) {
              // Edit mode: replace degree of selected entry
              const entry = findEntry(chart.selectedId);
              if (entry) {
                const newDeg = getNNSDegree(midi, chart.keyMidi);
                const DIATONIC = { '2': '-', '6': '-' };
                entry.degree  = newDeg;
                entry.quality = DIATONIC[newDeg] || '';
                renderChart();
              }
            } else {
              addEntry(midi, ev.shiftKey);
            }
          }
        });

        cell.appendChild(btn);
        fb.appendChild(cell);
      }
    });
    appendMarkers(fb);
    appendRuler(fb);
  }

  function appendRuler(fb) {
    const corner = document.createElement('div');
    corner.className = 'ruler-cell';
    fb.appendChild(corner);

    const open = document.createElement('div');
    open.className = 'ruler-cell nut-col';
    open.textContent = '0';
    fb.appendChild(open);

    for (let f = 1; f <= FRET_COUNT; f++) {
      const c = document.createElement('div');
      c.className = 'ruler-cell';
      c.textContent = f;
      fb.appendChild(c);
    }
  }

  function appendMarkers(fb) {
    const spacer = document.createElement('div');
    spacer.className = 'marker-cell';
    fb.appendChild(spacer);

    for (let f = 0; f <= FRET_COUNT; f++) {
      const c = document.createElement('div');
      const n = MARKERS[f] || 0;
      c.className = 'marker-cell' + (f === 0 ? ' nut-col' : '');
      if (n === 2) c.textContent = '● ●';
      else if (n === 1) c.textContent = '●';
      fb.appendChild(c);
    }
  }

  function triggerAnimation(btn) {
    btn.classList.remove('playing');
    void btn.offsetWidth;
    btn.classList.add('playing');
    btn.addEventListener('animationend', () => btn.classList.remove('playing'), { once: true });
  }

  function updateNNSLabels() {
    document.querySelectorAll('.note-dot').forEach(btn => {
      const midi     = parseInt(btn.dataset.midi);
      const interval = (midi - chart.keyMidi + 120) % 12;
      const degree   = getNNSDegree(midi, chart.keyMidi);

      const span = btn.querySelector('.lbl-nns');
      if (span) span.textContent = degree;

      btn.classList.remove('nns-root', 'nns-in', 'nns-out');
      if (interval === 0)                      btn.classList.add('nns-root');
      else if (MAJOR_SCALE.includes(interval)) btn.classList.add('nns-in');
      else                                     btn.classList.add('nns-out');
    });
  }

  /* ── Label toggle ────────────────────────────────── */

  document.getElementById('label-btn').addEventListener('click', () => {
    labelIndex = (labelIndex + 1) % LABEL_MODES.length;
    const mode = LABEL_MODES[labelIndex];
    document.body.className = document.body.className.replace(/label-\S+/g, '').trim() + ' label-' + mode;
    const btn = document.getElementById('label-btn');
    btn.textContent = LABEL_TEXT[mode];
    btn.classList.toggle('active', mode !== 'none');
  });

  /* ── Key / time sig / tuning controls ───────────── */

  document.getElementById('tuning-select').addEventListener('change', e => {
    STRINGS = TUNINGS[e.target.value] || TUNINGS.standard;
    const fb = document.getElementById('fretboard');
    fb.innerHTML = '';
    buildFretboard();
    updateNNSLabels();
  });

  document.getElementById('key-select').addEventListener('change', e => {
    chart.keyMidi = parseInt(e.target.value);
    updateNNSLabels();
    renderChart();
  });

  document.getElementById('key-down-btn').addEventListener('click', () => {
    chart.keyMidi = (chart.keyMidi + 11) % 12;
    document.getElementById('key-select').value = chart.keyMidi;
    updateNNSLabels(); renderChart();
  });

  document.getElementById('key-up-btn').addEventListener('click', () => {
    chart.keyMidi = (chart.keyMidi + 1) % 12;
    document.getElementById('key-select').value = chart.keyMidi;
    updateNNSLabels(); renderChart();
  });

  document.getElementById('time-select').addEventListener('change', e => {
    const map = { '44':'4/4', '34':'3/4', '24':'2/4', '68':'6/8' };
    chart.timeSig     = map[e.target.value] || '4/4';
    chart.cellsPerBar = TIME_SIG_DATA[chart.timeSig].cellsPerBar;
    chart.cellsPerComp= TIME_SIG_DATA[chart.timeSig].cellsPerComp;
    renderChart();
  });

  /* ── Transcribe mode toggle ──────────────────────── */

  document.getElementById('transcribe-btn').addEventListener('click', () => {
    transcribeMode = !transcribeMode;
    const panel = document.getElementById('transcribe-panel');
    const btn   = document.getElementById('transcribe-btn');
    panel.classList.toggle('hidden', !transcribeMode);
    btn.classList.toggle('active', transcribeMode);
    btn.textContent = transcribeMode ? 'Transcribing…' : 'Transcribe';
    document.body.classList.toggle('transcribe-active', transcribeMode);

    if (transcribeMode && labelIndex === 0) {
      labelIndex = LABEL_MODES.indexOf('nns');
      document.body.className = document.body.className.replace(/label-\S+/g, '').trim() + ' label-nns';
      const lb = document.getElementById('label-btn');
      lb.textContent = LABEL_TEXT['nns'];
      lb.classList.add('active');
    }
  });

  /* ── Chart entry management ──────────────────────── */

  function addEntry(noteMidi, fullMeasure = false) {
    const sec = chart.sections[chart.currentSec];
    if (sec.entries.length === 0 && !sec.name) {
      const v = document.getElementById('section-name').value.trim();
      if (v) sec.name = v;
    }
    const totalCells  = sec.entries.reduce((s, e) => s + e.duration, 0);
    const usedInBar   = totalCells % chart.cellsPerBar;
    const remaining   = usedInBar === 0 ? chart.cellsPerBar : chart.cellsPerBar - usedInBar;
    const preferred   = fullMeasure ? chart.cellsPerBar : Math.ceil(chart.cellsPerBar / 2);
    const dur         = Math.min(preferred, remaining);
    const degree = getNNSDegree(noteMidi, chart.keyMidi);
    const DIATONIC = { '2': '-', '6': '-' };
    const entry = { id: chart.nextId++, degree,
                    quality: DIATONIC[degree] || '', slash: '', duration: dur };
    sec.entries.push(entry);
    chart.lastAddedId = entry.id;
    chart.selectedId  = null;
    renderChart();
  }

  function addRepeatBar() {
    const sec = chart.sections[chart.currentSec];
    if (!sec.entries.length) return;
    const totalCells = sec.entries.reduce((s, e) => s + e.duration, 0);
    if (totalCells % chart.cellsPerBar !== 0) return;
    const entry = { id: chart.nextId++, degree: '%', quality: '', slash: '', duration: chart.cellsPerBar };
    sec.entries.push(entry);
    chart.lastAddedId = entry.id;
    chart.selectedId  = null;
    renderChart();
  }

  function getEntrySymbol(e) {
    return e.degree + e.quality + (e.slash ? '/' + e.slash : '');
  }

  function isSubdivision(e) {
    return e.duration < chart.cellsPerComp;
  }

  function underlineNNS(sym) {
    return [...sym].map(c => c + '̲').join('');
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Returns tick count for an entry when its bar has unequal durations; 0 = no ticks
  function getTickCount(entry, bar) {
    if (bar.length <= 1) return 0;
    const allEqual = bar.every(e => e.duration === bar[0].duration);
    if (allEqual) return 0;
    return entry.duration; // ticks = cell count (eighth notes in 6/8, quarter notes in 4/4)
  }

  function tickStr(n) { return "'".repeat(n); }

  function sectionAbbr(name) {
    if (!name) return '';
    const lower = name.trim().toLowerCase();
    const map = {
      'intro': 'In', 'introduction': 'In',
      'verse': 'V',
      'pre-chorus': 'PC', 'prechorus': 'PC', 'pre chorus': 'PC',
      'chorus': 'Ch',
      'bridge': 'B',
      'refrain': 'Ref',
      'outro': 'Out',
      'solo': 'Sol',
      'tag': 'Tag',
      'interlude': 'Int',
      'instrumental': 'Inst',
    };
    if (map[lower]) return map[lower];
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return words.map(w => w[0].toUpperCase()).join('').slice(0, 4);
    return name.slice(0, 3);
  }

  function getBarIndexForEntry(entryId) {
    for (const sec of chart.sections) {
      const bars = groupIntoBars(sec.entries, chart.cellsPerBar);
      for (let i = 0; i < bars.length; i++) {
        if (bars[i].some(e => e.id === entryId)) return { sec, barIdx: i };
      }
    }
    return null;
  }

  function findEntry(id) {
    for (const sec of chart.sections) {
      const e = sec.entries.find(x => x.id === id);
      if (e) return e;
    }
    return null;
  }

  function groupIntoBars(entries, cellsPerBar) {
    const bars = [];
    let bar = [], sum = 0;
    for (const e of entries) {
      bar.push(e);
      sum += e.duration;
      if (sum >= cellsPerBar - 0.01) { bars.push(bar); bar = []; sum = 0; }
    }
    if (bar.length) bars.push(bar);
    return bars;
  }

  /*
   * Returns bar context for the given entry ID:
   *   bar          – array of entries in that bar
   *   cellMap      – array length cellsPerBar: {entryId, isSelected}
   *   entryStart   – cell index where this entry begins
   *   maxCells     – maximum cells this entry can occupy (can't overlap following entries)
   *   entryIndex   – position of entry in bar array
   */
  function getBarInfo(entryId) {
    for (const sec of chart.sections) {
      const bars = groupIntoBars(sec.entries, chart.cellsPerBar);
      for (const bar of bars) {
        let pos = 0, foundIdx = -1, entryStart = 0;

        for (let i = 0; i < bar.length; i++) {
          if (bar[i].id === entryId) { foundIdx = i; entryStart = pos; }
          pos += bar[i].duration;
        }
        if (foundIdx < 0) continue;

        let followingCells = 0;
        for (let i = foundIdx + 1; i < bar.length; i++) followingCells += bar[i].duration;
        const maxCells = chart.cellsPerBar - entryStart - followingCells;

        const cellMap = [];
        let p = 0;
        for (const e of bar) {
          for (let c = 0; c < e.duration; c++) {
            cellMap.push({ entryId: e.id, isSelected: e.id === entryId });
            p++;
          }
        }
        while (p < chart.cellsPerBar) { cellMap.push({ entryId: null, isSelected: false }); p++; }

        return { bar, cellMap, entryStart, maxCells, entryIndex: foundIdx };
      }
    }
    return null;
  }

  /* ── Beat grid ───────────────────────────────────── */

  let beatDragging = false;

  function renderBeatGrid(entry) {
    const grid  = document.getElementById('beat-grid');
    const label = document.getElementById('beat-value-label');
    const info  = getBarInfo(entry.id);
    grid.innerHTML = '';
    if (!info) { label.textContent = ''; return; }

    for (let i = 0; i < chart.cellsPerBar; i++) {
      const cell = document.createElement('div');
      cell.className = 'beat-cell';
      cell.dataset.cellIdx = i;
      cell.textContent = i + 1;

      const cd = info.cellMap[i];
      if (cd.isSelected) {
        cell.classList.add('bc-mine');
      } else if (cd.entryId !== null) {
        cell.classList.add('bc-other');
      } else if (i >= info.entryStart && i < info.entryStart + info.maxCells) {
        cell.classList.add('bc-free');
      } else {
        cell.classList.add('bc-other');
      }
      grid.appendChild(cell);
    }

    label.textContent = '= ' + getNoteValueLabel(entry.duration, chart.timeSig);
  }

  /* Lightweight refresh during drag — updates cell classes without re-rendering the grid DOM */
  function refreshBeatGrid(entry) {
    const info = getBarInfo(entry.id);
    if (!info) return;

    const cells = document.querySelectorAll('#beat-grid .beat-cell');
    cells.forEach((cell, i) => {
      cell.classList.remove('bc-mine', 'bc-free', 'bc-other', 'bc-preview');
      const cd = info.cellMap[i];
      if (cd.isSelected) {
        cell.classList.add('bc-mine');
      } else if (cd.entryId !== null) {
        cell.classList.add('bc-other');
      } else if (i >= info.entryStart && i < info.entryStart + info.maxCells) {
        cell.classList.add('bc-free');
      } else {
        cell.classList.add('bc-other');
      }
    });

    document.getElementById('beat-value-label').textContent =
      '= ' + getNoteValueLabel(entry.duration, chart.timeSig);
  }

  function getCellIdxFromX(clientX) {
    const grid  = document.getElementById('beat-grid');
    const cells = grid.querySelectorAll('.beat-cell');
    const rect  = grid.getBoundingClientRect();
    const x     = clientX - rect.left;
    // Walk cell rects to find which one contains x
    for (let i = 0; i < cells.length; i++) {
      const cr = cells[i].getBoundingClientRect();
      if (x <= cr.right - rect.left + 1) return i;
    }
    return cells.length - 1;
  }

  function applyBeatCell(cellIdx) {
    const activeId = chart.selectedId !== null ? chart.selectedId : chart.lastAddedId;
    const entry = findEntry(activeId);
    if (!entry) return;
    const info = getBarInfo(entry.id);
    if (!info || cellIdx < info.entryStart) return;

    // Allow growing all the way to the end of the bar (not just to the next entry)
    const desiredDur = Math.min(cellIdx - info.entryStart + 1, chart.cellsPerBar - info.entryStart);
    if (desiredDur < 1) return;

    // When growing past following entries in this bar, absorb them
    if (desiredDur > entry.duration) {
      let sec = null;
      for (const s of chart.sections) {
        if (s.entries.some(e => e.id === entry.id)) { sec = s; break; }
      }
      if (sec) {
        const following = info.bar.slice(info.entryIndex + 1);
        let cellsUsed = entry.duration;
        for (const follow of following) {
          if (cellsUsed >= desiredDur) break;
          const absorb = Math.min(follow.duration, desiredDur - cellsUsed);
          if (absorb >= follow.duration) {
            if (chart.selectedId  === follow.id) chart.selectedId  = entry.id;
            if (chart.lastAddedId === follow.id) chart.lastAddedId = entry.id;
            const si = sec.entries.findIndex(e => e.id === follow.id);
            if (si >= 0) sec.entries.splice(si, 1);
          } else {
            follow.duration -= absorb;
          }
          cellsUsed += absorb;
        }
      }
    }

    entry.duration = desiredDur;
    refreshBeatGrid(entry);
    document.getElementById('editor-symbol').textContent = getEntrySymbol(entry);
    document.querySelectorAll('.entry-token.selected').forEach(t => {
      t.textContent = getEntrySymbol(entry);
      t.classList.toggle('subdivision', isSubdivision(entry));
    });
  }

  function showBeatHover(clientX) {
    const activeId = chart.selectedId !== null ? chart.selectedId : chart.lastAddedId;
    const entry = findEntry(activeId);
    if (!entry || beatDragging) return;
    const info = getBarInfo(entry.id);
    if (!info) return;

    const hoverIdx = getCellIdxFromX(clientX);
    const barEnd   = chart.cellsPerBar; // hover preview can reach the end of the bar
    document.querySelectorAll('#beat-grid .beat-cell').forEach((cell, i) => {
      cell.classList.remove('bc-preview');
      if (!cell.classList.contains('bc-mine') &&
          i >= info.entryStart && i <= hoverIdx && i < barEnd) {
        cell.classList.add('bc-preview');
      }
    });
  }

  function initBeatGrid() {
    const grid = document.getElementById('beat-grid');

    grid.addEventListener('mousedown', e => {
      if (chart.selectedId == null && chart.lastAddedId == null) return;
      beatDragging = true;
      applyBeatCell(getCellIdxFromX(e.clientX));
      e.preventDefault();
    });

    grid.addEventListener('mousemove', e => {
      if (beatDragging) {
        applyBeatCell(getCellIdxFromX(e.clientX));
      } else {
        showBeatHover(e.clientX);
      }
    });

    grid.addEventListener('mouseleave', () => {
      document.querySelectorAll('#beat-grid .beat-cell').forEach(c => c.classList.remove('bc-preview'));
    });

    document.addEventListener('mouseup', () => {
      if (beatDragging) {
        beatDragging = false;
        renderChart(); // full re-render after drag ends to update bar groupings
      }
    });

    grid.addEventListener('touchstart', e => {
      if (chart.selectedId == null && chart.lastAddedId == null) return;
      applyBeatCell(getCellIdxFromX(e.touches[0].clientX));
      e.preventDefault();
    }, { passive: false });

    grid.addEventListener('touchmove', e => {
      applyBeatCell(getCellIdxFromX(e.touches[0].clientX));
      e.preventDefault();
    }, { passive: false });

    grid.addEventListener('touchend', () => renderChart());
  }

  /* ── Chart rendering ─────────────────────────────── */

  function renderChart() {
    const display = document.getElementById('chart-display');
    const hasContent = chart.sections.some(s => s.entries.length > 0 || s.name);

    if (!hasContent) {
      display.innerHTML = '<div class="chart-empty">Click notes on the fretboard to start building your chart.</div>';
      document.getElementById('entry-editor').classList.add('hidden');
      return;
    }

    display.innerHTML = '';

    chart.sections.forEach(sec => {
      if (!sec.entries.length && !sec.name) return;
      const block = document.createElement('div');
      block.className = 'section-block';

      const h = document.createElement('div');
      h.className = 'section-name-label';
      h.contentEditable = 'true';
      h.dataset.placeholder = 'Section name…';
      h.textContent = sec.name;
      h.addEventListener('blur', () => {
        sec.name = h.textContent.trim();
        autosave();
      });
      h.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); h.blur(); }
      });
      block.appendChild(h);

      const loopBtn = document.createElement('button');
      const secIdx  = chart.sections.indexOf(sec);
      loopBtn.className = 'btn loop-btn' + (chart.loopSection === secIdx ? ' active' : '');
      loopBtn.title = 'Loop this section during playback';
      loopBtn.textContent = '⟳';
      loopBtn.addEventListener('click', e => {
        e.stopPropagation();
        chart.loopSection = chart.loopSection === secIdx ? null : secIdx;
        if (isPlaying) { stopPlayback(); startPlayback(); }
        renderChart();
      });
      block.appendChild(loopBtn);

      if (!sec.entries.length) { display.appendChild(block); return; }

      const bars       = groupIntoBars(sec.entries, chart.cellsPerBar);
      const breaksSet  = new Set(sec.breaks || []);

      // Split bars into rows at user-defined break points
      const rowGroups = [];
      let curGroup = [];
      bars.forEach((bar, idx) => {
        if (idx > 0 && breaksSet.has(idx)) { rowGroups.push(curGroup); curGroup = []; }
        curGroup.push({ bar, barIdx: idx });
      });
      rowGroups.push(curGroup);

      rowGroups.forEach(group => {
        const row = document.createElement('div');
        row.className = 'bars-row';

        group.forEach(({ bar, barIdx }) => {
          const barEl = document.createElement('div');
          barEl.className = 'bar';

          // First bar of a row gets a plain span; subsequent bars get a clickable sep
          const isBreak = barIdx > 0 && breaksSet.has(barIdx);
          const sep = barIdx === 0
            ? document.createElement('span')
            : Object.assign(document.createElement('button'), { type: 'button' });
          sep.className = 'bar-sep' + (barIdx > 0 ? ' bar-sep-btn' : '') + (isBreak ? ' break-here' : '');
          sep.textContent = '|';
          if (barIdx > 0) {
            sep.title = isBreak ? 'Remove line break' : 'Insert line break here';
            sep.addEventListener('click', e => {
              e.stopPropagation();
              const b = new Set(sec.breaks || []);
              b.has(barIdx) ? b.delete(barIdx) : b.add(barIdx);
              sec.breaks = [...b];
              renderChart();
            });
          }
          barEl.appendChild(sep);

          bar.forEach(entry => {
            const tok = document.createElement('button');
            tok.className = 'entry-token'
              + (entry.id === chart.selectedId || entry.id === chart.lastAddedId ? ' selected' : '')
              + (isSubdivision(entry) ? ' subdivision' : '');
            tok.dataset.entryId = entry.id;
            const ticks = getTickCount(entry, bar);
            if (ticks > 0) {
              tok.textContent = getEntrySymbol(entry);
              const sup = document.createElement('sup');
              sup.textContent = tickStr(ticks);
              sup.style.cssText = 'font-size:0.65em;letter-spacing:-0.5px;';
              tok.appendChild(sup);
            } else {
              tok.textContent = getEntrySymbol(entry);
            }
            tok.addEventListener('click', () => { playNote(entryToMidi(entry)); chart.selectedId = entry.id; chart.lastAddedId = null; renderChart(); });
            barEl.appendChild(tok);
          });

          row.appendChild(barEl);
        });

        const closeSep = document.createElement('span');
        closeSep.className = 'bar-sep';
        closeSep.textContent = '|';
        row.appendChild(closeSep);

        block.appendChild(row);
      });

      display.appendChild(block);
    });

    renderEntryEditor();
  }

  function renderEntryEditor() {
    const editor = document.getElementById('entry-editor');
    const activeId = chart.selectedId !== null ? chart.selectedId : chart.lastAddedId;
    const entry  = activeId !== null ? findEntry(activeId) : null;

    if (!entry) { editor.classList.add('hidden'); return; }

    if (entry.degree === '%') {
      editor.classList.remove('hidden');
      document.getElementById('editor-symbol').textContent = '%';
      const editHint = document.getElementById('edit-hint');
      if (editHint) editHint.style.display = 'none';
      const saveBtn = document.getElementById('save-changes-btn');
      if (saveBtn) saveBtn.style.display = 'none';
      document.getElementById('beat-grid').innerHTML = '';
      document.getElementById('qual-btns').innerHTML = '';
      document.getElementById('slash-input').value = '';
      document.getElementById('measure-note-input').value = '';
      return;
    }

    editor.classList.remove('hidden');

    document.getElementById('editor-symbol').textContent = getEntrySymbol(entry);
    const editHint = document.getElementById('edit-hint');
    if (editHint) editHint.style.display = (transcribeMode && chart.selectedId !== null) ? 'inline' : 'none';
    const saveBtn = document.getElementById('save-changes-btn');
    if (saveBtn) saveBtn.style.display = chart.selectedId !== null ? '' : 'none';

    renderBeatGrid(entry);

    // Quality buttons
    const QUALITIES = [
      { label: '—',   val: ''     },
      { label: '-',   val: '-'    },
      { label: '°',   val: '°'   },
      { label: '+',   val: '+'    },
      { label: 'sus', val: 'sus'  },
      { label: '7',   val: '7'   },
      { label: 'maj7',val: 'maj7' },
      { label: 'm7',  val: 'm7'  },
    ];
    const qualRow = document.getElementById('qual-btns');
    qualRow.innerHTML = '';
    QUALITIES.forEach(q => {
      const b = document.createElement('button');
      b.className = 'micro-btn' + (entry.quality === q.val ? ' sel' : '');
      b.textContent = q.label;
      b.addEventListener('click', () => { entry.quality = q.val; renderChart(); });
      qualRow.appendChild(b);
    });

    // Slash input
    const slashInput = document.getElementById('slash-input');
    slashInput.value = entry.slash;
    slashInput.oninput = () => {
      entry.slash = slashInput.value.trim();
      document.getElementById('editor-symbol').textContent = getEntrySymbol(entry);
      document.querySelectorAll('.entry-token.selected').forEach(t => {
        t.textContent = getEntrySymbol(entry);
        t.classList.toggle('subdivision', isSubdivision(entry));
      });
    };

    // Measure note
    const measureNoteInput = document.getElementById('measure-note-input');
    const barLoc = getBarIndexForEntry(entry.id);
    measureNoteInput.value = (barLoc && barLoc.sec.barNotes) ? (barLoc.sec.barNotes[barLoc.barIdx] || '') : '';
    measureNoteInput.oninput = () => {
      if (!barLoc) return;
      if (!barLoc.sec.barNotes) barLoc.sec.barNotes = {};
      const v = measureNoteInput.value;
      if (v) barLoc.sec.barNotes[barLoc.barIdx] = v;
      else delete barLoc.sec.barNotes[barLoc.barIdx];
      autosave();
    };
  }

  /* ── Panel button handlers ───────────────────────── */

  document.getElementById('add-section-btn').addEventListener('click', () => {
    const name = document.getElementById('section-name').value.trim();
    const cur  = chart.sections[chart.currentSec];
    if (cur.entries.length === 0) {
      cur.name = name || cur.name;
    } else {
      chart.sections.push({ name, entries: [], breaks: [], barNotes: {} });
      chart.currentSec = chart.sections.length - 1;
    }
    document.getElementById('section-name').value = '';
    renderChart();
  });

  document.getElementById('undo-btn').addEventListener('click', () => {
    const sec = chart.sections[chart.currentSec];
    if (sec.entries.length > 0) {
      const removed = sec.entries.pop();
      if (chart.selectedId  === removed.id) chart.selectedId  = null;
      if (chart.lastAddedId === removed.id) chart.lastAddedId = null;
    } else if (chart.currentSec > 0) {
      chart.sections.splice(chart.currentSec, 1);
      chart.currentSec = chart.sections.length - 1;
    }
    renderChart();
  });

  document.getElementById('delete-entry-btn').addEventListener('click', () => {
    const delId = chart.selectedId !== null ? chart.selectedId : chart.lastAddedId;
    if (delId == null) return;
    for (const sec of chart.sections) {
      const idx = sec.entries.findIndex(e => e.id === delId);
      if (idx >= 0) { sec.entries.splice(idx, 1); break; }
    }
    chart.selectedId = null;
    chart.lastAddedId = null;
    renderChart();
  });

  document.getElementById('save-changes-btn').addEventListener('click', () => {
    chart.selectedId  = null;
    chart.lastAddedId = null;
    renderChart();
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    if (!confirm('Clear the entire chart?')) return;
    if (isPlaying) stopPlayback();
    chart.sections = [{ name:'', entries:[], breaks:[], barNotes:{} }];
    chart.currentSec = 0; chart.selectedId = null; chart.lastAddedId = null; chart.nextId = 0; chart.loopSection = null;
    renderChart();
  });

  document.getElementById('copy-btn').addEventListener('click', copyChart);

  document.getElementById('play-btn').addEventListener('click', () => {
    if (isPlaying) stopPlayback(); else startPlayback();
  });

  document.getElementById('metro-btn').addEventListener('click', () => {
    metronomeOn = !metronomeOn;
    document.getElementById('metro-btn').classList.toggle('active', metronomeOn);
  });

  document.getElementById('speed-range').addEventListener('input', e => {
    document.getElementById('speed-label').textContent = e.target.value + '%';
  });

  document.getElementById('repeat-bar-btn').addEventListener('click', addRepeatBar);

  /* ── Output generation ───────────────────────────── */

  // Split an array of bar strings into user-defined line groups, then apply 4+4 layout
  function barStringsToLines(barStrs, breaks) {
    const breaksSet = new Set(breaks || []);
    const userGroups = [];
    let cur = [];
    barStrs.forEach((s, i) => {
      if (i > 0 && breaksSet.has(i)) { userGroups.push(cur); cur = []; }
      cur.push(s);
    });
    userGroups.push(cur);

    const lines = [];
    userGroups.forEach(group => {
      for (let i = 0; i < group.length; i += 8) {
        const chunk = group.slice(i, i + 8);
        const g1 = chunk.slice(0, 4).join('  ');
        const g2 = chunk.slice(4);
        lines.push(g2.length ? `${g1}  •  ${g2.join('  ')}` : g1);
      }
    });
    return lines;
  }

  function generateOutput() {
    const lines   = [];
    const title   = document.getElementById('song-title').value.trim();
    const tempo   = document.getElementById('song-tempo').value.trim();
    const keyName = KEY_NAMES[chart.keyMidi];

    if (title) lines.push(title);
    const meta = [`Key: ${keyName}`, `Time: ${chart.timeSig}`];
    if (tempo) meta.push(`Tempo: ${tempo}`);
    lines.push(meta.join(' | '));
    lines.push('');

    chart.sections.forEach(sec => {
      if (!sec.entries.length) return;
      if (sec.name) lines.push(sec.name);

      const barStrs = groupIntoBars(sec.entries, chart.cellsPerBar).map(bar => {
        const cells = [];
        const split = bar.length > 1;
        bar.forEach(e => {
          const sym   = getEntrySymbol(e);
          const ticks = getTickCount(e, bar);
          const tick  = ticks > 0 ? tickStr(ticks) : '';
          // Underline only the chord symbol, ticks stay outside the combining chars
          cells.push(split ? underlineNNS(sym) + tick : sym + tick);
        });
        return cells.join('  ');
      });

      barStringsToLines(barStrs, sec.breaks).forEach(l => lines.push(l));
    });

    return lines.join('\n');
  }

  function generateOutputHTML() {
    const lines   = [];
    const title   = document.getElementById('song-title').value.trim();
    const tempo   = document.getElementById('song-tempo').value.trim();
    const keyName = KEY_NAMES[chart.keyMidi];

    if (title) lines.push(`<b>${escHtml(title)}</b>`);
    const meta = [`Key: ${keyName}`, `Time: ${chart.timeSig}`];
    if (tempo) meta.push(`Tempo: ${tempo}`);
    lines.push(escHtml(meta.join(' | ')));
    lines.push('');

    chart.sections.forEach(sec => {
      if (!sec.entries.length) return;
      if (sec.name) lines.push(`<b>${escHtml(sec.name)}</b>`);

      const barStrs = groupIntoBars(sec.entries, chart.cellsPerBar).map(bar => {
        const split = bar.length > 1;
        const syms  = bar.map(e => {
          const sym   = escHtml(getEntrySymbol(e));
          const ticks = getTickCount(e, bar);
          return ticks > 0 ? `${sym}<sup>${tickStr(ticks)}</sup>` : sym;
        });
        return split ? `<u>${syms.join('  ')}</u>` : syms[0];
      });

      barStringsToLines(barStrs, sec.breaks).forEach(l => lines.push(l));
    });

    return `<meta charset="utf-8"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.9;white-space:pre;">${lines.join('\n')}</div>`;
  }

  async function copyChart() {
    const btn = document.getElementById('copy-btn');
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/plain': new Blob([generateOutput()],     { type: 'text/plain' }),
        'text/html':  new Blob([generateOutputHTML()], { type: 'text/html'  }),
      })]);
    } catch {
      try {
        await navigator.clipboard.writeText(generateOutput());
      } catch {
        const ta = Object.assign(document.createElement('textarea'),
          { value: generateOutput(), style: 'position:fixed;opacity:0' });
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    }
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 1500);
  }

  function viewChart() {
    const title   = document.getElementById('song-title').value.trim();
    const writer  = document.getElementById('song-writer').value.trim();
    const tempo   = document.getElementById('song-tempo').value.trim();
    const keyName = KEY_NAMES[chart.keyMidi];

    let headerHtml = '';
    if (title)  headerHtml += `<h1>${escHtml(title)}</h1>`;
    if (writer) headerHtml += `<p class="writer">${escHtml(writer)}</p>`;
    const metaParts = [`Key: ${keyName}`, `Time: ${chart.timeSig}`];
    if (tempo) metaParts.push(`Tempo: ${tempo}`);
    headerHtml += `<p class="chart-meta">${escHtml(metaParts.join('  ·  '))}</p>`;

    const cpb          = chart.cellsPerBar;
    const cellW        = cpb >= 6 ? '1.1em' : '1.3em';
    const BARS_PER_ROW = cpb >= 6 ? 3 : 4;

    // Build section data with running bar numbers
    const allSecs = [];
    let globalBarNum = 0;
    chart.sections.forEach(sec => {
      if (!sec.entries.length) return;
      const bars     = groupIntoBars(sec.entries, cpb);
      const abbr     = sectionAbbr(sec.name);
      const barNotes = sec.barNotes || {};
      allSecs.push({ abbr, bars, barNotes, startBarNum: globalBarNum + 1 });
      globalBarNum += bars.length;
    });

    // Split sections into two columns (roughly equal bar counts, never mid-section)
    const totalBars = allSecs.reduce((s, sec) => s + sec.bars.length, 0);
    const target    = Math.ceil(totalBars / 2);
    const leftSecs  = [], rightSecs = [];
    let count = 0, splitDone = false;
    for (const sec of allSecs) {
      if (!splitDone) {
        leftSecs.push(sec);
        count += sec.bars.length;
        if (count >= target) splitDone = true;
      } else {
        rightSecs.push(sec);
      }
    }

    function renderSection(sec) {
      const { abbr, bars, barNotes, startBarNum } = sec;
      let rowsHtml = '';
      for (let r = 0; r < bars.length; r += BARS_PER_ROW) {
        const rowBars  = bars.slice(r, r + BARS_PER_ROW);
        const barNum   = startBarNum + r;
        const barsHtml = rowBars.map((bar, ri) => {
          const split    = bar.length > 1;
          const noteText = barNotes[r + ri];
          const chords   = bar.map(e => {
            const sym   = escHtml(getEntrySymbol(e));
            const ticks = getTickCount(e, bar);
            const label = ticks > 0 ? `${sym}<sup>${tickStr(ticks)}</sup>` : sym;
            return `<span class="ch" style="grid-column:span ${e.duration}">${label}</span>`;
          }).join('');
          const noteHtml = noteText ? `<div class="mnote">${escHtml(noteText)}</div>` : '';
          return `<span class="sep">|</span><div class="bar${split ? ' sp' : ''}" style="grid-template-columns:repeat(${cpb},${cellW})">${chords}${noteHtml}</div>`;
        }).join('');
        rowsHtml += `<div class="bar-row"><span class="bnum">${barNum}</span>${barsHtml}<span class="sep">|</span></div>`;
      }
      return `<div class="chart-sec"><div class="sec-hdr"><span class="sec-abbr">${escHtml(abbr)}</span></div>${rowsHtml}</div>`;
    }

    const leftHtml  = leftSecs.map(renderSection).join('');
    const rightHtml = rightSecs.map(renderSection).join('');

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${escHtml(title || 'Chart')}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 12px; color: #111; background: #fff;
    padding: 1.4cm 1.6cm 2cm;
  }
  .chart-header { text-align:center; margin-bottom:1.4em; padding-bottom:0.9em; border-bottom:1px solid #ccc; }
  .chart-header h1 { font-size:1.65em; font-weight:700; margin-bottom:0.18em; }
  .chart-header .writer { font-size:0.9em; color:#555; margin-bottom:0.2em; }
  .chart-header .chart-meta { font-size:0.8em; color:#777; }
  .chart-body { display:flex; align-items:flex-start; }
  .col { flex:1; min-width:0; }
  .col:first-child { padding-right:2em; border-right:1px solid #ccc; }
  .col:last-child  { padding-left:2em; }
  .chart-sec { margin-bottom:1.1em; }
  .sec-hdr { margin-bottom:0.1em; }
  .sec-abbr { font-size:0.68em; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.06em; }
  .bar-row { display:flex; align-items:center; line-height:2.2; margin-bottom:0.05em; flex-wrap:nowrap; }
  .bnum { font-size:0.52em; color:#bbb; min-width:1.8em; text-align:right; padding-right:0.3em; flex-shrink:0; }
  .sep { color:#aaa; font-weight:300; padding:0 0.06em; flex-shrink:0; }
  .bar { display:inline-grid; align-items:center; vertical-align:middle; }
  .bar.sp { border-bottom:1.5px solid #111; }
  .ch { white-space:nowrap; font-weight:500; font-size:1em; }
  .mnote { font-size:0.7em; color:#999; font-style:italic; font-weight:400; }
  sup { font-size:0.6em; vertical-align:super; line-height:0; }
  .no-print { text-align:center; margin-top:2em; }
  .print-btn { font-size:0.9em; padding:8px 20px; background:#f5f5f5; border:1px solid #ccc; border-radius:8px; cursor:pointer; }
  .print-btn:hover { background:#e8e8e8; }
  @media print {
    body { padding:1cm 1.2cm; }
    @page { margin:1.5cm; }
    .no-print { display:none; }
  }
</style>
</head>
<body>
<div class="chart-header">${headerHtml}</div>
<div class="chart-body">
  <div class="col">${leftHtml}</div>
  <div class="col">${rightHtml}</div>
</div>
<div class="print-bar no-print">
  <button onclick="window.print()" class="print-btn">🖨 Print / Save as PDF</button>
</div>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  }

  document.getElementById('view-btn').addEventListener('click', viewChart);

  /* ── Save / Load ─────────────────────────────────── */

  function chartSnapshot() {
    return {
      version:    1,
      title:      document.getElementById('song-title').value,
      writer:     document.getElementById('song-writer').value,
      tempo:      document.getElementById('song-tempo').value,
      keyMidi:    chart.keyMidi,
      timeSig:    chart.timeSig,
      cellsPerBar:  chart.cellsPerBar,
      cellsPerComp: chart.cellsPerComp,
      sections:   chart.sections,
      currentSec: chart.currentSec,
      nextId:     chart.nextId,
    };
  }

  function restoreSnapshot(data) {
    if (!data || data.version !== 1) return false;
    document.getElementById('song-title').value  = data.title  || '';
    document.getElementById('song-writer').value = data.writer || '';
    document.getElementById('song-tempo').value  = data.tempo  || '';
    chart.keyMidi      = data.keyMidi;
    chart.timeSig      = data.timeSig;
    chart.cellsPerBar  = data.cellsPerBar;
    chart.cellsPerComp = data.cellsPerComp;
    chart.sections     = data.sections;
    chart.currentSec   = data.currentSec;
    chart.nextId       = data.nextId;
    chart.selectedId   = null;
    chart.lastAddedId  = null;
    chart.loopSection  = null;
    // Ensure breaks and barNotes exist on every section (older saves won't have them)
    chart.sections.forEach(s => {
      if (!s.breaks)   s.breaks   = [];
      if (!s.barNotes) s.barNotes = {};
    });
    // Migrate old en-dash minor marker to hyphen
    chart.sections.forEach(s => s.entries.forEach(e => {
      if (e.quality === '–') e.quality = '-';
    }));
    // Sync key and time-sig selectors
    document.getElementById('key-select').value  = data.keyMidi;
    document.getElementById('time-select').value = data.timeSig;
    return true;
  }

  function autosave() {
    try { localStorage.setItem('nns-chart', JSON.stringify(chartSnapshot())); } catch {}
  }

  function saveChart() {
    const snap  = chartSnapshot();
    const title = snap.title.trim() || 'chart';
    const blob  = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const a     = Object.assign(document.createElement('a'),
      { href: URL.createObjectURL(blob), download: `${title}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadChart(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (restoreSnapshot(data)) {
          renderChart();
          updateNNSLabels();
          initBeatGrid();
          autosave();
        } else {
          alert('Unrecognised file format.');
        }
      } catch { alert('Could not read file.'); }
    };
    reader.readAsText(file);
  }

  document.getElementById('save-btn').addEventListener('click', saveChart);
  document.getElementById('load-btn').addEventListener('click', () =>
    document.getElementById('load-input').click());
  document.getElementById('load-input').addEventListener('change', e => {
    if (e.target.files[0]) { loadChart(e.target.files[0]); e.target.value = ''; }
  });

  // Autosave on any chart mutation
  const _origRenderChart = renderChart;
  renderChart = function(...args) { _origRenderChart(...args); autosave(); };

  /* ── Deselect on click-away / Escape ────────────── */

  // Any click inside the panel stops here — prevents the document listener below
  // from firing on a detached element after renderChart() replaces the DOM.
  document.getElementById('transcribe-panel').addEventListener('click', e => {
    e.stopPropagation();
  });

  document.addEventListener('click', e => {
    if (!transcribeMode) return;
    if (chart.selectedId === null && chart.lastAddedId === null) return;
    if (e.target.closest('.note-dot')) return;
    chart.selectedId = null;
    chart.lastAddedId = null;
    renderChart();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && (chart.selectedId !== null || chart.lastAddedId !== null)) {
      chart.selectedId = null;
      chart.lastAddedId = null;
      renderChart();
    }
  });

  /* ── Init ────────────────────────────────────────── */
  buildFretboard();

  // Restore last session from localStorage
  try {
    const saved = localStorage.getItem('nns-chart');
    if (saved) restoreSnapshot(JSON.parse(saved));
  } catch {}

  updateNNSLabels();
  initBeatGrid();
