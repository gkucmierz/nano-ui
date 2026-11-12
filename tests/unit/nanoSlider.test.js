import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sliderSfc = readFileSync(resolve(__dirname, '../../src/components/NanoSlider.vue'), 'utf8');
const indexJs = readFileSync(resolve(__dirname, '../../src/index.js'), 'utf8');
const routerJs = readFileSync(resolve(__dirname, '../../src/playground/router/index.js'), 'utf8');

describe('NanoSlider Component & Playground Integration', () => {
  it('should define modelValue, min, max, step, showTicks, size, and disabled props', () => {
    assert.ok(sliderSfc.includes('modelValue:'));
    assert.ok(sliderSfc.includes('min:'));
    assert.ok(sliderSfc.includes('max:'));
    assert.ok(sliderSfc.includes('step:'));
    assert.ok(sliderSfc.includes('showTicks:'));
    assert.ok(sliderSfc.includes('size:'));
    assert.ok(sliderSfc.includes('disabled:'));
  });

  it('should implement ARIA slider semantics, pointer capture, and keyboard navigation', () => {
    assert.ok(sliderSfc.includes('role="slider"'));
    assert.ok(sliderSfc.includes(':aria-valuemin="min"'));
    assert.ok(sliderSfc.includes(':aria-valuemax="max"'));
    assert.ok(sliderSfc.includes(':aria-valuenow="modelValue"'));
    assert.ok(sliderSfc.includes('setPointerCapture'));
    assert.ok(sliderSfc.includes('ArrowRight'));
    assert.ok(sliderSfc.includes('ArrowLeft'));
  });

  it('should be exported from index.js and registered in playground router (/docs/slider)', () => {
    assert.ok(indexJs.includes('NanoSlider'));
    assert.ok(routerJs.includes("path: '/docs/slider'"));
  });

  it('should walk up parentNode in resolveSliderSafeInsets and inset .nano-slider-rail so the circular thumb is never clipped at 0% or 100%', async () => {
    const { getSliderThumbOverhangPx, resolveSliderSafeInsets } = await import(
      '../../src/utils/sliderPositioning.js'
    );
    assert.equal(getSliderThumbOverhangPx('sm'), 9);
    assert.equal(getSliderThumbOverhangPx('md'), 11);
    assert.equal(getSliderThumbOverhangPx('lg'), 13);

    const fallback = resolveSliderSafeInsets(null, 'sm');
    assert.equal(fallback.safeLeftPx, 9);
    assert.equal(fallback.safeRightPx, 9);

    assert.ok(sliderSfc.includes('nano-slider-rail'));
    assert.ok(sliderSfc.includes('--_slider-safe-left'));
    assert.ok(sliderSfc.includes('--_slider-safe-right'));
  });

  it('enforces ACOUSTIC-MASS-01: thicker controls (lg) emit deeper, lower-pitched, heavier .nsd audio than md and sm across NanoSlider and all sized sound controls', async () => {
    const { readdirSync } = await import('node:fs');
    const {
      resolveControlAcousticMass,
      computeSliderAcousticEvents,
      configureNanoUiSound,
      resetNanoUiSoundConfig,
      playNanoUiSound,
    } = await import('../../src/utils/sound-controller.js');

    const xs = resolveControlAcousticMass('xs');
    const sm = resolveControlAcousticMass('sm');
    const md = resolveControlAcousticMass('md');
    const lg = resolveControlAcousticMass('lg');
    const xl = resolveControlAcousticMass('xl');

    assert.ok(
      xl.pitchScale < lg.pitchScale &&
        lg.pitchScale < md.pitchScale &&
        md.pitchScale < sm.pitchScale &&
        sm.pitchScale < xs.pitchScale,
      'Expected strict monotonic pitch ordering: xl < lg < md < sm < xs'
    );
    assert.ok(
      xs.gainScale < sm.gainScale &&
        sm.gainScale < md.gainScale &&
        md.gainScale < lg.gainScale &&
        lg.gainScale < xl.gainScale,
      'Expected ISO-226 loudness compensation ordering: xs < sm < md < lg < xl'
    );

    // Numeric pixel diameters (e.g. NanoKnob 36px vs 56px vs 96px)
    const knobSmall = resolveControlAcousticMass(36);
    const knobDefault = resolveControlAcousticMass(56);
    const knobLarge = resolveControlAcousticMass(96);
    assert.ok(knobLarge.pitchScale < knobDefault.pitchScale && knobDefault.pitchScale < knobSmall.pitchScale);

    // Slider drag swish & quartile crossings scale monotonically by size
    const evSm = computeSliderAcousticEvents(20, 28, { size: 'sm' });
    const evMd = computeSliderAcousticEvents(20, 28, { size: 'md' });
    const evLg = computeSliderAcousticEvents(20, 28, { size: 'lg' });
    assert.ok(evLg.swishPitch < evMd.swishPitch && evMd.swishPitch < evSm.swishPitch);
    assert.ok(evLg.quartilePitch < evMd.quartilePitch && evMd.quartilePitch < evSm.quartilePitch);

    // Verify playNanoUiSound selects dedicated low-register sliderSwishLg preset for size="lg"
    const captured = [];
    configureNanoUiSound({
      enabled: true,
      volume: 0.5,
      player: (dsl, meta) => captured.push({ dsl, meta }),
    });
    try {
      playNanoUiSound('sliderSwish', { size: 'sm', throttleKey: 't-sm', nowMs: 100 });
      playNanoUiSound('sliderSwish', { size: 'md', throttleKey: 't-md', nowMs: 100 });
      playNanoUiSound('sliderSwish', { size: 'lg', throttleKey: 't-lg', nowMs: 100 });
      assert.equal(captured.length, 3);
      assert.equal(captured[0].meta.preset, 'sliderSwishSm');
      assert.equal(captured[1].meta.preset, 'sliderSwish');
      assert.equal(captured[2].meta.preset, 'sliderSwishLg');
      assert.ok(captured[2].meta.playbackRate < captured[1].meta.playbackRate);
      assert.ok(captured[1].meta.playbackRate < captured[0].meta.playbackRate);
      assert.ok(captured[2].meta.volume > captured[0].meta.volume);
    } finally {
      resetNanoUiSoundConfig();
    }

    // Repository governance: every SFC in src/components/ with both `size:` prop and `playNanoUiSound` must wire `size: props.size`
    const compDir = resolve(__dirname, '../../src/components');
    for (const file of readdirSync(compDir).filter((f) => f.endsWith('.vue'))) {
      const src = readFileSync(resolve(compDir, file), 'utf8');
      if (src.includes('playNanoUiSound(') && /\bsize:\s*\{/.test(src)) {
        assert.ok(
          src.includes('size: props.size'),
          `${file} defines both size prop and playNanoUiSound() — must wire size: props.size per ACOUSTIC-MASS-01`
        );
      }
    }
  });
});
