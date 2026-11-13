const NOTE_SEMITONES = {
  C: -9,
  'C#': -8,
  DB: -8,
  D: -7,
  'D#': -6,
  EB: -6,
  E: -5,
  F: -4,
  'F#': -3,
  GB: -3,
  G: -2,
  'G#': -1,
  AB: -1,
  A: 0,
  'A#': 1,
  BB: 1,
  B: 2,
};

const parseFreqToken = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return null;
  const khz = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*khz$/i);
  if (khz) return Number(khz[1]) * 1000;
  const hz = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:hz)?$/i);
  if (hz) return Number(hz[1]);
  const note = s.match(/^([A-Ga-g][#bB]?)(-?[0-8])$/);
  if (note) {
    const key = note[1].toUpperCase();
    const oct = Number(note[2]);
    const semi = NOTE_SEMITONES[key];
    if (semi !== undefined && Number.isFinite(oct)) {
      const midi = (oct + 1) * 12 + (semi + 9);
      return 440 * Math.pow(2, (midi - 69) / 12);
    }
  }
  return null;
};

const parseDurationMsToken = (raw, fallbackMs = 120) => {
  const s = String(raw || '').trim();
  if (!s) return fallbackMs;
  const ms = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*ms$/i);
  if (ms) return Number(ms[1]);
  const sec = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*s$/i);
  if (sec) return Number(sec[1]) * 1000;
  const bare = Number(s);
  return Number.isFinite(bare) && bare > 0 ? bare : fallbackMs;
};

const splitTopLevelPlus = (expr) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    else if (ch === ')' && depth > 0) depth--;
    else if (ch === '+' && depth === 0) {
      const seg = expr.slice(start, i).trim();
      if (seg) parts.push(seg);
      start = i + 1;
    }
  }
  const tail = expr.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
};

/**
 * Parses a NanoSound (.nsd) algebraic expression into voice layers and synthesizes
 * a deterministic mono Float32Array PCM preview + SVG oscilloscope points.
 *
 * @param {string} rawDsl
 * @param {{ sampleRate?: number, waveformBins?: number }} [options]
 */
