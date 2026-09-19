<script setup>
defineProps({
  size: {
    type: Number,
    default: 260
  }
});
</script>

<template>
  <div class="nano-logo-card" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 260 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="logo-svg"
    >
      <defs>
        <!-- Dynamic Glow adapted for dark/light -->
        <radialGradient id="logoBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
          <stop offset="60%" stop-color="#00f2fe" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>

        <!-- Stems Gradient -->
        <linearGradient id="stemGrad" x1="60" y1="50" x2="200" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#818cf8" />
          <stop offset="50%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#4338ca" />
        </linearGradient>

        <!-- Kinetic Diagonal Beam Gradient -->
        <linearGradient id="beamGrad" x1="70" y1="60" x2="190" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#00f2fe" />
          <stop offset="45%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>

      <!-- Ambient Glow Core -->
      <circle cx="130" cy="130" r="115" fill="url(#logoBgGlow)" />

      <!-- High-Precision Reticle Rings -->
      <circle cx="130" cy="130" r="108" stroke="var(--nano-border-subtle, rgba(255, 255, 255, 0.12))" stroke-width="1.2" stroke-dasharray="6 8" />
      <circle cx="130" cy="130" r="82" stroke="var(--nano-border-subtle, rgba(255, 255, 255, 0.08))" stroke-width="1" />

      <!-- Diagonal Alignment Axis -->
      <line x1="42" y1="42" x2="218" y2="218" stroke="var(--nano-border-subtle, rgba(255, 255, 255, 0.06))" stroke-width="1" stroke-dasharray="4 6" />

      <!-- BOLD KINETIC 'N' MONOGRAM (Stroke width: 34px - 2.5x bolder!) -->
      <!-- Left Vertical Stem -->
      <path
        d="M72 192 V68"
        stroke="url(#stemGrad)"
        stroke-width="34"
        stroke-linecap="round"
      />

      <!-- Diagonal Crossing Beam -->
      <path
        d="M72 68 L188 192"
        stroke="url(#beamGrad)"
        stroke-width="34"
        stroke-linecap="round"
      />

      <!-- Right Vertical Stem -->
      <path
        d="M188 192 V68"
        stroke="url(#stemGrad)"
        stroke-width="34"
        stroke-linecap="round"
      />

      <!-- Prominent Quantum Pulsar (Upper Right) -->
      <circle cx="188" cy="68" r="26" fill="rgba(0, 242, 254, 0.22)" />
      <circle cx="188" cy="68" r="15" fill="#00f2fe" />
      <circle cx="188" cy="68" r="6" fill="#ffffff" />

      <!-- Secondary Anchor Core (Bottom Left) -->
      <circle cx="72" cy="192" r="7" fill="#6366f1" />

      <!-- Subtitle spec text -->
      <text
        x="130"
        y="238"
        text-anchor="middle"
        class="logo-spec-text"
        font-family="monospace"
        font-size="10"
        font-weight="700"
        letter-spacing="2"
      >
        NANO UI // QUANTUM 8PX
      </text>
    </svg>
  </div>
</template>

<style scoped>
.nano-logo-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nano-radius-lg, 16px);
  background: var(--nano-bg-card-elevated, #0f172a);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  box-shadow: var(--nano-shadow-elevated, 0 8px 32px rgba(0, 0, 0, 0.45));
  overflow: hidden;
}

.logo-svg {
  display: block;
  user-select: none;
  -webkit-user-select: none;
}

.logo-spec-text {
  fill: var(--nano-text-muted, #94a3b8);
}
</style>
