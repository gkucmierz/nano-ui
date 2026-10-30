import diffGrammar from 'highlight.js/lib/languages/diff';

export const diffParser = {
  id: 'diff',
  name: 'Diff / Patch',
  aliases: ['diff', 'patch'],
  grammar: diffGrammar,
};

export default diffParser;