export const compileNsdPreview = (rawDsl = '', options = {}) => {
  const sampleRate = options.sampleRate || 22050;
  const waveformBins = options.waveformBins || 140;
  const cleaned = String(rawDsl || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').replace(/\/\/.*$/, '').trim())
    .filter(Boolean)
    .join(' ');

  if (!cleaned) {
    return {
      valid: false,
      dsl: '',
      durationMs: 0,
      sampleRate,
      layers: [],
      pcm: new Float32Array(0),
      svgPoints: '',
      svgAreaPath: '',
    };
  }

  const rawLayers = splitTopLevelPlus(cleaned);
  const layers = [];
  let totalDurationMs = 80;

  for (let idx = 0; idx < rawLayers.length; idx++) {
    const term = rawLayers[idx];
    const gainMatch = term.match(/^([0-9]*\.?[0-9]+)\s*\*\s*/);
    const gain = gainMatch ? Math.max(0.02, Math.min(2, Number(gainMatch[1]))) : 0.72;

    const waveMatch = term.match(/\b(sin|sine|tri|triangle|saw|sawtooth|square|sqr|pulse|noise|pink)\s*\(([^()]*|\([^()]*\))*\)/i);
    const waveRaw = waveMatch ? waveMatch[1].toLowerCase() : 'sin';
    const wave =
      waveRaw === 'sine' ? 'sin'
        : waveRaw === 'triangle' ? 'tri'
          : waveRaw === 'sawtooth' ? 'saw'
            : waveRaw === 'sqr' ? 'square'
              : waveRaw;

    let freqStart = 440;
    let freqEnd = 440;
    let glideMs = 0;
    let glideCurve = 'linear';

    const glideMatch = term.match(/glide\s*\(\s*([^,)]+)(?:,\s*([^,)]+))?(?:,\s*([^,)]+))?(?:,\s*([^,)]+))?\s*\)/i);
    if (glideMatch) {
      freqStart = parseFreqToken(glideMatch[1]) || 440;
      freqEnd = parseFreqToken(glideMatch[2]) || freqStart;
      const arg3 = String(glideMatch[3] || '').trim();
      const arg4 = String(glideMatch[4] || '').trim();
      if (/^[0-9]/.test(arg3)) {
        glideMs = parseDurationMsToken(arg3, 80);
      } else {
        if (arg3) glideCurve = arg3;
        if (arg4) glideMs = parseDurationMsToken(arg4, 80);
      }
    } else if (waveMatch) {
      const inner = term.slice(term.indexOf('(', waveMatch.index) + 1);
      const firstArg = inner.split(/[),]/)[0];
      if (wave === 'noise' || wave === 'pink') {
        glideMs = parseDurationMsToken(firstArg, 40);
      } else {
        const parsedF = parseFreqToken(firstArg);
        if (parsedF) {
          freqStart = parsedF;
          freqEnd = parsedF;
        }
      }
    }

    const decayMatch = term.match(/expDecay\s*\(\s*([^)]+)\)/i);
    const decayMs = decayMatch ? parseDurationMsToken(decayMatch[1], 45) : 55;

    const delayMatch = term.match(/delay\s*\(\s*([^)]+)\)/i);
    const startMs = delayMatch ? parseDurationMsToken(delayMatch[1], 0) : 0;

    const filterMatch = term.match(/\b(lpf|hpf|bpf)\s*\(\s*([^,)]+)/i);
    const filterType = filterMatch ? filterMatch[1].toLowerCase() : null;
    const cutoffHz = filterMatch ? (parseFreqToken(filterMatch[2]) || 1600) : null;

    const layerDurMs = Math.max(
      36,
      Math.min(3600, glideMs > 0 ? Math.max(glideMs * 1.35, decayMs * 4.2) : decayMs * 4.5)
    );
    if (startMs + layerDurMs > totalDurationMs) {
      totalDurationMs = startMs + layerDurMs;
    }

    layers.push({
      id: `layer-${idx + 1}`,
      wave,
      gain: Math.round(gain * 100) / 100,
      freqStart: Math.round(freqStart * 10) / 10,
      freqEnd: Math.round(freqEnd * 10) / 10,
      glideMs: Math.round(glideMs),
      glideCurve,
      decayMs: Math.round(decayMs * 10) / 10,
      startMs: Math.round(startMs),
      durationMs: Math.round(layerDurMs),
      filterType,
      cutoffHz: cutoffHz ? Math.round(cutoffHz) : null,
    });
  }

  totalDurationMs = Math.min(4000, Math.max(60, Math.round(totalDurationMs)));
  const totalSamples = Math.max(64, Math.floor((totalDurationMs / 1000) * sampleRate));
  const pcm = new Float32Array(totalSamples);

  let rngSeed = 0x517cc1b7;
  const nextRand = () => {
    rngSeed = (Math.imul(rngSeed, 1664525) + 1013904223) >>> 0;
    return (rngSeed / 0xffffffff) * 2 - 1;
  };

  for (const layer of layers) {
    const startSample = Math.floor((layer.startMs / 1000) * sampleRate);
    const durSamples = Math.floor((layer.durationMs / 1000) * sampleRate);
    const tauSec = Math.max(0.004, layer.decayMs / 1000);
    const glideSec = layer.glideMs > 0 ? layer.glideMs / 1000 : 0;
    let phase = 0;
    let lpState = 0;
    let pinkState = 0;
    const rcAlpha = layer.cutoffHz
      ? Math.min(0.96, Math.max(0.02, (2 * Math.PI * layer.cutoffHz) / (2 * Math.PI * layer.cutoffHz + sampleRate)))
      : 0.5;

    for (let i = 0; i < durSamples && startSample + i < totalSamples; i++) {
      const t = i / sampleRate;
      let u = glideSec > 0 ? Math.min(1, t / glideSec) : 1;
      if (layer.glideCurve.toLowerCase().includes('out')) {
        u = 1 - Math.pow(1 - u, 3);
      } else if (layer.glideCurve.toLowerCase().includes('exp') && layer.freqStart > 0 && layer.freqEnd > 0) {
        u = (Math.pow(layer.freqEnd / layer.freqStart, u) * layer.freqStart - layer.freqStart) /
          (layer.freqEnd - layer.freqStart || 1);
      }
      const freq = layer.freqStart + (layer.freqEnd - layer.freqStart) * u;
      phase += (2 * Math.PI * freq) / sampleRate;
      const normP = (phase / (2 * Math.PI)) % 1;

      let s = 0;
      if (layer.wave === 'sin') {
        s = Math.sin(phase);
      } else if (layer.wave === 'tri') {
        s = 1 - 4 * Math.abs(Math.round(normP - 0.25) - (normP - 0.25));
      } else if (layer.wave === 'saw') {
        s = 2 * (normP - Math.floor(normP + 0.5));
      } else if (layer.wave === 'square' || layer.wave === 'pulse') {
        s = normP < 0.5 ? 1 : -1;
      } else if (layer.wave === 'pink') {
        pinkState = 0.88 * pinkState + 0.12 * nextRand();
        s = pinkState * 2.2;
      } else {
        s = nextRand();
      }

      if (layer.filterType === 'lpf') {
        lpState += rcAlpha * (s - lpState);
        s = lpState;
      } else if (layer.filterType === 'hpf') {
        lpState += rcAlpha * (s - lpState);
        s = s - lpState;
      } else if (layer.filterType === 'bpf') {
        lpState += rcAlpha * (s - lpState);
        s = (s - lpState) * 0.7 + lpState * 0.3;
      }

      const attack = Math.min(1, t / 0.0015);
      const env = attack * Math.exp(-t / tauSec);
      pcm[startSample + i] += s * env * layer.gain;
    }
  }

  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    const a = Math.abs(pcm[i]);
    if (a > peak) peak = a;
  }
  if (peak > 0.95) {
    const norm = 0.92 / peak;
    for (let i = 0; i < pcm.length; i++) pcm[i] *= norm;
  }

  const width = 640;
  const midY = 72;
  const ampY = 58;
  const bins = Math.max(24, Math.min(waveformBins, pcm.length));
  const step = pcm.length / bins;
  const topCoords = [];
  const botCoords = [];
  const lineCoords = [];

  for (let b = 0; b < bins; b++) {
    const i0 = Math.floor(b * step);
    const i1 = Math.max(i0 + 1, Math.floor((b + 1) * step));
    let minV = 0;
    let maxV = 0;
    let sampleMid = pcm[i0] || 0;
    for (let k = i0; k < i1 && k < pcm.length; k++) {
      const v = pcm[k];
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const x = Math.round(((b / Math.max(1, bins - 1)) * (width - 16) + 8) * 10) / 10;
    const yTop = Math.round((midY - maxV * ampY) * 10) / 10;
    const yBot = Math.round((midY - minV * ampY) * 10) / 10;
    const yMid = Math.round((midY - sampleMid * ampY) * 10) / 10;
    topCoords.push(`${x},${yTop}`);
    botCoords.push(`${x},${yBot}`);
    lineCoords.push(`${x},${yMid}`);
  }

  const svgAreaPath = topCoords.length > 1
    ? `M ${topCoords.join(' L ')} L ${botCoords.reverse().join(' L ')} Z`
    : '';

  return {
    valid: layers.length > 0,
    dsl: cleaned,
    durationMs: totalDurationMs,
    sampleRate,
    layers,
    pcm,
    svgPoints: lineCoords.join(' '),
    svgAreaPath,
  };
};

