import dockerfileGrammar from 'highlight.js/lib/languages/dockerfile';
import { bashParser } from './bash.js';

export const dockerfileParser = {
  id: 'dockerfile',
  name: 'Dockerfile',
  aliases: ['dockerfile', 'docker'],
  grammar: dockerfileGrammar,
  dependencies: [bashParser],
};

export default dockerfileParser;
