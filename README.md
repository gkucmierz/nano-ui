<div align="center">

<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://nano-ui.7u.pl/nano-ui-light.svg" />
  <source media="(prefers-color-scheme: dark)" srcset="https://nano-ui.7u.pl/nano-ui-dark.svg" />
  <img src="https://nano-ui.7u.pl/nano-ui.svg" width="136" height="136" alt="Nano UI — Bauhaus Φ (1.618) 3D-to-2D Logo" />
</picture>

# @gkucmierz/nano-ui

**High-performance, minimal-footprint Vue 3 UI library, 3D/2D Bauhaus $\Phi$ visual studio, interactive data visualizations, and 1st-party Front-Controllers.**  
Engineered for glassmorphism aesthetics, continuous Hermite kinematics, Unix `tree(1)` hierarchies, and zero-FOUC offline-first applications.

[![npm version](https://img.shields.io/npm/v/@gkucmierz/nano-ui?style=flat-square&color=6366f1&label=npm)](https://www.npmjs.com/package/@gkucmierz/nano-ui)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![vue version](https://img.shields.io/badge/vue-3.x-42b883?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![showoff studio](https://img.shields.io/badge/3D%20Showoff-Bauhaus%20%CE%A6%201.618-00f2fe?style=flat-square)](https://nano-ui.7u.pl/showoff)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PL-38bdf8?style=flat-square)](src/locales/)
[![zero-fouc](https://img.shields.io/badge/zero--fouc-ready-10b981?style=flat-square)](#zero-fouc-architecture)
[![offline-first](https://img.shields.io/badge/dependencies-0%20external%20CDNs-f59e0b?style=flat-square)](#zero-trust-offline-first)

🌐 **[Live Interactive Playground & Docs (`nano-ui.7u.pl`)](https://nano-ui.7u.pl)** · ✨ **[Interactive 3D $\to$ 2D Bauhaus $\Phi$ Logo Presentation (`nano-ui.7u.pl/showoff`)](https://nano-ui.7u.pl/showoff)**

</div>

---

## 🎨 Milestone: Bauhaus $\Phi$ (`1.618`) 3D $\to$ 2D Logo & Interactive `/showoff` Studio

The `@gkucmierz/nano-ui` brand mark is not a static vector drawing — it is the **exact orthographic 2D projection of a 3D Bauhaus architectural sculpture** governed by the Golden Ratio ($\Phi = \frac{1 + \sqrt{5}}{2} \approx 1.618$):

```
┌────────────────────────────────────────────────────────────────────────┐
│           BAUHAUS Φ (1.618) 3D SCULPTURE → 2D SVG PROJECTION           │
├───────────────────────────────────┬────────────────────────────────────┤
│ 3D Spatial Scene (/showoff)       │ Orthographic 2D Lock (/nano-ui.svg)│
│ • Left Cyan Pillar (Kinetic Track)│ • Seamless 3D → 2D camera morphing │
│ • Right Indigo Pillar + Cutout    │ • Golden Ratio Φ = 1.618 geometry  │
│ • Diagonal Glass Bridge (N-stroke)│ • Monte Carlo N-Shadow raycasting  │
│ • Floating Gold Sphere (r = Φ⁻²)  │ • 432Hz Web Audio (.nsd) synthesis │
└───────────────────────────────────┴────────────────────────────────────┘
```

Explore the live interactive presentation at **[https://nano-ui.7u.pl/showoff](https://nano-ui.7u.pl/showoff)**:
- **3D $\leftrightarrow$ 2D Orthographic Lock:** Morph continuously between free 3D orbital inspection and the canonical flat 2D vector logo (`nano-ui-dark.svg` / `nano-ui-light.svg`).
- **Monte Carlo $N$-Shadow Studio:** Configurable stochastic multi-light raycasting (`1..16` lights) with real-time penumbra softness, light-source helper gizmos, and glass transmission controls.
- **432Hz Ambient Soundscape (`.nsd`):** Powered by `@gkucmierz/nano-sound` — procedural Web Audio synthesis coupled to camera velocity and morph transitions with zero external audio files.

---

## 🚀 Key Highlights

- ⚡ **Continuous Hermite Kinematics (`KineticRotator`):** Velocity-preserving $C^1$ continuity on mid-flight interrupts, geodesic shortest-path modulo $360^\circ$ navigation, and dynamic momentum preservation.
- 🌳 **Authentic Unix `tree(1)` Hierarchy (`NanoTree` + `unixTree.js`):** Interactive collapsible tree view with true box-drawing connectors (`├── `, `└── `, `│   `), instant search with ancestor path preservation, semantic badges, and 1-click ASCII `tree` copy.
- 🎛️ **Multi-Resolution DAW Scrubber (`PrecisionScrubber`):** Vertical-distance 2D precision scaling ($1\times \to 0.1\times \to 0.01\times \to 0.001\times$) with floating HUD overlay.
- 🔄 **Hybrid Priority+ Adaptive Header (`MutatingHeader`):** Smooth floating-to-docked glassmorphism transition with deterministic `resolveOptimalHeaderTier` Priority+ responsive condensation.
- 📊 **3D SVG Data Visualizations & CSHR (`ThreeDDonutChart`, `useCoupledSelection`):** Interactive 3D perspective donut & pie charts with auto-balancing callouts and Coupled Selection & Hover-Suppress-Rearm (`CSHR`) state synchronization.
- 🎠 **3D CoverFlow & Universal Media Preview (`NanoCoverFlow`, `NanoCodeEditor`, `NanoDropzone`):** Hardware-accelerated CoverFlow carousel and multi-format 7u RFC previewer (`.nsd` audio waveforms, `.3d` PBR scenes, `.svg`, `.json`, `.csv`, and syntax-highlighted code).
- 🧱 **1st-Party Ecosystem Front-Controllers:** Powered by zero-dependency MIT micro-packages (`@gkucmierz/storage-controller`, `@gkucmierz/key-controller`, `@gkucmierz/nano-sound`, `@gkucmierz/dport`, `@gkucmierz/utils`) sharing `Symbol.for(...)` singletons.
- 🛡️ **Zero-Trust Offline-First & Zero-FOUC:** Zero external runtime CDNs (`esm.sh`, `unpkg`, `cdnjs`, `fonts.googleapis.com`) and zero Flash of Unstyled Content.

---

## 📦 Installation

```bash
npm install @gkucmierz/nano-ui
```

---

## 🛠️ Quick Start

### Global Registration

Register Nano UI and its core design tokens globally in your Vue 3 application:

```javascript
import { createApp } from 'vue';
import App from './App.vue';
import NanoUI from '@gkucmierz/nano-ui';
import '@gkucmierz/nano-ui/style.css'; // Core design tokens, animations, and typography

const app = createApp(App);

app.use(NanoUI);
app.mount('#app');
```

### Individual Component & Utility Import

Import individual components, directives, and deterministic layout/tree helpers on demand:

```javascript
import {
  // Interactive Components
  KineticRotator,
  MutatingHeader,
  PrecisionScrubber,
  ThreeDDonutChart,
  NanoTree,
  NanoCoverFlow,
  NanoCodeEditor,
  NanoCodeBlock,
  NanoDropzone,
  NanoCollapsible,
  NanoSplitter,
  NanoModal,
  NanoSwitch,
  NanoSelect,
  NanoNumberStepper,
  NanoDatePicker,
  NanoCheckbox,
  NanoRadio,
  NanoSlider,
  NanoColorPicker,
  NanoIcon,
  // Directives
  Ripple,
  tooltipDirective,
  vFillHeight,
  // Composables & Deterministic Engines
  useCoupledSelection,
  useFillHeight,
  scrollElementToBoundedCenter,
  resolveOptimalHeaderTier,
  flattenUnixTree,
  formatUnixAsciiTree,
} from '@gkucmierz/nano-ui';
import '@gkucmierz/nano-ui/style.css';
```

---

## 🧩 Component Catalog & API

### 🌳 `NanoTree` (Unix `tree(1)` Component & ASCII Generator)

An interactive hierarchical tree component modeled after the classic Unix `tree(1)` utility. Renders authentic box-drawing branch connectors (`├── `, `└── `, `│   `), supports collapsible subtrees (`[−]` / `[+]`), real-time search filtering that preserves ancestor chains, keyboard arrow navigation, and 1-click plain-text ASCII export.

```vue
<template>
  <NanoTree
    :nodes="treeNodes"
    title="@gkucmierz/nano-ui"
    root-meta="1st-party dependency tree"
    v-model:selected-id="activeNodeId"
    :default-expand-depth="2"
    @select="onSelectNode"
  />
</template>

<script setup>
import { ref } from 'vue';
import { NanoTree } from '@gkucmierz/nano-ui';

const activeNodeId = ref('nano-ui');
const treeNodes = [
  {
    id: 'nano-ui',
    label: '@gkucmierz/nano-ui',
    version: '1.14.0',
    icon: '🎨',
    badge: 'PUBLIC · MIT',
    badgeVariant: 'emerald',
    meta: '🚀 28 apps',
    children: [
      { id: 'storage-controller', label: '@gkucmierz/storage-controller', version: '1.0.0', icon: '💾', meta: '0 deps' },
      { id: 'key-controller', label: '@gkucmierz/key-controller', version: '1.0.1', icon: '⌨️', meta: '0 deps' },
      { id: 'nano-sound', label: '@gkucmierz/nano-sound', version: '1.0.1', icon: '🔊', meta: '0 deps (.nsd)' }
    ]
  }
];

const onSelectNode = (node) => {
  console.log('Selected tree node:', node.id);
};
</script>
```

You can also generate pure ASCII `tree(1)` strings programmatically in Node.js or browser scripts via `formatUnixAsciiTree(nodes, { rootLabel: '.' })`.

---

### 🌀 `KineticRotator`

A high-performance angular rotator component powered by Cubic Hermite spline kinematics. Unlike standard CSS transitions which snap or restart upon target changes, `KineticRotator` samples the instantaneous angular velocity ($v_0$) at the moment of interruption, guaranteeing $C^1$ velocity continuity and zero jarring visual jerks.

#### Features
- **Continuous Velocity Preservation ($C^1$ Continuity):** Seamless retargeting mid-flight with boundary conditions $P(0) = 0$, $P'(0) = v_0$, $P(1) = 1$, $P'(1) = 0$.
- **Geodesic Shortest-Path Navigation:** Modulo $360^\circ$ difference wrapping minimizes rotational distance while preserving rotational momentum.
- **Dynamic Timing Modes:**
  - `proportional` *(Isokinetic, $v \approx \text{const}$)*: Duration scales proportionally with angular displacement ($|\Delta\theta|$).
  - `fixed` *(Isochronous, $T = \text{const}$)*: Duration is constant regardless of angle distance.

#### Code Example
```vue
<template>
  <KineticRotator
    ref="rotatorRef"
    v-model="angle"
    :duration="1000"
    :speed-multiplier="1"
    timing-mode="proportional"
    :shortest-path="true"
    :inertia-threshold="0.25"
    :size="260"
  />
</template>
```

---

### 🎚️ `PrecisionScrubber`

A 2D jog-dial precision scrubbing widget inspired by digital audio workstations (DAWs) and professional video editing suites. Dragging horizontally adjusts the parameter value, while dragging vertically increases resolution precision exponentially (up to $0.001\times$) with a floating HUD anchor guide.

```vue
<template>
  <PrecisionScrubber
    v-model="frequency"
    :min="20"
    :max="20000"
    :step="1"
    label="Cutoff Frequency"
    unit="Hz"
    :sensitivity="1"
    :relative="true"
  />
</template>
```

---

### 🔄 `MutatingHeader` & Hybrid Priority+ Adaptive Header

A reactive, scroll-docking navigation container that morphs between an elevated floating glassmorphism card and an edge-to-edge docked navbar, paired with `resolveOptimalHeaderTier` and `pickAdaptiveHeaderLabel` for zero-overflow Priority+ responsive layouts.

```vue
<template>
  <MutatingHeader
    :threshold="24"
    :hysteresis="8"
    height="60px"
    floating-margin="12px 24px 0 24px"
    floating-radius="16px"
    :glassmorphism="true"
  >
    <div class="nav-content">
      <span class="brand">Project Nexus</span>
    </div>
  </MutatingHeader>
</template>
```

---

### 📊 `ThreeDDonutChart` & `useCoupledSelection` (CSHR)

A 3D SVG Donut and Pie Chart component with smooth 2D/3D perspective transitions, auto-balancing side callouts, and first-class support for the **Coupled Selection & Hover-Suppress-Rearm (`CSHR`)** state machine (`useCoupledSelection`) when synchronizing charts with external legends and tables.

```vue
<template>
  <ThreeDDonutChart 
    v-model:selectedItemId="selectedId"
    :hovered-item-id="hoveredId"
    :data="chartData"
    :isExpanded="true"
    :showLabels="true"
    :is3D="true"
    :slopeRatio="0.55"
    :autoRotate="true"
    :selectable="true"
    centerLabel="Total Portfolio"
  />
</template>
```

---

### 🪟 `NanoModal`, `NanoCollapsible`, `NanoCoverFlow` & Form Controls

- **`NanoModal`:** Standardized modal dialog adhering to the **Universal Dismissal Triad** (`ESC` key stack with `stopImmediatePropagation()`, backdrop click, header close `✕`), automatic background scroll lock (`lockModalBackgroundScroll`), and URL hash synchronization (`/#help`).
- **`NanoCollapsible`:** Smooth accordion container with persistent expand/collapse memory via `@gkucmierz/storage-controller`.
- **`NanoCoverFlow`:** Interactive 3D perspective carousel with keyboard, wheel, and pointer kinematics.
- **`NanoCodeEditor` & `NanoCodeBlock`:** Universal Media & 7u RFC Previewer supporting live `.nsd` sound synthesis, `.3d` scene inspection, `.svg` vector zoom, `.csv` tables, and syntax-highlighted code.
- **Poka-Yoke Controls:** `NanoSwitch`, `NanoNumberStepper`, `NanoDatePicker`, `NanoSelect`, `NanoCheckbox`, `NanoRadio`, `NanoSlider`, `NanoColorPicker`, `NanoDropzone`, `NanoSplitter`.

---

## 🧱 1st-Party Ecosystem & Front-Controllers

Every micro-package used by `@gkucmierz/nano-ui` is **100% 1st-party, authored in-house under MIT, with zero 3rd-party transitive dependencies**:

| Package | Acronym | Transitive Deps | Role in Nano UI Ecosystem |
| :--- | :---: | :---: | :--- |
| **`@gkucmierz/storage-controller`** | `SC` | `0` | Global `Symbol.for(...)` singleton Front-Controller for `localStorage` (`ls`), `sessionStorage` (`ss`), and `none` with `DA_NU_<key>` acronym key compression. |
| **`@gkucmierz/key-controller`** | `KC` | `0` | Focus-aware keyboard shortcut Front-Controller with automatic `ignoreUsedKeyModifiers` collision resolution (`Shift+Arrow` vs `Arrow`, held `C+Arrow` chords). |
| **`@gkucmierz/nano-sound`** | `NS` | `0` | Procedural Web Audio API synthesizer and algebraic `.nsd` DSL compiler powering tactile UI sound effects and the 432Hz `/showoff` studio. |
| **`@gkucmierz/dport`** | `DP` | `0` | Deterministic SHA-256 port & OKLCH accent preset generator (`pickNanoPresetByPort`). |
| **`@gkucmierz/utils`** | `UT` | `0` | Prototype-safe runtime type guards (`is`, `same`, `of`) replacing raw `typeof` checks. |

---

## 🌐 Built-in i18n Architecture

Nano UI includes a zero-dependency reactive internationalization engine (`src/locales.js`) featuring **strictly 1:1 line-correlated JSON translation dictionaries** (`src/locales/en.json` and `src/locales/pl.json`):

```javascript
import { t, currentLang, setLang, toggleLang } from '@gkucmierz/nano-ui/locales';

setLang('pl'); // 'en' | 'pl'
toggleLang();
```

---

<a id="zero-fouc-architecture"></a>
## ⚡ Zero-FOUC Architecture

Nano UI provides synchronized design tokens with automatic system and dark/light theme adaptation. Zero Flash of Unstyled Content (FOUC) is guaranteed through immediate inline CSS variable evaluation before Vue hydration.

---

<a id="zero-trust-offline-first"></a>
## 🛡️ Zero-Trust Offline-First

- **No External CDNs:** Zero runtime script or font imports from `unpkg.com`, `esm.sh`, `jsdelivr`, `cdnjs`, or `fonts.googleapis.com`.
- **Bundled Assets:** All SVG graphics (`nano-ui.svg`, `nano-ui-dark.svg`, `nano-ui-light.svg`, `og-image.png`) and fonts resolve locally for 100% offline reliability.

---

## 📜 Scripts & Development

```bash
# Start local Vite development server & interactive playground
npm run dev

# Run ESLint & full unit/architecture test suite
npm run lint
npm test

# Build the production library distribution (dist/nano-ui.js & dist/nano-ui.css)
npm run build

# Build the standalone documentation & /showoff studio application
npm run build:app
```

---

## 📄 License

[MIT](LICENSE) © [Grzegorz Kućmierz](https://gkucmierz.com)