/**
 * Extracts embedded NanoSound (.nsd) DSL expressions from JS/TS/Vue/JSON source code or diffs.
 * Allows auditioning procedural sound definitions inside code repositories (e.g. shader-showcase-app).
 *
 * @param {string} [sourceText='']
 * @returns {Array<{ id: string, label: string, dsl: string }>}
 */
export const extractEmbeddedNsdSnippets = (sourceText = '') => {
  const raw = String(sourceText || '');
  if (!raw || raw.length > 400000) return [];
  const results = [];
  const seen = new Set();
  const quoteRe = /'([^'\\\r\n]*(?:\\.[^'\\\r\n]*)*)'|"([^"\\\r\n]*(?:\\.[^"\\\r\n]*)*)"|`([^`\\\r\n]*(?:\\.[^`\\\r\n]*)*)`/g;
  const nsdSignatureRe = /\b(sin|tri|saw|square|pulse|noise|pink)\s*\([^)]*(Hz|kHz|glide|ms)\b/i;
  const nsdEnvRe = /\b(expDecay|glide|lpf|hpf|bpf|delay)\s*\(/i;

  let match;
  while ((match = quoteRe.exec(raw)) !== null) {
    const candidate = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (
      candidate.length >= 12 &&
      candidate.length <= 360 &&
      !candidate.includes('\n') &&
      nsdSignatureRe.test(candidate) &&
      nsdEnvRe.test(candidate) &&
      !seen.has(candidate)
    ) {
      seen.add(candidate);
      const beforeSlice = raw.slice(Math.max(0, match.index - 140), match.index);
      const idMatches = [...beforeSlice.matchAll(/(?:id|name|key|preset|slug|title)\s*:\s*['"]([^'"]+)['"]/gi)];
      const propMatch = beforeSlice.match(/([a-zA-Z0-9_-]+)\s*:\s*$/);
      const lastId = idMatches.length > 0 ? idMatches[idMatches.length - 1][1] : '';
      const propKey = propMatch && !/^(sound|nsd|dsl|expr|audio)$/i.test(propMatch[1]) ? propMatch[1] : '';
      const label = lastId || propKey || `nsd-${results.length + 1}`;
      results.push({
        id: `${label}-${results.length}`,
        label,
        dsl: candidate,
      });
      if (results.length >= 24) break;
    }
  }
  return results;
};
