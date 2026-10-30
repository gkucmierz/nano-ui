import { highlightCode, escapeHtml } from './syntax-highlighter.js';

const EXT_LANG_MAP = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  vue: 'vue',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  jsonld: 'json',
  md: 'markdown',
  markdown: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
  dockerfile: 'dockerfile',
};

/**
 * Infers syntax highlighting language from a file path or explicit language hint.
 * @param {string} [filePath='']
 * @param {string} [explicitLang='']
 * @returns {string}
 */
export const detectLangFromPath = (filePath = '', explicitLang = '') => {
  if (explicitLang && explicitLang !== 'auto') {
    return String(explicitLang).toLowerCase().trim();
  }
  if (!filePath || typeof filePath !== 'string') return '';
  const clean = filePath.split('?')[0].split('#')[0].trim();
  const base = clean.split('/').pop() || '';
  const lowerBase = base.toLowerCase();
  if (lowerBase === 'dockerfile') return 'dockerfile';
  const dotIdx = lowerBase.lastIndexOf('.');
  if (dotIdx === -1) return '';
  const ext = lowerBase.slice(dotIdx + 1);
  return EXT_LANG_MAP[ext] || ext;
};

/**
 * Normalizes a git file status indicator ('A', 'M', 'D', 'R', 'added', 'modified', etc.)
 * into a canonical descriptor for badges and icons.
 * @param {string} [status='M']
 * @returns {{ code: string, type: string, symbol: string, label: string }}
 */
export const normalizeFileStatus = (status = 'M') => {
  const raw = String(status || 'M').trim().toUpperCase();
  if (raw === 'A' || raw === 'ADDED' || raw === 'NEW' || raw === '?') {
    return { code: 'A', type: 'added', symbol: '+', label: 'Added' };
  }
  if (raw === 'D' || raw === 'DELETED' || raw === 'REMOVED') {
    return { code: 'D', type: 'deleted', symbol: '−', label: 'Deleted' };
  }
  if (raw.startsWith('R') || raw === 'RENAMED' || raw === 'MOVED') {
    return { code: 'R', type: 'renamed', symbol: '→', label: 'Renamed' };
  }
  return { code: 'M', type: 'modified', symbol: '•', label: 'Modified' };
};

/**
 * Smart middle-truncation for file paths modeled after GitHub Desktop:
 * Keeps leading root segment and file basename readable while collapsing middle segments
 * into '...' when the total path exceeds `maxLength`.
 *
 * Returns separate `displayDir` (muted prefix) and `displayFile` (emphasized basename)
 * so UI components can style them distinctly.
 *
 * @param {string} filePath
 * @param {number} [maxLength=34]
 * @returns {{ fullPath: string, dirPart: string, fileName: string, displayDir: string, displayFile: string, displayPath: string }}
 */
export const middleTruncatePath = (filePath, maxLength = 34) => {
  const fullPath = String(filePath || '').trim();
  if (!fullPath) {
    return { fullPath: '', dirPart: '', fileName: '', displayDir: '', displayFile: '', displayPath: '' };
  }

  const lastSlash = fullPath.lastIndexOf('/');
  const dirPart = lastSlash !== -1 ? fullPath.slice(0, lastSlash + 1) : '';
  const fileName = lastSlash !== -1 ? fullPath.slice(lastSlash + 1) : fullPath;

  if (fullPath.length <= maxLength) {
    return {
      fullPath,
      dirPart,
      fileName,
      displayDir: dirPart,
      displayFile: fileName,
      displayPath: fullPath,
    };
  }

  const segments = fullPath.split('/');

  // Single filename without directory
  if (segments.length === 1) {
    const half = Math.max(4, Math.floor((maxLength - 3) / 2));
    const truncated = `${fileName.slice(0, half)}...${fileName.slice(-half)}`;
    return {
      fullPath,
      dirPart: '',
      fileName,
      displayDir: '',
      displayFile: truncated,
      displayPath: truncated,
    };
  }

  const firstSeg = segments[0];

  // If collapsing middle directory segments into `firstSeg/.../fileName` is enough (or only 2 segments exist)
  if (firstSeg.length + 5 + fileName.length > maxLength) {
    if (segments.length >= 3 && firstSeg.length + 5 + fileName.length <= maxLength + 6) {
      const shortDir = `${firstSeg}/.../`;
      return {
        fullPath,
        dirPart,
        fileName,
        displayDir: shortDir,
        displayFile: fileName,
        displayPath: `${shortDir}${fileName}`,
      };
    }
    const availForFile = Math.max(10, maxLength - firstSeg.length - 5);
    if (fileName.length > availForFile) {
      const keepEnd = Math.max(6, availForFile - 5);
      const keepStart = Math.max(2, availForFile - keepEnd - 3);
      const shortFile = `${fileName.slice(0, keepStart)}...${fileName.slice(-keepEnd)}`;
      const shortDir = `${firstSeg}/`;
      return {
        fullPath,
        dirPart,
        fileName,
        displayDir: shortDir,
        displayFile: shortFile,
        displayPath: `${shortDir}${shortFile}`,
      };
    }
    const shortDir = `${firstSeg}/.../`;
    return {
      fullPath,
      dirPart,
      fileName,
      displayDir: shortDir,
      displayFile: fileName,
      displayPath: `${shortDir}${fileName}`,
    };
  }

  // Otherwise keep as much of the leading directory prefix as fits before '.../' + fileName
  const budgetForDir = maxLength - fileName.length - 4; // reserve '.../'
  let accDir = firstSeg;
  for (let i = 1; i < segments.length - 1; i++) {
    const candidate = `${accDir}/${segments[i]}`;
    if (candidate.length <= budgetForDir) {
      accDir = candidate;
    } else {
      const remaining = budgetForDir - accDir.length - 1;
      if (remaining >= 3) {
        accDir = `${accDir}/${segments[i].slice(0, remaining)}`;
      }
      break;
    }
  }

  const displayDir = `${accDir}.../`;
  return {
    fullPath,
    dirPart,
    fileName,
    displayDir,
    displayFile: fileName,
    displayPath: `${displayDir}${fileName}`,
  };
};

