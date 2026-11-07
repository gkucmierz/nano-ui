<script setup>
import { ref } from 'vue';
import NanoCoverFlow from '../../components/NanoCoverFlow.vue';
import NanoSwitch from '../../components/NanoSwitch.vue';
import NanoSlider from '../../components/NanoSlider.vue';
import NanoCodeBlock from '../../components/NanoCodeBlock.vue';
import { createDocTabs } from '../docSnippets.js';
import { currentLang } from '../../locales.js';

const activeIndex = ref(1);
const orientation = ref('horizontal');
const sideAngle = ref(74);
const centerGap = ref(185);
const stackSpacing = ref(56);
const loopEnabled = ref(true);

const sampleCards = [
  {
    id: 'cf-1',
    badge: '01 · macOS CoverFlow',
    title: '1. Full Domain Acquisition (Cesja 100%)',
    description:
      'Complete ownership transfer with AuthInfo & Escrow settlement. Side cards fold at 70°–85° like books on a library shelf or stage curtains.',
  },
  {
    id: 'cf-2',
    badge: '02 · Bookshelf 3D',
    title: '2. Long-Term Lease / Lease-to-Own',
    description:
      'Flexible 12–36 month campaign lease with predictable monthly billing and guaranteed buyout option at any point.',
  },
  {
    id: 'cf-3',
    badge: '03 · Stage Curtain',
    title: '3. Dedicated Subdomain *.milowice.pl',
    description:
      'Instant DNS delegation (apartamenty.milowice.pl, logistyka.milowice.pl) with automated SSL/TLS provisioning.',
  },
  {
    id: 'cf-4',
    badge: '04 · Turnkey Portal',
    title: '4. Domain + Turnkey Investment Website',
    description:
      'End-to-end engineering of a high-converting real-estate or logistics portal with interactive 3D maps and CRM webhooks.',
  },
  {
    id: 'cf-5',
    badge: '05 · GeoJSON Atlas',
    title: '5. Interactive RFC 7946 District Polygons',
    description:
      'Vector boundary overlays, 9 keyless slippy tile layers, and real-time GPS telemetry inside NanoMap.',
  },
];

const apiDoc = `// Props
modelValue: Number (default: 0) - Active center card index (v-model)
items: Array<{ id?, title?, subtitle?, description?, badge?, image? }> - Cards or images rendered in the 3D shelf
orientation: 'horizontal' | 'vertical' (default: 'horizontal') - 1-row horizontal CoverFlow or 1-column vertical bookshelf
sideAngle: Number (default: 74) - Curtain / bookshelf fold angle in degrees (15..88)
centerGap: Number (default: 185) - Distance in px from active center card to first folded side card
stackSpacing: Number (default: 56) - Spacing in px between consecutive folded cards on the shelf
depthOffset: Number (default: 150) - Z-axis recession of folded side cards (translateZ)
cardWidth: Number (default: 340) - Card width in px
cardHeight: Number (default: 230) - Card height in px
stageHeight: Number (default: 330) - Viewport container height in px
loop: Boolean (default: false) - Wrap around when navigating past first/last item
showControls: Boolean (default: true) - Show Prev / Next navigation buttons
showIndicators: Boolean (default: true) - Show bottom shelf indicator dots
wheelNavigation: Boolean (default: true) - Navigate cards using mouse wheel / trackpad swipe
storageKey: String (default: '') - Persist active card index via @gkucmierz/storage-controller
storageMode: 'ls' | 'ss' | 'mem' | 'none' (default: undefined) - Optional storage adapter override

// Slots
#item="{ item, index, isActive, state }" - Custom card / image / component template inside the 3D frame

// Events
@update:modelValue - Emits new active index
@change - Emits { index, item } when active card changes
@select - Emits { index, item } when a card is clicked`;

const codeTabs = createDocTabs({
  name: 'NanoCoverFlow',
  apiDoc,
  props: {
    'v-model': 'activeIndex',
    ':items': 'cards',
    ':orientation': 'orientation',
    ':side-angle': 74,
    ':loop': true,
    'storage-key': 'showcase_shelf',
  },
  imports: [
    "import { ref } from 'vue';",
    '',
    'const activeIndex = ref(1);',
    "const orientation = ref('horizontal');",
    'const cards = [',
    "  { id: '1', badge: '01', title: 'First Card', description: 'Folded 3D bookshelf card' },",
    "  { id: '2', badge: '02', title: 'Center Stage', description: 'Faces viewer at 0°' },",
    "  { id: '3', badge: '03', title: 'Right Curtain', description: 'Rotated -74° on Y axis' },",
    '];',
  ],
  wrapTemplate: true,
});
</script>

<template>
  <div class="doc-page">
    <div class="doc-header">
      <h2>
        {{
          currentLang === 'pl'
            ? 'NanoCoverFlow (Karty 3D / Półka Biblioteczna / Kurtyna)'
            : 'NanoCoverFlow (3D Bookshelf & Curtain Carousel)'
        }}
      </h2>
      <p>
        {{
          currentLang === 'pl'
            ? 'Prezentacja zdjęć, kart lub dowolnych komponentów w 1 wierszu (horizontal) lub 1 kolumnie (vertical) z obrotem bocznych kart o 70°–88° jak książki na półce w bibliotece lub kurtyna teatralna (macOS CoverFlow).'
            : 'Present images, cards, or custom components in a single row (horizontal) or single column (vertical) with side cards folded at 70°–88° like books on a library shelf or stage curtains (macOS CoverFlow).'
        }}
      </p>
    </div>

    <div class="nano-card" style="margin-bottom: 1.5rem">
      <div style="display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: center; margin-bottom: 1rem">
        <NanoSwitch
          :model-value="orientation === 'vertical'"
          size="compact"
          :label="currentLang === 'pl' ? 'Tryb pionowy (1 kolumna)' : 'Vertical mode (1 column)'"
          @update:model-value="(v) => (orientation = v ? 'vertical' : 'horizontal')"
        />
        <NanoSwitch
          v-model="loopEnabled"
          size="compact"
          :label="currentLang === 'pl' ? 'Pętla nieskończona (loop)' : 'Infinite loop'"
        />
        <div style="width: 200px">
          <NanoSlider
            v-model="sideAngle"
            :min="35"
            :max="86"
            :step="1"
            size="sm"
            :label="currentLang === 'pl' ? 'Kąt obrotu kart' : 'Side fold angle'"
            :format-value="(v) => `${v}°`"
          />
        </div>
        <div style="width: 200px">
          <NanoSlider
            v-model="centerGap"
            :min="110"
            :max="260"
            :step="5"
            size="sm"
            :label="currentLang === 'pl' ? 'Odstęp sceny' : 'Center stage gap'"
            :format-value="(v) => `${v}px`"
          />
        </div>
        <div style="width: 200px">
          <NanoSlider
            v-model="stackSpacing"
            :min="28"
            :max="95"
            :step="2"
            size="sm"
            :label="currentLang === 'pl' ? 'Gęstość półki' : 'Shelf stack spacing'"
            :format-value="(v) => `${v}px`"
          />
        </div>
      </div>

      <NanoCoverFlow
        v-model="activeIndex"
        :items="sampleCards"
        :orientation="orientation"
        :side-angle="sideAngle"
        :center-gap="centerGap"
        :stack-spacing="stackSpacing"
        :stage-height="orientation === 'vertical' ? 420 : 320"
        :loop="loopEnabled"
        storage-key="coverflow_demo"
      />
    </div>

    <NanoCodeBlock :tabs="codeTabs" />
  </div>
</template>
