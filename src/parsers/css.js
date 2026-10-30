import cssGrammar from 'highlight.js/lib/languages/css';

export const cssParser = {
  id: 'css',
  name: 'CSS',
  aliases: ['css', 'scss', 'less'],
  grammar: cssGrammar,
};

export default cssParser;
