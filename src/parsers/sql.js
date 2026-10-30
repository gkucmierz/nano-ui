import sqlGrammar from 'highlight.js/lib/languages/sql';

export const sqlParser = {
  id: 'sql',
  name: 'SQL',
  aliases: ['sql', 'sqlite', 'postgres', 'postgresql'],
  grammar: sqlGrammar,
};

export default sqlParser;
