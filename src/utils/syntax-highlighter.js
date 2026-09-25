/**
 * Nano UI Syntax Highlighter powered by Highlight.js
 * Robust AST / grammar-based highlighting matching knowledge-base & ecosystem standards.
 */
import hljs from 'highlight.js'

// Ensure 'vue' and 'htmls' are registered as aliases for XML/HTML template syntax
if (!hljs.getLanguage('vue')) {
  hljs.registerAliases(['vue', 'htmls'], { languageName: 'xml' })
}

// Register dedicated 'api' grammar for component API reference blocks
hljs.registerLanguage('api', (hljsInstance) => {
  return {
    name: 'API Reference',
    aliases: ['api'],
    contains: [
      hljsInstance.C_LINE_COMMENT_MODE,
      hljsInstance.C_BLOCK_COMMENT_MODE,
      {
        className: 'comment',
        begin: /<!--/,
        end: /-->/,
      },
      // Descriptions after " - " or " -- " until end of line are rendered as clean comments
      {
        className: 'comment',
        begin: /\s+--?\s+/,
        end: /$/,
        relevance: 0,
      },
      hljsInstance.QUOTE_STRING_MODE,
      hljsInstance.APOS_STRING_MODE,
      hljsInstance.NUMBER_MODE,
      {
        className: 'literal',
        match: /\b(true|false|null|undefined)\b/,
      },
      {
        scope: 'title.class',
        match: /\b(String|Number|Boolean|Array|Object|Function|Promise|Symbol|BigInt|Date|RegExp|Map|Set|Event|HTMLElement|Element|Node|VNode)\b/,
      },
      {
        className: 'keyword',
        match: /\b(required|optional|default|readonly|v-model)\b/,
      },
      {
        className: 'symbol',
        match: /#[a-zA-Z0-9_-]+/,
      },
      {
        className: 'variable',
        match: /@[a-zA-Z0-9_:-]+/,
      },
      {
        scope: 'title.function',
        match: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/,
      },
      {
        className: 'attr',
        match: /^[ \t]*[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:)/,
      },
    ],
  }
})

// Register enhanced Bash grammar with CLI commands, subcommands, flags, and scoped packages
hljs.registerLanguage('bash', (hljsInstance) => {
  const CLI_COMMANDS = [
    'npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'bun', 'bunx', 'node', 'deno',
    'git', 'docker', 'docker-compose', 'compose', 'kubectl', 'curl', 'wget', 'ssh',
    'sudo', 'brew', 'apt', 'apk', 'cargo', 'rustc', 'pip', 'pip3', 'python', 'python3', 'make',
    'cat', 'grep', 'find', 'sed', 'awk', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown',
    'systemctl', 'journalctl', 'tar', 'gzip', 'unzip', 'vim', 'nano', 'tail', 'head', 'echo',
    'cd', 'pwd', 'clear', 'export', 'alias', 'source', 'exit', 'history', 'which', 'whoami'
  ]

  const CLI_SUBCOMMANDS = [
    'install', 'i', 'add', 'remove', 'rm', 'update', 'upgrade', 'run', 'build',
    'test', 'dev', 'start', 'preview', 'lint', 'init', 'create', 'publish',
    'commit', 'push', 'pull', 'checkout', 'clone', 'status', 'diff', 'branch',
    'merge', 'rebase', 'stash', 'tag', 'log', 'show', 'reset', 'up', 'down',
    'ps', 'exec', 'logs', 'stop', 'restart', 'apply', 'get', 'describe', 'delete'
  ]

  return {
    name: 'Bash',
    aliases: ['sh', 'zsh', 'shell'],
    keywords: {
      $pattern: /\b[a-zA-Z_-][a-zA-Z0-9_.-]*\b/,
      built_in: CLI_COMMANDS,
      keyword: CLI_SUBCOMMANDS.concat([
        'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'until', 'in', 'do', 'done',
        'case', 'esac', 'function', 'select', 'return'
      ]),
      literal: ['true', 'false', 'null']
    },
    contains: [
      hljsInstance.HASH_COMMENT_MODE,
      hljsInstance.QUOTE_STRING_MODE,
      hljsInstance.APOS_STRING_MODE,
      hljsInstance.NUMBER_MODE,
      {
        className: 'punctuation',
        match: /^\s*\$\s+/
      },
      {
        className: 'attr',
        match: /--?[a-zA-Z0-9][-a-zA-Z0-9]*/
      },
      {
        className: 'string',
        match: /@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(?:@[a-zA-Z0-9_.-]+)?/
      },
      {
        className: 'variable',
        match: /\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\}/
      }
    ]
  }
})

export const escapeHtml = (str) => {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const highlightJs = (code) => highlightCode(code, 'javascript')
export const highlightCss = (code) => highlightCode(code, 'css')
export const highlightHtml = (code) => highlightCode(code, 'html')
export const highlightVue = (code) => highlightCode(code, 'vue')

/**
 * Highlights a code snippet using highlight.js with safe fallback to escaped HTML.
 * @param {string} code
 * @param {string} [lang='']
 * @returns {string}
 */
export const highlightCode = (code, lang = '') => {
  if (!code) return ''
  const normalizedLang = String(lang).toLowerCase().trim()

  try {
    if (normalizedLang && hljs.getLanguage(normalizedLang)) {
      return hljs.highlight(code, { language: normalizedLang, ignoreIllegals: true }).value
    }
    if (!normalizedLang) {
      return hljs.highlightAuto(code).value || escapeHtml(code)
    }
    return escapeHtml(code)
  } catch {
    return escapeHtml(code)
  }
}

export default highlightCode
