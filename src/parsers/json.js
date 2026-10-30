import jsonGrammar from 'highlight.js/lib/languages/json';

export const jsonParser = {
  id: 'json',
  name: 'JSON',
  aliases: ['json', 'jsonc', 'jsonl'],
  grammar: jsonGrammar,
};

export default jsonParser;
