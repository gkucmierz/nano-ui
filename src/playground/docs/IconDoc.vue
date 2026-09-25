<script setup>
import { ref, computed } from 'vue';
import { getAvailableIcons } from '../../icons/index.js';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoIcon from '../../components/NanoIcon.vue';

const allIcons = getAvailableIcons();
const searchQuery = ref('');
const iconSize = ref(20);
const strokeWidth = ref(2);
const activeColor = ref('currentColor');
const copiedName = ref(null);

const filteredIcons = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) {
    return allIcons;
  }
  return allIcons.filter(name => name.toLowerCase().includes(q));
});

const copySnippet = (name) => {
  const code = `<NanoIcon name="${name}" />`;
  navigator.clipboard.writeText(code).then(() => {
    copiedName.value = name;
    setTimeout(() => {
      if (copiedName.value === name) {
        copiedName.value = null;
      }
    }, 1500);
  });
};

const colors = [
  { label: 'CurrentColor', value: 'currentColor' },
  { label: 'Cyan', value: 'var(--nano-accent, #06b6d4)' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Purple', value: '#a855f7' },
];

const basicUsageCode = `<!-- 1. Built-in curated icons by name -->
<NanoIcon name="warn" :size="18" />
<NanoIcon name="info" :size="18" />
<NanoIcon name="success" :size="18" />
<NanoIcon name="close" :size="16" />
<NanoIcon name="copy" />

<!-- 2. Direct Lucide component with full tree-shaking -->
<script setup>
import { Database, Terminal, Cpu } from 'lucide-vue-next';
<\/script>
<template>
  <NanoIcon :icon="Database" :size="20" />
  <Terminal :size="20" />
</template>

<!-- 3. Custom SVG vector via default slot -->
<NanoIcon :size="24">
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
</NanoIcon>

<!-- 4. Global registration for app-wide custom icons -->
<script>
import { registerIcons } from '@gkucmierz/nano-ui';

registerIcons({
  'my-custom-badge': MyCustomIconComponent
});
<\/script>`;

const apiDoc = `<script>
// NanoIcon Props
props: {
  name: String,            // Icon identifier from built-in or custom registry (e.g. 'warn', 'close', 'search')
  icon: [Object, Function],// Optional direct Vue component (e.g. imported Lucide component)
  size: [Number, String],  // Icon dimensions in px (width & height). Default: 18
  strokeWidth: [Number, String], // Vector stroke width. Default: 2
  viewBox: String          // SVG viewBox (used when rendering default slot). Default: '0 0 24 24'
}
<\/script>

<!-- Direct slot support -->
<NanoIcon :size="20">
  <!-- Any custom SVG elements (path, circle, polygon) -->
</NanoIcon>`;
</script>

<template>
  <div class="doc-page">
    <div class="doc-header">
      <h2>NanoIcon</h2>
      <p class="desc">
        Universal, zero-dependency inline SVG icon component. Transparently powered by
        <strong>Lucide</strong> (<code>lucide-vue-next</code>) with full <code>currentColor</code> CSS inheritance,
        zero network requests, and support for app-specific custom icons.
      </p>
    </div>

    <!-- Controls Bar -->
    <div class="explorer-card">
      <div class="explorer-toolbar">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search icons (e.g. warn, search, close)..."
            class="nano-input"
          />
          <span class="icon-count">{{ filteredIcons.length }} / {{ allIcons.length }}</span>
        </div>

        <div class="toolbar-controls">
          <div class="control-item">
            <label>Size: {{ iconSize }}px</label>
            <input v-model.number="iconSize" type="range" min="14" max="36" step="2" class="range-slider" />
          </div>

          <div class="control-item">
            <label>Stroke: {{ strokeWidth }}px</label>
            <input v-model.number="strokeWidth" type="range" min="1" max="3" step="0.5" class="range-slider" />
          </div>

          <div class="color-swatches">
            <button
              v-for="c in colors"
              :key="c.label"
              class="color-dot"
              :class="{ 'is-active': activeColor === c.value }"
              :style="{ background: c.value === 'currentColor' ? 'var(--nano-text-main)' : c.value }"
              :title="c.label"
              @click="activeColor = c.value"
            />
          </div>
        </div>
      </div>

      <!-- Icon Grid -->
      <div class="icons-grid">
        <button
          v-for="name in filteredIcons"
          :key="name"
          class="icon-tile"
          :class="{ 'is-copied': copiedName === name }"
          :style="{ color: activeColor }"
          @click="copySnippet(name)"
        >
          <div class="tile-icon-wrap">
            <NanoIcon :name="name" :size="iconSize" :stroke-width="strokeWidth" />
          </div>
          <span class="tile-label">{{ copiedName === name ? 'Copied!' : name }}</span>
        </button>
      </div>
    </div>

    <!-- Usage Guide -->
    <h3 class="section-title">Usage & Architecture</h3>
    <NanoCodeBlock :code="basicUsageCode" lang="vue" title="Example Implementations" />

    <!-- Props Reference -->
    <h3 class="section-title">API Reference</h3>
    <NanoCodeBlock :code="apiDoc" lang="vue" title="NanoIcon API" />
  </div>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: var(--nano-text-main);
}

.desc {
  font-size: 0.95rem;
  color: var(--nano-text-muted);
  line-height: 1.5;
  margin: 0.5rem 0 0;
}

.desc strong {
  color: var(--nano-text-main);
}

.desc code {
  font-size: 0.85em;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  background: var(--nano-bg-muted);
  border: 1px solid var(--nano-border);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 1.5rem 0 0.5rem;
  color: var(--nano-text-main);
}

/* Explorer Card */
.explorer-card {
  display: flex;
  flex-direction: column;
  background: var(--nano-card-bg);
  border: 1px solid var(--nano-border);
  border-radius: 12px;
  box-shadow: var(--nano-shadow-sm);
  overflow: hidden;
}

.explorer-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--nano-border);
  background: var(--nano-bg-muted);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 240px;
}

.search-box .nano-input {
  width: 100%;
}

.icon-count {
  font-size: 0.8rem;
  font-family: monospace;
  color: var(--nano-text-muted);
  white-space: nowrap;
}

.toolbar-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.control-item label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nano-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.range-slider {
  width: 100px;
  accent-color: var(--nano-accent);
  cursor: pointer;
}

.color-swatches {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform var(--nano-duration-fast), border-color var(--nano-duration-fast);
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot.is-active {
  border-color: var(--nano-text-main);
  transform: scale(1.1);
}

/* Icons Grid */
.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.5rem;
  padding: 1rem;
  max-height: 480px;
  overflow-y: auto;
}

.icon-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 0.5rem;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--nano-duration-fast), border-color var(--nano-duration-fast);
  user-select: none;
}

.icon-tile:hover {
  background: var(--nano-bg-muted);
  border-color: var(--nano-border);
}

.icon-tile.is-copied {
  background: rgba(16, 185, 129, 0.12);
  border-color: #10b981;
  color: #10b981 !important;
}

.tile-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
}

.tile-label {
  font-size: 0.72rem;
  font-family: monospace;
  color: var(--nano-text-muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-tile:hover .tile-label {
  color: var(--nano-text-main);
}
</style>
