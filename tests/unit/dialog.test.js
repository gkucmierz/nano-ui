import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dialogState,
  showAlert,
  showConfirm,
  handleOk,
  handleCancel,
} from '../../src/composables/useDialog.js';
import {
  computeFittedFontSize,
  estimateProportionalEmWidth,
} from '../../src/utils/fitText.js';
import {
  parseLightboxAspectRatio,
  computeLightboxStageGeometry,
} from '../../src/utils/lightboxGeometry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('useDialog, NanoDialog, NanoModal Glass & NanoLightbox Aspect-Ratio Stage (v1.8.27)', () => {
  beforeEach(() => {
    dialogState.value = {
      isOpen: false,
      type: 'info',
      title: 'Notice',
      message: '',
      okText: 'OK',
      cancelText: 'Cancel',
      okVariant: 'primary',
      showCancel: false,
      glassmorphism: true,
      glassHeader: true,
      glassFooter: false,
      closeOnBackdrop: true,
      width: 440,
      resolve: null,
    };
  });

  it('supports legacy positional arguments and semantic options in showAlert & showConfirm', async () => {
    const alertPromise = showAlert('Operation completed cleanly.', 'System Notice', 'Got it');
    assert.equal(dialogState.value.isOpen, true);
    assert.equal(dialogState.value.type, 'info');
    assert.equal(dialogState.value.title, 'System Notice');
    assert.equal(dialogState.value.okText, 'Got it');
    assert.equal(dialogState.value.showCancel, false);

    handleOk();
    assert.equal(await alertPromise, true);
    assert.equal(dialogState.value.isOpen, false);
    assert.equal(dialogState.value.resolve, null);

    const dangerPromise = showConfirm('Delete snapshot permanently?', {
      dangerous: true,
      glassFooter: true,
    });
    assert.equal(dialogState.value.isOpen, true);
    assert.equal(dialogState.value.type, 'danger');
    assert.equal(dialogState.value.title, 'Warning');
    assert.equal(dialogState.value.okText, 'Delete');
    assert.equal(dialogState.value.okVariant, 'danger');
    assert.equal(dialogState.value.glassFooter, true);
    assert.equal(dialogState.value.showCancel, true);

    handleCancel();
    assert.equal(await dangerPromise, false);
    assert.equal(dialogState.value.isOpen, false);
    assert.equal(dialogState.value.resolve, null);
  });

  it('prevents Light Mode invisible white-on-white text in NanoDialog and enforces safe-action focus in NanoModal', () => {
    const dialogSrc = fs.readFileSync(path.join(rootDir, 'src/components/NanoDialog.vue'), 'utf8');
    const modalSrc = fs.readFileSync(path.join(rootDir, 'src/components/NanoModal.vue'), 'utf8');

    assert.ok(
      dialogSrc.includes('var(--nano-modal-text, var(--nano-text-main'),
      'NanoDialog message must bind --nano-modal-text / --nano-text-main for Light & Dark theme contrast'
    );
    assert.ok(
      !dialogSrc.includes('var(--text-main, #f8fafc)'),
      'NanoDialog must never fall back to legacy unprefixed --text-main (#f8fafc invisible in Light Mode)'
    );
    assert.ok(!/\btypeof\b/.test(dialogSrc), 'NanoDialog must not use raw typeof');

    assert.ok(modalSrc.includes('glassHeader'), 'NanoModal must support glassHeader prop');
    assert.ok(modalSrc.includes('glassFooter'), 'NanoModal must support glassFooter prop');
    assert.ok(
      modalSrc.includes("props.okVariant === 'danger' && props.showCancel && cancelBtnRef.value"),
      'NanoModal must place initial focus on Cancel button in destructive confirmations'
    );
  });

  it('fits "NanoLightbox Slide 1" inside r=160 circle safe chord via naturalSearch (computeFittedFontSize)', () => {
    const label = 'NanoLightbox Slide 1';
    const safeChord = Math.floor(2 * Math.sqrt(160 ** 2 - 12 ** 2) - 56); // 263px
    const fittedPx = computeFittedFontSize(label, {
      maxWidth: safeChord,
      minFontSize: 12,
      maxFontSize: 38,
      step: 0.5,
      fontWeight: 700,
    });
    const estimatedPxWidth = estimateProportionalEmWidth(label, { fontWeight: 700 }) * fittedPx;
    assert.ok(fittedPx >= 18 && fittedPx <= 26, `Expected ~21.5px fitted font size, got ${fittedPx}`);
    assert.ok(
      estimatedPxWidth <= safeChord,
      `Estimated width ${estimatedPxWidth}px must fit inside safe circle chord ${safeChord}px`
    );
  });

  it('expands NanoLightbox (+) across available screen while respecting margins and content aspect ratio', () => {
    assert.equal(parseLightboxAspectRatio('16/10'), 1.6);
    assert.equal(parseLightboxAspectRatio('4:5'), 0.8);
    assert.equal(parseLightboxAspectRatio(null, 1920, 1080), 1920 / 1080);

    // 1. Wide monitor (2560x1440) + 16:10 landscape raster/SVG (960x600)
    const compact16x10 = computeLightboxStageGeometry({
      viewportWidth: 2560,
      viewportHeight: 1440,
      zoomed: false,
      naturalWidth: 960,
      naturalHeight: 600,
      hasFooter: true,
    });
    const expanded16x10 = computeLightboxStageGeometry({
      viewportWidth: 2560,
      viewportHeight: 1440,
      zoomed: true,
      naturalWidth: 960,
      naturalHeight: 600,
      hasFooter: true,
    });

    assert.ok(
      expanded16x10.mediaWidth > compact16x10.mediaWidth * 1.75,
      `Expanded width (${expanded16x10.mediaWidth}) should be substantially larger than compact (${compact16x10.mediaWidth})`
    );
    assert.ok(expanded16x10.marginX >= 24 && expanded16x10.marginY >= 20, 'Must preserve sensible viewport margins');
    assert.ok(
      Math.abs(expanded16x10.mediaWidth / expanded16x10.mediaHeight - 1.6) < 0.01,
      'Expanded 16:10 media must preserve exact 1.6 aspect ratio'
    );
    assert.ok(expanded16x10.frameMaxWidth <= 2560 - expanded16x10.marginX * 2);

    // 2. Portrait 4:5 raster image (640x800) on 2560x1440 monitor -> height-constrained, 4:5 preserved!
    const expandedPortrait = computeLightboxStageGeometry({
      viewportWidth: 2560,
      viewportHeight: 1440,
      zoomed: true,
      aspectRatio: '4/5',
      naturalWidth: 640,
      naturalHeight: 800,
      hasFooter: true,
    });
    assert.equal(expandedPortrait.mediaHeight, expandedPortrait.availHeight);
    assert.ok(
      Math.abs(expandedPortrait.mediaWidth / expandedPortrait.mediaHeight - 0.8) < 0.01,
      `Portrait 4:5 ratio must be preserved, got ${expandedPortrait.mediaWidth}x${expandedPortrait.mediaHeight}`
    );

    // 3. Panoramic 3:1 raster image (3000x1000) on 2560x1440 monitor -> width-constrained, 3:1 preserved!
    const expandedPano = computeLightboxStageGeometry({
      viewportWidth: 2560,
      viewportHeight: 1440,
      zoomed: true,
      naturalWidth: 3000,
      naturalHeight: 1000,
      hasFooter: true,
    });
    assert.equal(expandedPano.mediaWidth, expandedPano.availWidth);
    assert.ok(
      Math.abs(expandedPano.mediaWidth / expandedPano.mediaHeight - 3.0) < 0.02,
      `Panoramic 3:1 ratio must be preserved, got ${expandedPano.mediaWidth}x${expandedPano.mediaHeight}`
    );
  });
});
