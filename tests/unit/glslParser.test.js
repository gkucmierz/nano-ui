import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  highlightCode,
  highlightGlsl,
  isParserRegistered,
} from '../../src/utils/syntax-highlighter.js';
import { detectLangFromPath } from '../../src/utils/git-diff.js';
import {
  glslParser,
  GLSL_COMPLETIONS,
  CORE_PARSERS,
  ALL_PARSERS,
  PARSER_MAP,
} from '../../src/parsers/index.js';

describe('GLSL / WGSL / Shader Syntax Highlighting & Completions', () => {
  test('registers glslParser and shader aliases out-of-the-box in CORE_PARSERS and PARSER_MAP', () => {
    assert.ok(CORE_PARSERS.includes(glslParser));
    assert.ok(ALL_PARSERS.includes(glslParser));

    for (const alias of ['glsl', 'frag', 'vert', 'shader', 'wgsl', 'hlsl', 'fs', 'vs']) {
      assert.equal(PARSER_MAP[alias], glslParser, `PARSER_MAP.${alias} should point to glslParser`);
      assert.equal(isParserRegistered(alias), true, `Alias "${alias}" should be registered in hljs`);
    }
  });

  test('detectLangFromPath resolves shader file extensions to glsl', () => {
    assert.equal(detectLangFromPath('src/shaders/sdfCathedral.glsl'), 'glsl');
    assert.equal(detectLangFromPath('shaders/kerrBlackHole.frag'), 'glsl');
    assert.equal(detectLangFromPath('shaders/fullscreenQuad.vert'), 'glsl');
    assert.equal(detectLangFromPath('compute/fluid.wgsl'), 'glsl');
    assert.equal(detectLangFromPath('post/bloom.hlsl'), 'glsl');
    assert.equal(detectLangFromPath('pass0.fs'), 'glsl');
    assert.equal(detectLangFromPath('pass0.vs'), 'glsl');
    assert.equal(detectLangFromPath('custom.shader'), 'glsl');
  });

  test('highlights WebGL2 GLSL ES 3.00 raymarching SDF tokens, swizzles, uniforms, and WGSL attributes', () => {
    const sample = `#version 300 es
precision highp float;
uniform vec4 iParams;
uniform vec4 iAudio;

@fragment
vec2 c01_map(vec3 pos) {
  float blendK = mix(0.14, 0.68, iParams.x) + 0.08 * iAudio.z;
  float pillar = length(pos.xz) - 0.27;
  return vec2(smin(pillar, pos.y, blendK), PI);
}`;

    const html = highlightGlsl(sample);
    assert.equal(html, highlightCode(sample, 'frag'));

    assert.match(html, /<span class="hljs-meta">#version <span class="hljs-number">300<\/span> <span class="hljs-keyword">es<\/span><\/span>/);
    assert.match(html, /<span class="hljs-keyword">precision<\/span>/);
    assert.match(html, /<span class="hljs-keyword">highp<\/span>/);
    assert.match(html, /<span class="hljs-keyword">uniform<\/span>/);
    assert.match(html, /<span class="hljs-symbol">@fragment<\/span>/);
    assert.match(html, /<span class="hljs-type">vec2<\/span>/);
    assert.match(html, /<span class="hljs-type">vec3<\/span>/);
    assert.match(html, /<span class="hljs-type">vec4<\/span>/);
    assert.match(html, /<span class="hljs-title function_">c01_map<\/span>/);
    assert.match(html, /<span class="hljs-title function_">smin<\/span>/);
    assert.match(html, /<span class="hljs-built_in">mix<\/span>/);
    assert.match(html, /<span class="hljs-built_in">length<\/span>/);
    assert.match(html, /<span class="hljs-variable">iParams<\/span>/);
    assert.match(html, /<span class="hljs-variable">iAudio<\/span>/);
    assert.match(html, /<span class="hljs-property">\.x<\/span>/);
    assert.match(html, /<span class="hljs-property">\.xz<\/span>/);
    assert.match(html, /<span class="hljs-number">0\.14<\/span>/);
    assert.match(html, /<span class="hljs-literal">PI<\/span>/);
    assert.match(html, /<span class="hljs-operator">\+<\/span>/);
  });

  test('exports curated GLSL_COMPLETIONS with vectors, SDF helpers, and Observatory uniforms', () => {
    assert.ok(Array.isArray(GLSL_COMPLETIONS));
    assert.ok(GLSL_COMPLETIONS.length >= 16);
    const labels = new Set(GLSL_COMPLETIONS.map((c) => c.label));
    for (const expected of ['vec2', 'vec3', 'vec4', 'smoothstep', 'mix', 'smin', 'iResolution', 'iTime', 'iAudio', 'iParams']) {
      assert.ok(labels.has(expected), `GLSL_COMPLETIONS should include ${expected}`);
    }
  });
});
