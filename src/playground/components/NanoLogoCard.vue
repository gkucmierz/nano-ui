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
        <radialGradient id="logoBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.25" />
          <stop offset="65%" stop-color="#00f2fe" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>

        <linearGradient id="stemGrad" x1="60" y1="60" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#818cf8" />
          <stop offset="50%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#4f46e5" />
        </linearGradient>

        <linearGradient id="beamGrad" x1="80" y1="80" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#00f2fe" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>

      <!-- Background Glow -->
      <circle cx="130" cy="130" r="110" fill="url(#logoBgGlow)" />

      <!-- Coordinate Grid & Subtle Reticle -->
      <circle cx="130" cy="130" r="108" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" stroke-dasharray="6 8" />
      <circle cx="130" cy="130" r="80" stroke="rgba(99, 102, 241, 0.15)" stroke-width="1" />

      <!-- Diagonal Cross-Hair Guide Lines -->
      <line x1="45" y1="45" x2="215" y2="215" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-dasharray="3 6" />
      <line x1="215" y1="45" x2="45" y2="215" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-dasharray="3 6" />

      <!-- Minimalist Precision 'N' -->
      <!-- Left Stem -->
      <path
        d="M80 180 V80"
        stroke="url(#stemGrad)"
        stroke-width="14"
        stroke-linecap="round"
      />

      <!-- Kinetic Diagonal Light Beam -->
      <path
        d="M80 80 L180 180"
        stroke="url(#beamGrad)"
        stroke-width="14"
        stroke-linecap="round"
      />

      <!-- Right Stem -->
      <path
        d="M180 180 V80"
        stroke="url(#stemGrad)"
        stroke-width="14"
        stroke-linecap="round"
      />

      <!-- Quantum Pulsar in Upper Right -->
      <circle cx="180" cy="80" r="16" fill="rgba(0, 242, 254, 0.2)" />
      <circle cx="180" cy="80" r="9" fill="#00f2fe" />
      <circle cx="180" cy="80" r="4" fill="#ffffff" />

      <!-- Quantum Core Pulse in Bottom Left -->
      <circle cx="80" cy="180" r="6" fill="#6366f1" />

      <text x="130" y="235" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="rgba(255,255,255,0.45)" letter-spacing="2">
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
  background: var(--nano-bg-card, #0f172a);
  border: 1px solid var(--nano-border-card, rgba(255, 255, 255, 0.15));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.logo-svg {
  display: block;
  user-select: none;
  -webkit-user-select: none;
}
</style>
