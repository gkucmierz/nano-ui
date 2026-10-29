const toStringTag = (val) => Object.prototype.toString.call(val);
const isObject = (val) => val !== null && toStringTag(val) === '[object Object]';
const isFunction = (val) => toStringTag(val) === '[object Function]';

/**
 * Standard slot token definitions for declarative mask strings.
 */
export const DEFAULT_TOKENS = {
  '#': { pattern: /[0-9]/ },
  '9': { pattern: /[0-9]/ },
  'a': { pattern: /[a-z]/ },
  'A': { pattern: /[a-zA-Z]/, transform: (char) => char.toUpperCase() },
  'L': { pattern: /[a-zA-Z]/ },
  'X': { pattern: /[0-9a-zA-Z]/ },
  'H': { pattern: /[0-9a-fA-F]/ },
  '*': { pattern: /./ },
};

/**
 * Resolves the effective token map by merging DEFAULT_TOKENS with optional custom tokens.
 *
 * @param {Object} [tokens=DEFAULT_TOKENS] - Custom token definitions
 * @returns {Object}
 */
export const resolveTokens = (tokens = DEFAULT_TOKENS) => {
  if (!isObject(tokens) || tokens === DEFAULT_TOKENS) return DEFAULT_TOKENS;
  return { ...DEFAULT_TOKENS, ...tokens };
};

/**
 * Parses a mask string into an array of slot and literal steps, honoring backslash escaping (`\#`, `\9`).
 *
 * @param {string} mask - Mask pattern string
 * @param {Object} [tokens=DEFAULT_TOKENS] - Token definitions
 * @returns {Array<{ type: 'slot'|'literal', char: string, token?: { pattern: RegExp, transform?: Function } }>}
 */
export const parseMaskSteps = (mask = '', tokens = DEFAULT_TOKENS) => {
  const activeTokens = resolveTokens(tokens);
  const str = String(mask ?? '');
  const steps = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\' && i + 1 < str.length) {
      steps.push({ type: 'literal', char: str[++i] });
      continue;
    }

    const tokenDef = activeTokens[ch];
    if (tokenDef && tokenDef.pattern instanceof RegExp) {
      steps.push({ type: 'slot', char: ch, token: tokenDef });
    } else {
      steps.push({ type: 'literal', char: ch });
    }
  }

  return steps;
};

/**
 * Counts the number of dynamic input slots in a mask pattern, ignoring escaped tokens and literals.
 *
 * @param {string} mask - Mask pattern string
 * @param {Object} [tokens=DEFAULT_TOKENS] - Token definitions
 * @returns {number} Number of dynamic slots
 */
export const countSlots = (mask = '', tokens = DEFAULT_TOKENS) => {
  const steps = parseMaskSteps(mask, tokens);
  let count = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].type === 'slot') count++;
  }
  return count;
};

/**
 * Applies a declarative mask pattern to a raw or partially formatted input value.
 *
 * @param {string} rawValue - Raw or formatted input string
 * @param {string} mask - Mask pattern (e.g. "###-###", "#### ####", "\\#99-99")
 * @param {Object} [tokens=DEFAULT_TOKENS] - Token map
 * @param {string} [placeholderChar='-'] - Guide placeholder character for unfilled slots
 * @returns {{ formatted: string, unmasked: string, isComplete: boolean, remainingGuide: string, guideTemplate: string }}
 */
export const applyMask = (rawValue, mask = '', tokens = DEFAULT_TOKENS, placeholderChar = '-') => {
  const cleanInput = String(rawValue ?? '');
  const steps = parseMaskSteps(mask, tokens);
  const totalSlots = steps.reduce((acc, s) => acc + (s.type === 'slot' ? 1 : 0), 0);
  const fillChar = String(placeholderChar ?? '-') || '-';

  let guideTemplate = '';
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    guideTemplate += step.type === 'slot' ? fillChar : step.char;
  }

  if (!cleanInput) {
    return {
      formatted: '',
      unmasked: '',
      isComplete: totalSlots === 0,
      remainingGuide: guideTemplate,
      guideTemplate,
    };
  }

  let formatted = '';
  let unmasked = '';
  let inputIdx = 0;
  let pendingLiterals = '';

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (step.type === 'literal') {
      pendingLiterals += step.char;

      if (inputIdx < cleanInput.length && cleanInput[inputIdx] === step.char) {
        const nextSlotStep = steps.slice(i + 1).find((s) => s.type === 'slot');
        if (!nextSlotStep || !nextSlotStep.token.pattern.test(step.char)) {
          inputIdx++;
        } else {
          const remainingSlots = steps.slice(i + 1).filter((s) => s.type === 'slot').length;
          let matchingRemaining = 0;
          for (let k = inputIdx; k < cleanInput.length; k++) {
            if (nextSlotStep.token.pattern.test(cleanInput[k])) matchingRemaining++;
          }
          if (matchingRemaining > remainingSlots) {
            inputIdx++;
          }
        }
      }
      continue;
    }

    let matched = false;
    while (inputIdx < cleanInput.length) {
      let candidate = cleanInput[inputIdx++];
      if (step.token.pattern.test(candidate)) {
        if (isFunction(step.token.transform)) {
          candidate = step.token.transform(candidate);
        }
        if (pendingLiterals) {
          formatted += pendingLiterals;
          pendingLiterals = '';
        }
        formatted += candidate;
        unmasked += candidate;
        matched = true;
        break;
      }
    }

    if (!matched) {
      break;
    }
  }

  const isComplete = unmasked.length === totalSlots;
  if (isComplete && pendingLiterals) {
    formatted += pendingLiterals;
    pendingLiterals = '';
  }

  const remainingGuide = guideTemplate.slice(formatted.length);

  return {
    formatted,
    unmasked,
    isComplete,
    remainingGuide,
    guideTemplate,
  };
};
