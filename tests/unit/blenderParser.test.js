import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  highlightCode,
  highlightBlender,
  highlightBpy,
  isParserRegistered,
} from '../../src/utils/syntax-highlighter.js';
import { detectLangFromPath } from '../../src/utils/git-diff.js';
import {
  blenderParser,
  BLENDER_COMPLETIONS,
  CORE_PARSERS,
  ALL_PARSERS,
  PARSER_MAP,
} from '../../src/parsers/index.js';

describe('Blender Python (bpy / bmesh / mathutils) Syntax Highlighting & Completions', () => {
  test('registers blenderParser and bpy/blender/bmesh aliases out-of-the-box in CORE_PARSERS and PARSER_MAP', () => {
    assert.ok(CORE_PARSERS.includes(blenderParser));
    assert.ok(ALL_PARSERS.includes(blenderParser));

    for (const alias of ['bpy', 'blender', 'blender-python', 'bmesh']) {
      assert.equal(PARSER_MAP[alias], blenderParser, `PARSER_MAP.${alias} should point to blenderParser`);
      assert.equal(isParserRegistered(alias), true, `Alias "${alias}" should be registered in hljs`);
    }
  });

  test('detectLangFromPath resolves .bpy, .bmesh, .bpy.py, and *_blender.py scripts to bpy', () => {
    assert.equal(detectLangFromPath('scripts/generate_pokeball_blender.py'), 'bpy');
    assert.equal(detectLangFromPath('scripts/generate-stairs-blender.py'), 'bpy');
    assert.equal(detectLangFromPath('pipeline/scene.bpy.py'), 'bpy');
    assert.equal(detectLangFromPath('snippets/export.bpy'), 'bpy');
    assert.equal(detectLangFromPath('topology/hull.bmesh'), 'bpy');
    assert.equal(detectLangFromPath('regular_script.py'), 'python');
  });

  test('highlights Blender 5.x bpy/bmesh namespaces, ShaderNode/GLB symbols, kwargs, types, comments, and escapes XSS', () => {
    const sample = `# Blender 5.2.2 LTS — Headless CLI Pipeline
import bpy, bmesh
from mathutils import Vector, Euler

@bpy.app.handlers.persistent
def build_crystal(radius=1.0):
    bm = bmesh.new()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, radius=radius)
    bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Transmission Weight"].default_value = 1.0
    bsdf.inputs["IOR"].default_value = 1.45
    mod = obj.modifiers.new("CrystalBevel", "BEVEL")
    scene.render.engine = "CYCLES"
    bpy.ops.export_scene.gltf(
        filepath="public/models/pokeball-step-7.glb",
        export_format="GLB",
        export_apply=True,
        export_yup=True,
    )
    # XSS safety: <script>alert(1)</script>
    return Vector((0.0, 0.0, 1.0))`;

    const html = highlightBlender(sample);
    assert.equal(html, highlightBpy(sample));
    assert.equal(html, highlightCode(sample, 'blender'));
    assert.equal(html, highlightCode(sample, 'bmesh'));

    assert.match(html, /<span class="hljs-comment"># Blender 5\.2\.2 LTS — Headless CLI Pipeline<\/span>/);
    assert.match(html, /<span class="hljs-keyword">import<\/span>/);
    assert.match(html, /<span class="hljs-keyword">from<\/span>/);
    assert.match(html, /<span class="hljs-keyword">def<\/span>/);
    assert.match(html, /<span class="hljs-meta">@bpy\.app\.handlers\.persistent<\/span>/);
    assert.match(html, /<span class="hljs-variable">bpy<\/span>/);
    assert.match(html, /<span class="hljs-variable">bmesh<\/span>/);
    assert.match(html, /<span class="hljs-variable">mathutils<\/span>/);
    assert.match(html, /<span class="hljs-type">Vector<\/span>/);
    assert.match(html, /<span class="hljs-type">Euler<\/span>/);
    assert.match(html, /<span class="hljs-property">\.ops<\/span>/);
    assert.match(html, /<span class="hljs-property">\.export_scene<\/span>/);
    assert.match(html, /<span class="hljs-built_in">primitive_uv_sphere_add<\/span>/);
    assert.match(html, /<span class="hljs-built_in">gltf<\/span>/);
    assert.match(html, /<span class="hljs-symbol">&quot;ShaderNodeBsdfPrincipled&quot;<\/span>/);
    assert.match(html, /<span class="hljs-symbol">&quot;Transmission Weight&quot;<\/span>/);
    assert.match(html, /<span class="hljs-symbol">&quot;BEVEL&quot;<\/span>/);
    assert.match(html, /<span class="hljs-symbol">&quot;CYCLES&quot;<\/span>/);
    assert.match(html, /<span class="hljs-symbol">&quot;GLB&quot;<\/span>/);
    assert.match(html, /<span class="hljs-attr">filepath<\/span>/);
    assert.match(html, /<span class="hljs-attr">export_format<\/span>/);
    assert.match(html, /<span class="hljs-attr">segments<\/span>/);
    assert.match(html, /<span class="hljs-string">&quot;public\/models\/pokeball-step-7\.glb&quot;<\/span>/);
    assert.match(html, /<span class="hljs-literal">True<\/span>/);
    assert.match(html, /<span class="hljs-number">1\.45<\/span>/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);

    const bmeshTileSample = `bmesh.ops.create_cube(bm, size=1.0)\nbev.width, bev.segments = 0.042, 3\nf.normal.z > 0.9`;
    const bmeshHtml = highlightCode(bmeshTileSample, 'bpy');
    assert.match(bmeshHtml, /<span class="hljs-built_in">create_cube<\/span>/);
    assert.match(bmeshHtml, /<span class="hljs-property">\.width<\/span>/);
    assert.match(bmeshHtml, /<span class="hljs-property">\.segments<\/span>/);
    assert.match(bmeshHtml, /<span class="hljs-property">\.z<\/span>/);
  });

  test('exports curated BLENDER_COMPLETIONS covering mesh ops, bmesh, Principled BSDF, modifiers, and GLB export', () => {
    assert.ok(Array.isArray(BLENDER_COMPLETIONS));
    assert.ok(BLENDER_COMPLETIONS.length >= 16);
    const labels = new Set(BLENDER_COMPLETIONS.map((c) => c.label));
    for (const expected of [
      'bpy.ops.mesh.primitive_uv_sphere_add',
      'bpy.ops.export_scene.gltf',
      'bmesh.new',
      'bmesh.ops.bisect_plane',
      'ShaderNodeBsdfPrincipled',
      'Transmission Weight',
      'SUBSURF',
      'BEVEL',
      'CYCLES',
    ]) {
      assert.ok(labels.has(expected), `BLENDER_COMPLETIONS should include ${expected}`);
    }
  });
});
