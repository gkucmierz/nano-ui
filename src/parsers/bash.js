const bashGrammar = (hljsInstance) => {
  const CLI_COMMANDS = [
    'npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'bun', 'bunx', 'node', 'deno',
    'git', 'docker', 'docker-compose', 'compose', 'kubectl', 'curl', 'wget', 'ssh',
    'sudo', 'brew', 'apt', 'apk', 'cargo', 'rustc', 'pip', 'pip3', 'python', 'python3', 'make',
    'cat', 'grep', 'find', 'sed', 'awk', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown',
    'systemctl', 'journalctl', 'tar', 'gzip', 'unzip', 'vim', 'nano', 'tail', 'head', 'echo',
    'cd', 'pwd', 'clear', 'export', 'alias', 'source', 'exit', 'history', 'which', 'whoami',
  ];

  const CLI_SUBCOMMANDS = [
    'install', 'i', 'add', 'remove', 'rm', 'update', 'upgrade', 'run', 'build',
    'test', 'dev', 'start', 'preview', 'lint', 'init', 'create', 'publish',
    'commit', 'push', 'pull', 'checkout', 'clone', 'status', 'diff', 'branch',
    'merge', 'rebase', 'stash', 'tag', 'log', 'show', 'reset', 'up', 'down',
    'ps', 'exec', 'logs', 'stop', 'restart', 'apply', 'get', 'describe', 'delete',
  ];

  return {
    name: 'Bash',
    aliases: ['sh', 'zsh', 'shell'],
    keywords: {
      $pattern: /\b[a-zA-Z_-][a-zA-Z0-9_.-]*\b/,
      built_in: CLI_COMMANDS,
      keyword: CLI_SUBCOMMANDS.concat([
        'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'until', 'in', 'do', 'done',
        'case', 'esac', 'function', 'select', 'return',
      ]),
      literal: ['true', 'false', 'null'],
    },
    contains: [
      hljsInstance.HASH_COMMENT_MODE,
      hljsInstance.QUOTE_STRING_MODE,
      hljsInstance.APOS_STRING_MODE,
      hljsInstance.NUMBER_MODE,
      {
        className: 'punctuation',
        match: /^\s*\$\s+/,
      },
      {
        className: 'attr',
        match: /--?[a-zA-Z0-9][-a-zA-Z0-9]*/,
      },
      {
        className: 'string',
        match: /@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(?:@[a-zA-Z0-9_.-]+)?/,
      },
      {
        className: 'variable',
        match: /\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\}/,
      },
    ],
  };
};

export const bashParser = {
  id: 'bash',
  name: 'Bash / Shell',
  aliases: ['bash', 'sh', 'zsh', 'shell'],
  grammar: bashGrammar,
};

export default bashParser;
