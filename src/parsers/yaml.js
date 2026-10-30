import yamlGrammar from 'highlight.js/lib/languages/yaml';

export const yamlParser = {
  id: 'yaml',
  name: 'YAML',
  aliases: ['yaml', 'yml'],
  grammar: yamlGrammar,
};

export default yamlParser;
