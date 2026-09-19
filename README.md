<div align="center">

<img src="https://nano-ui.7u.pl/nano-ui.svg" width="120" height="120" alt="Nano UI Logo" />

# @gkucmierz/nano-ui

**High-performance, minimal-footprint Vue 3 UI library, interactive 3D charts, and directives.**  
Engineered for glassmorphism aesthetics, continuous Hermite kinematics, and zero-FOUC offline-first applications.

[![npm version](https://img.shields.io/npm/v/@gkucmierz/nano-ui?style=flat-square&color=6366f1&label=npm)](https://www.npmjs.com/package/@gkucmierz/nano-ui)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![vue version](https://img.shields.io/badge/vue-3.x-42b883?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PL-00f2fe?style=flat-square)](src/locales/)
[![zero-fouc](https://img.shields.io/badge/zero--fouc-ready-10b981?style=flat-square)](#zero-fouc-architecture)
[![offline-first](https://img.shields.io/badge/dependencies-0%20external%20CDNs-f59e0b?style=flat-square)](#zero-trust-offline-first)

🌐 **[Live Interactive Playground & Documentation](https://nano-ui.7u.pl)**

</div>

---

## 🚀 Key Highlights

- ⚡ **Continuous Hermite Kinematics (`KineticRotator`):** Velocity-preserving $C^1$ continuity on interrupts, geodesic shortest-path interpolation, and dynamic momentum preservation.
- 🎛️ **Multi-Resolution DAW Scrubber (`PrecisionScrubber`):** Vertical-distance 2D precision scaling (1x &rarr; 0.1x &rarr; 0.01x &rarr; 0.001x) with floating HUD overlay.
- 🔄 **Morphing Sticky Navigation (`MutatingHeader`):** Transitions smoothly between a floating glassmorphism card and an edge-to-edge docked navbar with configurable hysteresis.
- 📊 **3D SVG Data Visualizations (`ThreeDDonutChart`):** Interactive 3D perspective donut & pie charts with auto-balancing side callouts, depth slope ratio, and slice locking.
- 🎚️ **Accessible Glass Controls (`NanoSwitch`, `NanoModal`):** Lightweight toggle switches and hash-routed modals with universal dismissal triad (ESC, backdrop click, header close).
- 💧 **Optimized Micro-Directives (`v-ripple`, `v-tooltip`):** Material ripples and GPU-accelerated tooltips with minimal runtime overhead.
- 🌍 **Zero-Dependency i18n:** Built-in reactive English/Polish localization engine featuring line-correlated translation dictionaries.
- 🛡️ **Zero-Trust Offline-First:** Zero external runtime CDNs (`esm.sh`, `unpkg`, `cdnjs`) &mdash; 100% bundled locally for offline PWA reliability.

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

### Individual Component Import

You can also import individual components and directives on demand:

```javascript
import { 
  KineticRotator, 
  MutatingHeader, 
  PrecisionScrubber, 
  NanoSwitch, 
  ThreeDDonutChart,
  NanoModal,
  Ripple,
  tooltipDirective 
} from '@gkucmierz/nano-ui';
import '@gkucmierz/nano-ui/style.css';
```

---

## 🧩 Component Catalog & API

### 🌀 `KineticRotator`

A high-performance angular rotator component powered by Cubic Hermite spline kinematics. Unlike standard CSS transitions which snap or restart upon target changes, `KineticRotator` samples the instantaneous angular velocity ($v_0$) at the moment of interruption, guaranteeing $C^1$ velocity continuity and zero jarring visual jerks.

#### Features
- **Continuous Velocity Preservation ($C^1$ Continuity):** Seamless retargeting mid-flight with boundary conditions $P(0) = 0$, $P'(0) = v_0$, $P(1) = 1$, $P'(1) = 0$.
- **Geodesic Shortest-Path Navigation:** Modulo $360^\circ$ difference wrapping minimizes rotational distance while preserving rotational momentum.
- **Dynamic Timing Modes:**
  - `proportional` *(Isokinetic, $v \approx \text{const}$)*: Duration scales proportionally with angular displacement ($|\Delta\theta|$).
  - `fixed` *(Isochronous, $T = \text{const}$)*: Duration is constant regardless of angle distance.
- **In-Flight Duration Adaptation:** Dynamically updates duration without spatial jumps on the normalized time axis.

#### Code Example
```vue
<template>
  <div class="rotator-container">
    <KineticRotator
      ref="rotatorRef"
      v-model="angle"
      :duration="1000"
      :speed-multiplier="1"
      timing-mode="proportional"
      :shortest-path="true"
      :inertia-threshold="0.25"
      :size="260"
      @frame="onFrame"
      @settled="onSettled"
    >
      <template #default="{ currentAngle, velocity, isMoving }">
        <div class="custom-compass-tile">
          <span class="compass-pointer">⬆</span>
          <span class="telemetry">{{ Math.round(currentAngle) }}° ({{ Math.round(velocity) }}°/s)</span>
        </div>
      </template>
    </KineticRotator>

    <div class="controls">
      <button @click="rotatorRef?.rotateBy(90)">+90°</button>
      <button @click="rotatorRef?.rotateBy(-90)">-90°</button>
      <button @click="rotatorRef?.reset()">Reset</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { KineticRotator } from '@gkucmierz/nano-ui';

const angle = ref(0);
const rotatorRef = ref(null);

const onFrame = (telemetry) => {
  // telemetry: { currentAngle, targetAngle, velocity, acceleration, progress, isMoving, timestamp }
};

const onSettled = ({ angle, normalizedAngle }) => {
  console.log('Rotator settled at:', angle, 'modulo:', normalizedAngle);
};
</script>
```

#### Props
| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `Number` | `0` | Target angle in degrees. Supports `v-model`. |
| `duration` | `Number` | `1000` | Base duration in milliseconds for a $90^\circ$ rotation step. |
| `speedMultiplier` | `Number` | `1` | Speed scaling factor (e.g., `0.5` = half speed, `2.0` = double speed). |
| `step` | `Number` | `90` | Reference step angle in degrees used for proportional duration scaling. |
| `shortestPath` | `Boolean` | `true` | When true, targets are reduced modulo $360^\circ$ along the shortest geodesic arc. |
| `timingMode` | `String` | `'proportional'` | `'proportional'` (isokinetic, $v \approx \text{const}$) or `'fixed'` (isochronous, $T = \text{const}$). |
| `inertiaThreshold` | `Number` | `0.25` | Momentum threshold (in seconds) to avoid abrupt directional reversals during high-speed motion. |
| `size` | `Number \| String` | `260` | Width and height of the rotator bounding box in pixels or CSS units. |

#### Events
| Event | Payload | Description |
|---|---|---|
| `update:modelValue` | `Number` | Emitted when motion settles to update the `v-model` binding. |
| `change` | `Number` | Emitted immediately when a new target destination is committed. |
| `settled` | `{ angle, normalizedAngle }` | Emitted once motion comes to a complete rest. |
| `frame` | `Object` | Emitted every `requestAnimationFrame` with live kinematics telemetry. |

---

### 🎚️ `PrecisionScrubber`

A 2D jog-dial precision scrubbing widget inspired by digital audio workstations (DAWs) and professional video editing suites. Dragging horizontally adjusts the parameter value, while dragging vertically increases resolution precision exponentially (up to $0.001\times$) with a floating HUD anchor guide.

#### Code Example
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

<script setup>
import { ref } from 'vue';
import { PrecisionScrubber } from '@gkucmierz/nano-ui';

const frequency = ref(440);
</script>
```

#### Props
| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `Number` | *Required* | Current numerical value (`v-model`). |
| `min` | `Number` | `0` | Minimum allowed value boundary. |
| `max` | `Number` | `100` | Maximum allowed value boundary. |
| `step` | `Number` | `1` | Increment step size at base $1\times$ resolution. |
| `label` | `String` | `''` | Descriptive label displayed on the scrubber track. |
| `unit` | `String` | `''` | Value unit suffix (e.g., `'ms'`, `'px'`, `'%'`, `'Hz'`). |
| `sensitivity` | `Number` | `1` | Horizontal drag sensitivity multiplier. |
| `relative` | `Boolean` | `true` | Enables vertical distance dynamic precision scaling. |

---

### 🔄 `MutatingHeader`

A reactive, scroll-docking navigation container that dynamically morphs between an elevated floating glassmorphism card and an edge-to-edge docked navbar as the user scrolls.

#### Code Example
```vue
<template>
  <MutatingHeader
    :threshold="24"
    :hysteresis="8"
    height="60px"
    floating-margin="12px 24px 0 24px"
    floating-radius="16px"
    :glassmorphism="true"
    @change="onDockStateChange"
  >
    <div class="nav-content">
      <span class="brand">Project Nexus</span>
      <nav class="links">
        <a href="#overview">Overview</a>
        <a href="#features">Features</a>
      </nav>
    </div>
  </MutatingHeader>
</template>

<script setup>
import { MutatingHeader } from '@gkucmierz/nano-ui';

const onDockStateChange = (isDocked) => {
  console.log('Header docked status:', isDocked);
};
</script>
```

#### Props
| Prop | Type | Default | Description |
|---|---|---|---|
| `threshold` | `Number` | `24` | Scroll distance in pixels after which the header docks edge-to-edge. |
| `hysteresis` | `Number` | `8` | Scroll delta in pixels below threshold required to un-dock back into floating card. |
| `scrollContainer`| `String \| Object` | `null` | Target scroll container selector or DOM element (defaults to `window`). |
| `height` | `String` | `'60px'` | Height of the header bar. |
| `floatingMargin` | `String` | `'12px 24px 0 24px'` | Outer margins when floating at the top of the viewport. |
| `floatingRadius` | `String` | `'16px'` | Corner border radius when in floating card state. |
| `glassmorphism` | `Boolean` | `true` | Enables blurred backdrop filter glassmorphism effect. |
| `stuck` | `Boolean` | `undefined` | Controlled dock state override via `v-model:stuck`. |

---

### 🔘 `NanoSwitch`

A lightweight, accessible toggle switch component featuring glassmorphism styles, keyboard accessibility (`Space` / `Enter`), and smooth state transitions.

```vue
<template>
  <NanoSwitch
    v-model="isEnabled"
    label="Hardware Acceleration"
    size="md"
  />
</template>

<script setup>
import { ref } from 'vue';
import { NanoSwitch } from '@gkucmierz/nano-ui';

const isEnabled = ref(true);
</script>
```

---

### 📊 `ThreeDDonutChart`

A premium 3D SVG Donut and Pie Chart component for Vue 3. Features smooth morphing animations, dynamic 2D/3D perspective transitions, responsive side-label columns with callout leader lines, auto-rotation label balancing, and slice selection locking.

```vue
<template>
  <div class="chart-container">
    <ThreeDDonutChart 
      v-model:selectedItemId="selectedId"
      :data="chartData"
      :isExpanded="true"
      :showLabels="true"
      :is3D="true"
      :slopeRatio="0.55"
      :autoRotate="true"
      :selectable="true"
      valueDecimals="2"
      centerLabel="Total Portfolio"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ThreeDDonutChart } from '@gkucmierz/nano-ui';

const selectedId = ref(null);
const chartData = ref([
  { id: '1', name: 'Ethereum', value: 140, color: '#3b82f6', unit: 'ETH' },
  { id: '2', name: 'Solana', value: 95, color: '#10b981', unit: 'SOL' },
  { id: '3', name: 'Bitcoin', value: 55, color: '#f59e0b', unit: 'BTC' }
]);
</script>
```

#### Props
| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `Array` | *Required* | Array of objects: `{ id, name, value, color, unit }`. |
| `isExpanded` | `Boolean` | `false` | Large container layout with callout margins (`true`) or compact mini layout (`false`). |
| `showLabels` | `Boolean` | `true` | Show/hide side callouts and leader lines (applicable when `isExpanded` is true). |
| `is3D` | `Boolean` | `true` | Enables 3D perspective rendering (depth and tilt). When false, renders in flat 2D. |
| `slopeRatio` | `Number` | `0.5` | Vertical tilt factor of the 3D plane (from `0.2` to `1.0`). |
| `rotationAngle` | `Number` | `-90` | Starting rotation angle of the chart in degrees. |
| `autoRotate` | `Boolean` | `false` | Dynamically optimizes rotation to balance side labels evenly. |
| `selectable` | `Boolean` | `false` | Enables slice selection/locking on click or tap. |
| `selectedItemId` | `String \| Number` | `null` | ID of the currently locked slice (`v-model:selectedItemId`). |
| `centerValue` | `String \| Number` | `''` | Custom text inside donut hole (defaults to sum of all items). |
| `centerLabel` | `String` | `''` | Sub-label text displayed below center value. |
| `centerValueFormatter` | `Function` | `null` | Formatter function: `(value, item) => string`. |
| `valueDecimals` | `Number` | `undefined` | Decimals to round slice values on callouts. |
| `aggregateOthers` | `Boolean` | `false` | Merges slices below threshold into an "Other" item. |
| `othersThreshold` | `Number` | `0.01` | Fraction threshold (e.g. `0.05` for 5%) for "Other" aggregation. |

---

### 🪟 `NanoModal`

Standardized modal dialog adhering to the **Universal Dismissal Triad** (ESC key with `event.stopPropagation()`, backdrop click `@click.self`, and header close `✕`), with deep-linking URL hash synchronization support.

```vue
<template>
  <NanoModal
    v-model="isOpen"
    title="System Configuration"
    icon="⚙️"
    max-width="540px"
    @close="isOpen = false"
  >
    <div class="modal-body">
      <p>Configure hardware telemetry parameters and sync preferences.</p>
    </div>
  </NanoModal>
</template>

<script setup>
import { ref } from 'vue';
import { NanoModal } from '@gkucmierz/nano-ui';

const isOpen = ref(false);
</script>
```

---

### 💧 Directives

#### `v-ripple`
Material-style ripple effect directive with configurable colors:

```vue
<template>
  <button v-ripple class="btn">Default Ripple</button>
  <div v-ripple="'rgba(0, 242, 254, 0.3)'" class="card">Custom Cyan Ripple</div>
</template>
```

#### `v-tooltip`
Lightweight, accessible tooltip directive powered by `@gkucmierz/nano-ui` composable state:

```vue
<template>
  <button v-tooltip="'Synchronize system telemetry'">Sync Now</button>
  <span v-tooltip="{ text: 'High-precision sensor', position: 'bottom' }">Sensor A</span>
</template>
```

---

## 🌐 Built-in i18n Architecture

Nano UI includes a zero-dependency, ultra-lightweight reactive internationalization engine (`src/locales.js`) featuring **strictly line-correlated JSON translation dictionaries**:

```javascript
import { t, currentLang, setLang, toggleLang } from '@gkucmierz/nano-ui/locales';

// Switch language reactively
setLang('pl'); // 'en' | 'pl'
toggleLang();

// Translate keys with parameter interpolation
const label = t('rotator.isokinetic');
```

The translation files (`src/locales/en.json` and `src/locales/pl.json`) are maintained in strict 1:1 line synchronization, enabling seamless structural diffing and zero missing-key drift.

---

<a id="zero-fouc-architecture"></a>
## ⚡ Zero-FOUC Architecture

Nano UI provides synchronized design tokens with automatic system and dark-mode adaptation. Zero Flash of Unstyled Content (FOUC) is guaranteed through immediate inline CSS variable evaluation before Vue hydration:

```css
:root {
  --nano-bg-main: #060913;
  --nano-bg-card: rgba(15, 23, 42, 0.75);
  --nano-border-card: rgba(255, 255, 255, 0.12);
  --nano-state-active: #00f2fe;
  --nano-state-accent: #6366f1;
  --nano-radius-md: 10px;
  --nano-radius-lg: 16px;
}
```

---

<a id="zero-trust-offline-first"></a>
## 🛡️ Zero-Trust Offline-First

In accordance with workspace reliability standards:
- **No External CDNs:** Zero runtime script imports from `unpkg.com`, `esm.sh`, `jsdelivr`, or `cdnjs`.
- **Bundled Assets:** All SVG graphics and fonts resolve locally to guarantee 100% offline functionality in air-gapped environments or Progressive Web Apps (PWAs).

---

## 📜 Scripts & Development

```bash
# Start local Vite development server & playground
npm run dev

# Build the production library distribution (dist/nano-ui.js & dist/nano-ui.css)
npm run build

# Build the standalone documentation & playground application
npm run build:app

# Regenerate master branding assets (SVG -> 512x512 PNG)
npm run icons
```

---

## 📄 License

[MIT](LICENSE) © [Grzegorz Kućmierz](https://gkucmierz.com)
