const apiGrammar = (hljsInstance) => {
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
  };
};

export const apiParser = {
  id: 'api',
  name: 'API Reference',
  aliases: ['api'],
  grammar: apiGrammar,
};

export default apiParser;