/**
 * Parses a unified git diff (or raw patch) into line objects for both Unified and Split diff views,
 * with per-line syntax highlighting via highlight.js.
 *
 * @param {string} rawDiff
 * @param {string} [lang='']
 * @returns {{
 *   lines: Array<{ id: string, type: 'hunk'|'add'|'del'|'ctx'|'meta', oldNumber: number|null, newNumber: number|null, prefix: string, content: string, html: string }>,
 *   splitRows: Array<{ id: string, type: 'hunk'|'pair', hunkText?: string, left: object|null, right: object|null }>,
 *   additions: number,
 *   deletions: number
 * }}
 */
export const parseUnifiedDiff = (rawDiff = '', lang = '') => {
  if (!rawDiff || typeof rawDiff !== 'string') {
    return { lines: [], splitRows: [], additions: 0, deletions: 0 };
  }

  const rawLines = rawDiff.replace(/\r\n/g, '\n').split('\n');
  const lines = [];
  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let deletions = 0;
  let seenHunk = false;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];

    // Skip git metadata headers before the first hunk unless there are no hunks at all
    if (
      raw.startsWith('diff --git ') ||
      raw.startsWith('index ') ||
      raw.startsWith('new file mode ') ||
      raw.startsWith('deleted file mode ') ||
      raw.startsWith('similarity index ') ||
      raw.startsWith('rename from ') ||
      raw.startsWith('rename to ') ||
      raw.startsWith('--- ') ||
      raw.startsWith('+++ ') ||
      raw.startsWith('\\ No newline at end of file')
    ) {
      continue;
    }

    const hunkMatch = raw.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)$/);
    if (hunkMatch) {
      seenHunk = true;
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      lines.push({
        id: `L-${i}`,
        type: 'hunk',
        oldNumber: null,
        newNumber: null,
        prefix: '@@',
        content: raw,
        html: escapeHtml(raw),
      });
      continue;
    }

    if (raw.startsWith('+')) {
      const content = raw.slice(1);
      additions++;
      lines.push({
        id: `L-${i}`,
        type: 'add',
        oldNumber: null,
        newNumber: newLine++,
        prefix: '+',
        content,
        html: highlightCode(content, lang) || escapeHtml(content),
      });
    } else if (raw.startsWith('-')) {
      const content = raw.slice(1);
      deletions++;
      lines.push({
        id: `L-${i}`,
        type: 'del',
        oldNumber: oldLine++,
        newNumber: null,
        prefix: '-',
        content,
        html: highlightCode(content, lang) || escapeHtml(content),
      });
    } else {
      // Skip trailing empty line after final newline
      if (i === rawLines.length - 1 && raw === '' && seenHunk) continue;
      const content = raw.startsWith(' ') ? raw.slice(1) : raw;
      lines.push({
        id: `L-${i}`,
        type: 'ctx',
        oldNumber: oldLine++,
        newNumber: newLine++,
        prefix: ' ',
        content,
        html: highlightCode(content, lang) || escapeHtml(content),
      });
    }
  }

  // Build side-by-side split rows by pairing contiguous blocks of 'del' and 'add'
  const splitRows = [];
  let idx = 0;
  while (idx < lines.length) {
    const item = lines[idx];
    if (item.type === 'hunk') {
      splitRows.push({
        id: item.id,
        type: 'hunk',
        hunkText: item.content,
        left: null,
        right: null,
      });
      idx++;
      continue;
    }
    if (item.type === 'ctx') {
      splitRows.push({
        id: item.id,
        type: 'pair',
        left: item,
        right: item,
      });
      idx++;
      continue;
    }

    // Collect contiguous deletions and additions
    const dels = [];
    const adds = [];
    while (idx < lines.length && (lines[idx].type === 'del' || lines[idx].type === 'add')) {
      if (lines[idx].type === 'del') dels.push(lines[idx]);
      else adds.push(lines[idx]);
      idx++;
    }
    const maxLen = Math.max(dels.length, adds.length);
    for (let k = 0; k < maxLen; k++) {
      const left = dels[k] || null;
      const right = adds[k] || null;
      splitRows.push({
        id: `${left?.id || 'empty'}_${right?.id || 'empty'}_${k}`,
        type: 'pair',
        left,
        right,
      });
    }
  }

  return {
    lines,
    splitRows,
    additions,
    deletions,
  };
};
