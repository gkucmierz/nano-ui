import { javascriptParser } from './javascript.js';
import { typescriptParser } from './typescript.js';
import { vueParser, htmlParser } from './vue.js';
import { cssParser } from './css.js';
import { jsonParser } from './json.js';
import { bashParser } from './bash.js';
import { markdownParser } from './markdown.js';
import { rustParser } from './rust.js';
import { pythonParser } from './python.js';
import { sqlParser } from './sql.js';
import { yamlParser } from './yaml.js';
import { goParser } from './go.js';
import { dockerfileParser } from './dockerfile.js';
import { diffParser } from './diff.js';
import { apiParser } from './api.js';
import { nanosoundParser, NANOSOUND_COMPLETIONS } from './nanosound.js';
import { glslParser, GLSL_COMPLETIONS } from './glsl.js';

export const CORE_PARSERS = [
  javascriptParser,
  typescriptParser,
  vueParser,
  cssParser,
  jsonParser,
  bashParser,
  markdownParser,
  diffParser,
  apiParser,
  nanosoundParser,
  glslParser,
];

export const EXTRA_PARSERS = [
  rustParser,
  pythonParser,
  sqlParser,
  yamlParser,
  goParser,
  dockerfileParser,
];

export const ALL_PARSERS = [
  ...CORE_PARSERS,
  ...EXTRA_PARSERS,
];

export const PARSER_MAP = {
  javascript: javascriptParser,
  js: javascriptParser,
  typescript: typescriptParser,
  ts: typescriptParser,
  vue: vueParser,
  html: htmlParser,
  xml: vueParser,
  css: cssParser,
  json: jsonParser,
  bash: bashParser,
  sh: bashParser,
  markdown: markdownParser,
  md: markdownParser,
  rust: rustParser,
  rs: rustParser,
  python: pythonParser,
  py: pythonParser,
  sql: sqlParser,
  yaml: yamlParser,
  yml: yamlParser,
  go: goParser,
  dockerfile: dockerfileParser,
  docker: dockerfileParser,
  diff: diffParser,
  api: apiParser,
  nanosound: nanosoundParser,
  nsd: nanosoundParser,
  sound: nanosoundParser,
  glsl: glslParser,
  frag: glslParser,
  vert: glslParser,
  shader: glslParser,
  wgsl: glslParser,
  hlsl: glslParser,
  fs: glslParser,
  vs: glslParser,
};

export {
  javascriptParser,
  typescriptParser,
  vueParser,
  htmlParser,
  cssParser,
  jsonParser,
  bashParser,
  markdownParser,
  rustParser,
  pythonParser,
  sqlParser,
  yamlParser,
  goParser,
  dockerfileParser,
  diffParser,
  apiParser,
  nanosoundParser,
  NANOSOUND_COMPLETIONS,
  glslParser,
  GLSL_COMPLETIONS,
};
