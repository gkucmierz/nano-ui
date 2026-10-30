import xmlGrammar from 'highlight.js/lib/languages/xml';
import { javascriptParser } from './javascript.js';
import { cssParser } from './css.js';

export const vueParser = {
  id: 'xml',
  name: 'Vue / HTML / XML',
  aliases: ['vue', 'html', 'xhtml', 'svg', 'xml', 'htmls'],
  grammar: xmlGrammar,
  dependencies: [javascriptParser, cssParser],
};

export const htmlParser = vueParser;

export default vueParser;
