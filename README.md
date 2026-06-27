# Nano UI

High-performance, minimal footprint Vue 3 UI library and directives designed for the Nano ecosystem. Built for speed, glassmorphism, and a premium UX.

🌐 **[Live Playground & Documentation](https://nano-ui.7u.pl)**

## 📦 Installation

```bash
npm install @gkucmierz/nano-ui
```

## 🛠️ Usage

### Global Installation

You can register Nano UI globally in your Vue 3 application:

```javascript
import { createApp } from 'vue';
import App from './App.vue';
import NanoUI from '@gkucmierz/nano-ui';
import '@gkucmierz/nano-ui/style.css'; // Import core animations and styles

const app = createApp(App);

app.use(NanoUI);
app.mount('#app');
```

### 💧 `v-ripple` Directive

A highly optimized material-style ripple effect directive.

```vue
<template>
  <!-- Standard usage -->
  <button v-ripple class="btn">Click Me</button>

  <!-- Custom color ripple -->
  <div v-ripple="'rgba(255, 0, 0, 0.5)'" class="card">
    Interactive Card
  </div>
</template>

<style>
/* You can override the default ripple color globally */
:root {
  --nano-ripple-color: rgba(255, 255, 255, 0.3);
}
</style>
```

### 📊 `ThreeDDonutChart` Component

A premium, highly interactive 3D SVG Donut and Pie Chart component for Vue 3. Features smooth morphing animations, dynamic 2D/3D perspective transitions, responsive side-label columns with callout leader lines, auto-rotation label balancing, and slice selection locking.

#### Code Example
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
      centerLabel="Total Value"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ThreeDDonutChart } from '@gkucmierz/nano-ui';

const selectedId = ref(null);
const chartData = ref([
  { id: '1', name: 'Product A', value: 120, color: '#3b82f6', unit: 'USD' },
  { id: '2', name: 'Product B', value: 85, color: '#10b981', unit: 'USD' },
  { id: '3', name: 'Product C', value: 45, color: '#a855f7', unit: 'USD' }
]);
</script>
```

#### Component API (Props)
| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `Array` | *Required* | Array of objects: `{ id, name, value, color, unit }`. |
| `isExpanded` | `Boolean` | `false` | Large container layout with margins for labels (`true`) or compact `120x120px` mini layout (`false`). |
| `showLabels` | `Boolean` | `true` | Show/hide side callouts and leader lines (applicable when `isExpanded` is true). |
| `is3D` | `Boolean` | `true` | Enables 3D perspective rendering (depth and tilt). When false, renders in flat 2D. |
| `slopeRatio` | `Number` | `0.5` | Vertical tilt factor of the 3D plane (from `0.2` to `1.0`). |
| `rotationAngle` | `Number` | `-90` | Starting rotation angle of the chart in degrees. |
| `autoRotate` | `Boolean` | `false` | Dynamically optimizes rotation to distribute side-labels evenly. |
| `selectable` | `Boolean` | `false` | Enables slice selection/locking on click or tap. |
| `selectedItemId` | `String \| Number` | `null` | The ID of the currently locked slice (supports `v-model:selectedItemId`). |
| `centerValue` | `String \| Number` | `''` | Value displayed inside the donut hole (defaults to sum of all items). |
| `centerLabel` | `String` | `''` | Sub-label text displayed below the center value. |
| `valueDecimals` | `Number` | `undefined` | Decimals to round slice values to on label callouts. |
| `aggregateOthers` | `Boolean` | `false` | Merges small items below a threshold into an "Other" slice. |
| `othersThreshold`| `Number` | `0.01` | Fraction threshold (e.g. `0.05` for 5%) below which items are aggregated. |

## 📜 License

MIT License
