<script setup>
import pkg from '../../../package.json';
import { currentLang } from '../../locales.js';
import LogoConceptsLab from '../LogoConceptsLab.vue';

const version = pkg.version;
</script>

<template>
  <div class="doc-page">
    <div class="hero-section">
      <span class="hero-badge">NANO UI {{ version }} • 3D SHOWOFF LAB (Φ)</span>
      <h2>
        {{
          currentLang === 'pl'
            ? 'Bauhaus Φ Tri-Primitive (□ + △ + ○) — Scena 3D, Monte Carlo N & Ambient Audio'
            : 'Bauhaus Φ Tri-Primitive (□ + △ + ○) — 3D Stage, Monte Carlo N & Ambient Audio'
        }}
      </h2>
      <p class="desc">
        {{
          currentLang === 'pl'
            ? 'Dedykowana scena prezentacyjna (/showoff) z rzutem ortogonalnym 3D → 2D litery N, optymalizacją Monte Carlo, 3-urządzeniowym emulatorem (Desktop / Tablet / Mobile) oraz przyjemną dla ucha muzyką ambientową 432Hz.'
            : 'Dedicated presentation stage (/showoff) with 3D → 2D orthographic N-projection, Monte Carlo point-shooting verification, 3-device viewport emulator, and warm 432Hz ambient soundscape.'
        }}
      </p>
    </div>

    <LogoConceptsLab />
  </div>
</template>

<style scoped>
.doc-page {
  padding-top: 0.75rem;
}

.hero-section {
  margin-bottom: 1.5rem;
}

.hero-badge {
  display: inline-block;
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.14);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.32);
  margin-bottom: 0.75rem;
  letter-spacing: 0.5px;
}

.doc-page h2 {
  font-weight: 800;
  font-size: 1.85rem;
  margin: 0 0 0.5rem 0;
  color: var(--nano-text-main);
  letter-spacing: -0.5px;
}

.desc {
  color: var(--nano-text-muted);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 820px;
  margin: 0;
}
</style>
