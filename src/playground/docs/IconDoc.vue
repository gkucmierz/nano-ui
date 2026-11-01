<script setup>
import { ref, computed } from 'vue';
import { getAvailableIcons, isIconColorable } from '../../icons/index.js';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import NanoIcon from '../../components/NanoIcon.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import { createDocTabs } from '../docSnippets.js';

const allIcons = getAvailableIcons();
const searchQuery = ref('');
const colorFilter = ref('all'); // 'all' | 'colorable' | 'non-colorable'
const iconSize = ref(20);
const strokeWidth = ref(2);
const activeColor = ref('currentColor');
const copiedName = ref(null);

const colorableCount = computed(() => allIcons.filter(name => isIconColorable(name)).length);
const nonColorableCount = computed(() => allIcons.filter(name => !isIconColorable(name)).length);

const filteredIcons = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return allIcons.filter(name => {
    if (colorFilter.value === 'colorable' && !isIconColorable(name)) return false;
    if (colorFilter.value === 'non-colorable' && isIconColorable(name)) return false;
    if (q && !name.toLowerCase().includes(q)) return false;
    return true;
  });
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
<NanoIcon name="compass-rose" :size="20" />
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
  'my-custom-badge': Object.assign(MyCustomIconComponent, { colorable: false })
});
<\/script>`;

const codeTabs = createDocTabs({
  componentName: 'NanoIcon',
  usageCode: basicUsageCode,
  headlessImports: [
    { symbols: ['BUILTIN_ICONS', 'registerIcons', 'getAvailableIcons', 'isIconColorable'], path: 'src/icons/index.js' },
  ],
  apiSections: [
    {
      title: 'Props',
      items: [
        'name: String - Icon identifier from built-in or custom registry (e.g. "warn", "compass-rose", "search")',
        'icon: Object | Function - Optional direct Vue component (e.g. imported Lucide component)',
        'size: Number | String (default: 18) - Icon dimensions in px (width & height)',
        'strokeWidth: Number | String (default: 2) - Vector stroke width for colorable monochrome icons',
        'viewBox: String (default: "0 0 24 24") - SVG viewBox when rendering default slot',
      ],
    },
    {
      title: 'Helpers & Registry',
      items: [
        'registerIcons(iconsMap: Record<string, Component>) - Register custom icons into global registry',
        'getAvailableIcons(): string[] - Returns sorted list of all registered icon names',
        'isIconColorable(name: string): boolean - Returns true for currentColor icons, false for fixed multi-color icons (e.g. compass-rose)',
      ],
    },
  ],
});
</script>

<template>
  <div class="doc-page">
    <div class="doc-header">
      <h2>NanoIcon</h2>
      <p class="desc">
        Universal, zero-dependency inline SVG icon component. Transparently powered by
        <strong>Lucide</strong> (<code>lucide-vue-next</code>) with full <code>currentColor</code> CSS inheritance,
        zero network requests, and support for multi-color cartographic &amp; custom ecosystem icons.
      </p>
    </div>

    <!-- Controls Bar -->
    <div class="explorer-card">
      <div class="explorer-toolbar">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search icons (e.g. warn, compass-rose, close)..."
            class="nano-input"
          />
          <span class="icon-count">{{ filteredIcons.length }} / {{ allIcons.length }}</span>
        </div>

        <div class="filter-pills" role="group" aria-label="Filter icons by color mode">
          <button
            type="button"
            class="filter-pill"
            :class="{ 'is-active': colorFilter === 'all' }"
            @click="colorFilter = 'all'"
          >
            All <span class="pill-count">{{ allIcons.length }}</span>
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ 'is-active': colorFilter === 'colorable' }"
            @click="colorFilter = 'colorable'"
          >
            Colorable <span class="pill-count">{{ colorableCount }}</span>
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ 'is-active': colorFilter === 'non-colorable' }"
            @click="colorFilter = 'non-colorable'"
          >
            Non-colorable <span class="pill-count">{{ nonColorableCount }}</span>
          </button>
        </div>

        <div class="toolbar-controls">
          <div class="control-item">
            <label>Size: {{ iconSize }}px</label>
            <div class="slider-box">
              <NanoSlider v-model="iconSize" :min="14" :max="36" :step="2" size="sm" :show-ticks="false" aria-label="Icon Size" />
            </div>
          </div>

          <div class="control-item">
            <label>Stroke: {{ strokeWidth }}px</label>
            <div class="slider-box">
              <NanoSlider v-model="strokeWidth" :min="1" :max="3" :step="0.5" size="sm" :show-ticks="false" aria-label="Stroke Width" />
            </div>
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
          :class="{ 'is-copied': copiedName === name, 'is-non-colorable': !isIconColorable(name) }"
          :style="{ color: activeColor }"
          @click="copySnippet(name)"
        >
          <span
            v-if="!isIconColorable(name)"
            class="fixed-palette-badge"
            title="Fixed multi-color palette (ignores currentColor)"
          />
          <div class="tile-icon-wrap">
            <NanoIcon :name="name" :size="iconSize" :stroke-width="strokeWidth" />
          </div>
          <span class="tile-label">{{ copiedName === name ? 'Copied!' : name }}</span>
        </button>
      </div>
    </div>

    <div class="code-panel">
      <NanoCodeBlock :tabs="codeTabs" />
    </div>
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

.filter-pills {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: 8px;
  background: var(--nano-card-bg);
  border: 1px solid var(--nano-border);
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--nano-text-muted);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--nano-duration-fast), color var(--nano-duration-fast);
  user-select: none;
}

.filter-pill:hover {
  color: var(--nano-text-main);
}

.filter-pill.is-active {
  background: rgba(6, 182, 212, 0.14);
  color: var(--nano-accent, #06b6d4);
}

.pill-count {
  font-size: 0.68rem;
  font-family: monospace;
  opacity: 0.78;
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

.slider-box {
  width: 120px;
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
  position: relative;
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

.fixed-palette-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444 0%, #ef4444 50%, #64748b 50%, #64748b 100%);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
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
