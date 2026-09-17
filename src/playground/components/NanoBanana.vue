<script setup>
defineProps({
  size: {
    type: Number,
    default: 260
  }
});
</script>

<template>
  <div class="nano-banana-card" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 260 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="banana-svg"
    >
      <defs>
        <!-- Background Radial Glow -->
        <radialGradient id="bananaBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18" />
          <stop offset="60%" stop-color="#6366f1" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>

        <!-- Peel Gradient -->
        <linearGradient id="bananaPeelGrad" x1="40" y1="40" x2="220" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="45%" stop-color="#facc15" />
          <stop offset="85%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>

        <!-- Inner Crescent Shadow -->
        <linearGradient id="bananaShadeGrad" x1="80" y1="60" x2="190" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#eab308" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#854d0e" stop-opacity="0.75" />
        </linearGradient>

        <!-- Quantum Neon Trace -->
        <linearGradient id="quantumTraceGrad" x1="50" y1="50" x2="210" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#00f2fe" />
          <stop offset="50%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#38bdf8" />
        </linearGradient>
      </defs>

      <!-- Soft Ambient Background Glow -->
      <circle cx="130" cy="130" r="110" fill="url(#bananaBgGlow)" />

      <!-- Quantum Grid Coordinates & Reticle Rings -->
      <circle cx="130" cy="130" r="105" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1" stroke-dasharray="4 8" />
      <circle cx="130" cy="130" r="82" stroke="rgba(99, 102, 241, 0.12)" stroke-width="1" />
      <circle cx="130" cy="130" r="60" stroke="rgba(0, 242, 254, 0.08)" stroke-width="1" stroke-dasharray="2 6" />

      <!-- Stem Base (Left Top) -->
      <path
        d="M62 76 C55 64 68 52 78 58 L85 70 Z"
        fill="#4d7c0f"
        stroke="#65a30d"
        stroke-width="1.5"
        stroke-linejoin="round"
      />

      <!-- Main Banana Body Curve -->
      <path
        d="M75 66 C125 75 195 110 205 185 C208 202 196 210 184 204 C150 178 100 135 75 66 Z"
        fill="url(#bananaPeelGrad)"
        stroke="#eab308"
        stroke-width="2"
      />

      <!-- Inner Shadow Curve -->
      <path
        d="M86 78 C128 88 180 125 188 188 C160 162 118 126 86 78 Z"
        fill="url(#bananaShadeGrad)"
      />

      <!-- Cybernetic Longitudinal Facet Spine -->
      <path
        d="M77 68 C120 82 178 122 198 192"
        stroke="#fef9c3"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.85"
      />

      <!-- Kinetic Quantum Circuit Traces -->
      <path
        d="M95 90 C125 106 158 132 176 172"
        stroke="url(#quantumTraceGrad)"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-dasharray="6 10"
      />

      <!-- Stem Tip (Bottom Right) -->
      <path
        d="M198 192 C204 198 208 204 202 208 C196 212 190 206 186 200 Z"
        fill="#3f3f46"
        stroke="#71717a"
        stroke-width="1"
      />

      <!-- Quantum Pulse Dots -->
      <circle cx="100" cy="94" r="3" fill="#00f2fe" />
      <circle cx="138" cy="119" r="3.5" fill="#38bdf8" />
      <circle cx="172" cy="165" r="4" fill="#00f2fe" />
      <circle cx="172" cy="165" r="7" stroke="#00f2fe" stroke-width="1" opacity="0.6" />

      <!-- Nano Spec Text & HUD Reticle -->
      <text x="130" y="235" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="rgba(255,255,255,0.45)" letter-spacing="2">
        NANO BANANA // K-ROTATOR
      </text>
    </svg>
  </div>
</template>

<style scoped>
.nano-banana-card {
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

.banana-svg {
  display: block;
  user-select: none;
  -webkit-user-select: none;
}
</style>
