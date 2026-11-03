const nanosoundGrammar = (hljsInstance) => {
  return {
    name: 'NanoSound DSL',
    aliases: ['nanosound', 'nsd', 'sound'],
    contains: [
      hljsInstance.HASH_COMMENT_MODE,
      hljsInstance.C_LINE_COMMENT_MODE,
      hljsInstance.C_BLOCK_COMMENT_MODE,
      {
        className: 'symbol',
        match: /\b\d+(?:\.\d+)?(?:ms|s)(?=\s*:)/,
      },
      {
        className: 'attr',
        match: /\b(?:detune|duty|q|ripple|fb|feedback|order|mix|gain|pan|seed)(?=\s*:)/,
      },
      {
        className: 'number',
        match: /[+-]?\b\d+(?:\.\d+)?(?:kHz|Hz|ms|s|ct|%)?\b/,
      },
      {
        className: 'literal',
        match: /\b(?:easeOutCubic|easeInQuad|easeInOutSine|linear|exp)\b/,
      },
      {
        className: 'keyword',
        match: /\b(?:seq|glide)\b/,
      },
      {
        scope: 'title.function',
        match: /\b(?:sin|tri|saw|sqr|pulse|noise|pink|brown)\b(?=\s*\()/,
      },
      {
        className: 'built_in',
        match: /\b(?:expDecay|adsr|perc|hanning|lpf|hpf|bpf|notch|allpass|cheby|chebyWave|comb)\b(?=\s*\()/,
      },
      {
        className: 'operator',
        match: /[+*]/,
      },
    ],
  };
};

export const NANOSOUND_COMPLETIONS = [
  {
    label: 'sin',
    insertText: 'sin(440Hz)',
    detail: 'Oscylator sinusoidalny (czysta fala podstawowa)',
    kind: 'osc',
  },
  {
    label: 'tri',
    insertText: 'tri(330Hz)',
    detail: 'Oscylator trójkątny (ciepłe nieparzyste harmoniczne)',
    kind: 'osc',
  },
  {
    label: 'saw',
    insertText: 'saw(220Hz)',
    detail: 'Oscylator piłokształtny (bogate spektrum harmoniczne)',
    kind: 'osc',
  },
  {
    label: 'sqr',
    insertText: 'sqr(440Hz)',
    detail: 'Oscylator prostokątny 50% (brzmienie retro / 8-bit)',
    kind: 'osc',
  },
  {
    label: 'pulse',
    insertText: 'pulse(440Hz, duty:0.25)',
    detail: 'Oscylator impulsowy PWM z regulowanym wypełnieniem duty',
    kind: 'osc',
  },
  {
    label: 'noise',
    insertText: 'noise()',
    detail: 'Deterministyczny szum biały (xorshift32 PRNG)',
    kind: 'osc',
  },
  {
    label: 'pink',
    insertText: 'pink()',
    detail: 'Szum różowy (-3 dB/oktawę, filtr Kelleta)',
    kind: 'osc',
  },
  {
    label: 'brown',
    insertText: 'brown()',
    detail: 'Szum brązowy / czerwony (-6 dB/oktawę, całkowany proces Wienera)',
    kind: 'osc',
  },
  {
    label: 'glide',
    insertText: 'glide(240Hz, 720Hz, easeOutCubic, 65ms)',
    detail: 'Ciągłe fazowo glissando częstotliwości f0 -> f1',
    kind: 'mod',
  },
  {
    label: 'expDecay',
    insertText: 'expDecay(120ms)',
    detail: 'Wykładnicza obwiednia zaniku amplitudy e^(-t/tau)',
    kind: 'env',
  },
  {
    label: 'adsr',
    insertText: 'adsr(2ms, 20ms, 0.5, 60ms)',
    detail: '4-etapowa obwiednia Attack-Decay-Sustain-Release',
    kind: 'env',
  },
  {
    label: 'perc',
    insertText: 'perc(2ms, 45ms)',
    detail: 'Perkusyjna obwiednia uderzeniowa (Attack + Decay)',
    kind: 'env',
  },
  {
    label: 'hanning',
    insertText: 'hanning(80ms)',
    detail: 'Symetryczne okno dzwonowe Hanninga 0.5*(1 - cos(2*pi*t/T))',
    kind: 'env',
  },
  {
    label: 'lpf',
    insertText: 'lpf(1800Hz, q:1.2)',
    detail: 'Filtr dolnoprzepustowy Chamberlin SVF 12 dB/oct',
    kind: 'filter',
  },
  {
    label: 'hpf',
    insertText: 'hpf(800Hz, q:0.9)',
    detail: 'Filtr górnoprzepustowy Chamberlin SVF',
    kind: 'filter',
  },
  {
    label: 'bpf',
    insertText: 'bpf(1400Hz, q:2.4)',
    detail: 'Filtr środkowoprzepustowy (rezonansowy) Chamberlin SVF',
    kind: 'filter',
  },
  {
    label: 'notch',
    insertText: 'notch(1200Hz, q:2.2)',
    detail: 'Filtr pasmowozaporowy (Band-Stop / wycięcie rezonansu)',
    kind: 'filter',
  },
  {
    label: 'allpass',
    insertText: 'allpass(900Hz, q:1.8)',
    detail: 'Filtr wszechprzepustowy (dyspersja fazowa / sprężyna)',
    kind: 'filter',
  },
  {
    label: 'cheby',
    insertText: 'cheby(1600Hz, ripple:1.8)',
    detail: '4-biegunowy filtr Czebyszewa Typu I (24 dB/oct + passband ripple)',
    kind: 'filter',
  },
  {
    label: 'chebyWave',
    insertText: 'chebyWave(order:3, mix:0.55)',
    detail: 'Nieliniowy generator harmonicznych wielomianami Czebyszewa T_n(x)',
    kind: 'mod',
  },
  {
    label: 'comb',
    insertText: 'comb(2.8ms, fb:0.78)',
    detail: 'Filtr grzebieniowy Karplusa-Stronga (struna / metalowa rurka)',
    kind: 'filter',
  },
  {
    label: 'seq',
    insertText: 'seq(0ms: sin(523.25Hz) * expDecay(90ms), 70ms: sin(659.25Hz) * expDecay(140ms))',
    detail: 'Sekwencer wielotaktowy z przesunięciami czasowymi',
    kind: 'seq',
  },
  {
    label: 'easeOutCubic',
    insertText: 'easeOutCubic',
    detail: 'Krzywa wygaszania 1 - (1 - t)^3 dla glide()',
    kind: 'curve',
  },
  {
    label: 'easeInQuad',
    insertText: 'easeInQuad',
    detail: 'Krzywa przyspieszania t^2 dla glide()',
    kind: 'curve',
  },
  {
    label: 'easeInOutSine',
    insertText: 'easeInOutSine',
    detail: 'Gładka krzywa sinusoidalna S-curve dla glide()',
    kind: 'curve',
  },
  {
    label: 'detune',
    insertText: 'detune:+5ct',
    detail: 'Odstrojenie mikrotonalne w centach (100ct = półton)',
    kind: 'param',
  },
  {
    label: 'duty',
    insertText: 'duty:0.25',
    detail: 'Współczynnik wypełnienia fali impulsowej (0.05..0.95)',
    kind: 'param',
  },
];

export const nanosoundParser = {
  id: 'nanosound',
  name: 'NanoSound DSL',
  aliases: ['nanosound', 'nsd', 'sound'],
  grammar: nanosoundGrammar,
};

export default nanosoundParser;
