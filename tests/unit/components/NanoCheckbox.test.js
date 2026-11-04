import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

describe('NanoCheckbox & Playground Label Click Integrity', () => {
  it('supports indeterminate tri-state and emits update:indeterminate on toggle', () => {
    const src = fs.readFileSync(path.join(rootDir, 'src/components/NanoCheckbox.vue'), 'utf8');
    assert.ok(src.includes('type: [Boolean, null]'), 'modelValue should support Boolean and null');
    assert.ok(src.includes("'update:indeterminate'"), 'should declare update:indeterminate emit');
    assert.ok(src.includes("emit('update:indeterminate', false)"), 'should clear indeterminate on toggle');
    assert.ok(src.includes('@click.stop.prevent="toggle"'), 'label click should invoke toggle');
  });

  it('uses independent v-model refs for all size and color checkboxes in SwitchDoc.vue', () => {
    const src = fs.readFileSync(path.join(rootDir, 'src/playground/docs/SwitchDoc.vue'), 'utf8');
    assert.ok(src.includes('v-model="cbSm"'), 'Small checkbox should have independent cbSm ref');
    assert.ok(src.includes('v-model="cbMd"'), 'Medium checkbox should have independent cbMd ref');
    assert.ok(src.includes('v-model="cbLg"'), 'Large checkbox should have independent cbLg ref');
    assert.ok(src.includes('v-model="sizeDefaultVal"'), 'Default size switch should have independent sizeDefaultVal ref');
    assert.ok(
      src.includes('v-model="cbIndeterminate" v-model:indeterminate="cbIsIndeterminate"'),
      'Indeterminate checkbox should bind v-model:indeterminate so clicking toggles it'
    );
  });

  it('wraps all toggle-row and switch-row switch pairs in <label> across playground docs', () => {
    const docsDir = path.join(rootDir, 'src/playground/docs');
    const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.vue'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
      assert.ok(
        !content.includes('<div class="control-group toggle-row">'),
        `${file} should use <label class="control-group toggle-row"> instead of <div>`
      );
      assert.ok(
        !content.includes('<div class="switch-row"'),
        `${file} should use <label class="switch-row"> instead of <div>`
      );
    }
  });
});
