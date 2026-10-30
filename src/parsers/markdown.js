import markdownGrammar from 'highlight.js/lib/languages/markdown';

export const markdownParser = {
  id: 'markdown',
  name: 'Markdown',
  aliases: ['md', 'markdown'],
  grammar: markdownGrammar,
};

export default markdownParser;
