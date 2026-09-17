<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  size: {
    type: Number,
    default: 260
  }
});

const canvasRef = ref(null);
let animFrameId = null;

const renderCat = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = props.size;
  const height = props.size;

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  ctx.save();
  ctx.scale(dpr, dpr);

  const time = Date.now() * 0.001;

  // 1. Background gradient (Deep Indigo to Slate)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#1e1b4b'); // Deep indigo 950
  bgGrad.addColorStop(1, '#0f172a'); // Slate 900
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Center coordinates
  const centerX = width / 2;
  const centerY = height / 2 + 20;

  // 2. Soft shadow under the cat
  ctx.save();
  ctx.beginPath();
  const shadowGrad = ctx.createRadialGradient(centerX, centerY + 80, 5, centerX, centerY + 80, 100);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.ellipse(centerX, centerY + 80, 80, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Waving Tail (behind body)
  ctx.save();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 35, centerY + 60);
  const tailSwing = Math.sin(time * 3) * 20;
  ctx.quadraticCurveTo(
    centerX - 80 + tailSwing, centerY + 30,
    centerX - 70 + tailSwing * 1.5, centerY - 25
  );
  ctx.stroke();
  ctx.restore();

  // 4. Body with linear gradient
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(centerX - 50, centerY, centerX + 50, centerY + 80);
  bodyGrad.addColorStop(0, '#94a3b8'); // Slate 400
  bodyGrad.addColorStop(1, '#475569'); // Slate 600
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 45, 52, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5. Head with radial gradient
  ctx.save();
  const headGrad = ctx.createRadialGradient(centerX - 10, centerY - 25, 10, centerX, centerY - 20, 50);
  headGrad.addColorStop(0, '#f1f5f9'); // Slate 100
  headGrad.addColorStop(1, '#64748b'); // Slate 500
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 20, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6. Ears
  // Left Ear
  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(centerX - 35, centerY - 43);
  ctx.lineTo(centerX - 46, centerY - 75);
  ctx.lineTo(centerX - 12, centerY - 54);
  ctx.closePath();
  ctx.fill();
  // Inner left ear (pink)
  ctx.fillStyle = '#fda4af'; // Rose 300
  ctx.beginPath();
  ctx.moveTo(centerX - 32, centerY - 45);
  ctx.lineTo(centerX - 40, centerY - 68);
  ctx.lineTo(centerX - 16, centerY - 52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Right Ear
  ctx.save();
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(centerX + 35, centerY - 43);
  ctx.lineTo(centerX + 46, centerY - 75);
  ctx.lineTo(centerX + 12, centerY - 54);
  ctx.closePath();
  ctx.fill();
  // Inner right ear (pink)
  ctx.fillStyle = '#fda4af';
  ctx.beginPath();
  ctx.moveTo(centerX + 32, centerY - 45);
  ctx.lineTo(centerX + 40, centerY - 68);
  ctx.lineTo(centerX + 16, centerY - 52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 7. Eyes (blinking state machine)
  const isBlinking = Math.floor(time * 0.4) % 2 === 0 && (time % 2.5 < 0.15);

  ctx.save();
  ctx.fillStyle = '#0f172a';
  if (isBlinking) {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX - 18, centerY - 20, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX + 18, centerY - 20, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(centerX - 18, centerY - 20, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 18, centerY - 20, 7, 0, Math.PI * 2);
    ctx.fill();

    // Glossy highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - 20, centerY - 22, 2.5, 0, Math.PI * 2);
    ctx.arc(centerX + 16, centerY - 22, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 8. Blush Cheeks
  ctx.save();
  ctx.fillStyle = 'rgba(244, 63, 94, 0.35)'; // Rose 500 with alpha
  ctx.beginPath();
  ctx.arc(centerX - 28, centerY - 10, 6, 0, Math.PI * 2);
  ctx.arc(centerX + 28, centerY - 10, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 9. Nose & Mouth
  ctx.save();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  // Pink nose
  ctx.fillStyle = '#fda4af';
  ctx.beginPath();
  ctx.moveTo(centerX - 3, centerY - 15);
  ctx.lineTo(centerX + 3, centerY - 15);
  ctx.lineTo(centerX, centerY - 12);
  ctx.closePath();
  ctx.fill();

  // W-shape mouth
  ctx.beginPath();
  ctx.arc(centerX - 4, centerY - 12, 4, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX + 4, centerY - 12, 4, Math.PI, 0);
  ctx.stroke();
  ctx.restore();

  // 10. Whiskers
  ctx.save();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  // Left
  ctx.beginPath();
  ctx.moveTo(centerX - 35, centerY - 12); ctx.lineTo(centerX - 54, centerY - 15);
  ctx.moveTo(centerX - 35, centerY - 9);  ctx.lineTo(centerX - 57, centerY - 9);
  ctx.moveTo(centerX - 35, centerY - 6);  ctx.lineTo(centerX - 53, centerY - 3);
  // Right
  ctx.moveTo(centerX + 35, centerY - 12); ctx.lineTo(centerX + 54, centerY - 15);
  ctx.moveTo(centerX + 35, centerY - 9);  ctx.lineTo(centerX + 57, centerY - 9);
  ctx.moveTo(centerX + 35, centerY - 6);  ctx.lineTo(centerX + 53, centerY - 3);
  ctx.stroke();
  ctx.restore();

  // 11. Left Paw (Breathing)
  ctx.save();
  ctx.fillStyle = '#64748b';
  const leftPawOffset = Math.sin(time * 3) * 1.5;
  ctx.beginPath();
  ctx.ellipse(centerX - 25, centerY + 68 + leftPawOffset, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 12. Right Paw (Waving)
  ctx.save();
  const shoulderX = centerX + 30;
  const shoulderY = centerY + 35;
  ctx.translate(shoulderX, shoulderY);

  const waveAngle = -0.5 + Math.sin(time * 8) * 0.45;
  ctx.rotate(waveAngle);

  const pawGrad = ctx.createLinearGradient(0, 0, 30, -10);
  pawGrad.addColorStop(0, '#475569');
  pawGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = pawGrad;

  ctx.beginPath();
  ctx.ellipse(18, -4, 18, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 13. Floating Love Heart
  ctx.save();
  const heartX = centerX - 65;
  const heartY = centerY - 55 + Math.sin(time * 2.5) * 6;
  const heartSize = 8;

  ctx.translate(heartX, heartY);
  ctx.fillStyle = 'rgba(244, 63, 94, 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-heartSize / 2, -heartSize / 2, -heartSize, 0, 0, heartSize);
  ctx.bezierCurveTo(heartSize, 0, heartSize / 2, -heartSize / 2, 0, 0);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  animFrameId = requestAnimationFrame(renderCat);
};

onMounted(() => {
  animFrameId = requestAnimationFrame(renderCat);
});

onUnmounted(() => {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
  }
});
</script>

<template>
  <div class="insta-cat-wrapper" :style="{ width: `${size}px`, height: `${size}px` }">
    <canvas
      ref="canvasRef"
      class="insta-cat-canvas"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />
  </div>
</template>

<style scoped>
.insta-cat-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nano-radius-lg, 16px);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
}

.insta-cat-canvas {
  display: block;
  border-radius: var(--nano-radius-lg, 16px);
}
</style>
