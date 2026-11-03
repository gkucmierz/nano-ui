import { ref, computed, watch } from 'vue';
import { useMiniSearch } from 'vue-minisearch';
import pl from '../locales/pl.json' with { type: 'json' };
import en from '../locales/en.json' with { type: 'json' };

const rawDocFiles =
  typeof import.meta.glob === 'function'
    ? import.meta.glob('./docs/*.vue', { query: '?raw', import: 'default', eager: true })
    : {};

const DIACRITIC_MAP = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

export const normalizeSearchText = (str = '') =>
  String(str)
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, ch => DIACRITIC_MAP[ch] || ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const flattenValues = (obj) => {
  if (!obj || typeof obj !== 'object') return String(obj || '');
  return Object.values(obj)
    .map(v => (v && typeof v === 'object' ? flattenValues(v) : String(v || '')))
    .join(' ');
};

const stripVueSource = (raw = '') =>
  String(raw)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<\/?[a-zA-Z0-9_-]+[^>]*>/g, ' ')
    .replace(/[{}()[\];,.:='"<>`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const PLAYGROUND_NAV_ITEMS = [
  // Getting Started
  {
    id: '/docs/overview',
    to: '/docs/overview',
    sectionKey: 'nav.gettingStarted',
    navKey: 'nav.overview',
    docFile: 'OverviewDoc.vue',
    localeKeys: ['app', 'common'],
    componentTag: '@gkucmierz/nano-ui',
    keywords: 'install setup start konfiguracja quickstart vite css zero-fouc theme ssg',
  },
  // Primitives
  {
    id: '/docs/buttons',
    to: '/docs/buttons',
    sectionKey: 'nav.primitives',
    navKey: 'nav.buttons',
    docFile: 'ButtonDoc.vue',
    localeKeys: [],
    componentTag: '.nano-btn',
    keywords: 'button przycisk group grupa primary secondary danger ghost icon action click',
  },
  {
    id: '/docs/inputs',
    to: '/docs/inputs',
    sectionKey: 'nav.primitives',
    navKey: 'nav.inputs',
    docFile: 'InputDoc.vue',
    localeKeys: [],
    componentTag: '.nano-input',
    keywords: 'input pole tekstowe form formularz prefix suffix addon group validation search filtr',
  },
  {
    id: '/docs/cards',
    to: '/docs/cards',
    sectionKey: 'nav.primitives',
    navKey: 'nav.cards',
    docFile: 'CardDoc.vue',
    localeKeys: [],
    componentTag: '.nano-card',
    keywords: 'card karta kafelki tile metric kpi dashboard surface panel header footer',
  },
  {
    id: '/docs/badges',
    to: '/docs/badges',
    sectionKey: 'nav.primitives',
    navKey: 'nav.badges',
    docFile: 'BadgeDoc.vue',
    localeKeys: [],
    componentTag: '.nano-badge',
    keywords: 'badge odznaka status pill tag indicator dot telemetry counter',
  },
  {
    id: '/docs/tables',
    to: '/docs/tables',
    sectionKey: 'nav.primitives',
    navKey: 'nav.tables',
    docFile: 'TableDoc.vue',
    localeKeys: [],
    componentTag: '.nano-table',
    keywords: 'table tabela grid rows columns sort sticky header dane tabular',
  },
  {
    id: '/docs/alerts',
    to: '/docs/alerts',
    sectionKey: 'nav.primitives',
    navKey: 'nav.alerts',
    docFile: 'AlertDoc.vue',
    localeKeys: [],
    componentTag: '.nano-alert',
    keywords: 'alert baner banner info warning error danger success komunikat powiadomienie',
  },
  // Directives
  {
    id: '/docs/ripple',
    to: '/docs/ripple',
    sectionKey: 'nav.directives',
    navKey: 'nav.ripple',
    docFile: 'RippleDoc.vue',
    localeKeys: [],
    componentTag: 'v-ripple',
    keywords: 'directive dyrektywa ripple fala wave click touch animation efekt',
  },
  {
    id: '/docs/tooltip',
    to: '/docs/tooltip',
    sectionKey: 'nav.directives',
    navKey: 'nav.tooltip',
    docFile: 'TooltipDoc.vue',
    localeKeys: [],
    componentTag: 'v-tooltip',
    keywords: 'directive dyrektywa tooltip dymek chmurka podpowiedz hover GlobalTooltip',
  },
  // Components
  {
    id: '/docs/kinetic',
    to: '/docs/kinetic',
    sectionKey: 'nav.components',
    navKey: 'nav.rotator',
    docFile: 'KineticDoc.vue',
    localeKeys: ['kinetic'],
    componentTag: 'KineticRotator',
    keywords: 'rotator obrót kat angle hermite c1 geodesic shortestPath velocity inertia',
  },
  {
    id: '/docs/kinetic-animations',
    to: '/docs/kinetic-animations',
    sectionKey: 'nav.components',
    navKey: 'nav.kineticEngine',
    docFile: 'KineticAnimationsDoc.vue',
    localeKeys: ['kineticEngine'],
    componentTag: 'createKineticTransition',
    keywords: 'createKineticPoints buildSplinePath evaluateSplineY hermite c1 spline bezier catmull-rom bisection bisekcja resampling',
  },
  {
    id: '/docs/trend-chart',
    to: '/docs/trend-chart',
    sectionKey: 'nav.components',
    navKey: 'nav.trendChart',
    docFile: 'TrendChartDoc.vue',
    localeKeys: ['trendChart'],
    componentTag: 'NanoTrendChart',
    keywords: 'chart wykres trend liniowy area spline pasma verticalBands sb-nd weekend tooltip chmurka createWeekendBand',
  },
  {
    id: '/docs/switch',
    to: '/docs/switch',
    sectionKey: 'nav.components',
    navKey: 'nav.switch',
    docFile: 'SwitchDoc.vue',
    localeKeys: ['switch'],
    componentTag: 'NanoSwitch',
    keywords: 'switch przelacznik toggle boolean indeterminate trojstanowy tri-state checkbox',
  },
  {
    id: '/docs/slider',
    to: '/docs/slider',
    sectionKey: 'nav.components',
    navKey: 'nav.slider',
    docFile: 'SliderDoc.vue',
    localeKeys: [],
    componentTag: 'NanoSlider',
    keywords: 'slider suwak range zakres min max step ticks thumb',
  },
  {
    id: '/docs/modal',
    to: '/docs/modal',
    sectionKey: 'nav.components',
    navKey: 'nav.modal',
    docFile: 'ModalDoc.vue',
    localeKeys: [],
    componentTag: 'NanoModal',
    keywords: 'modal dialog okno popup overlay escape esc draggable shortcuts',
  },
  {
    id: '/docs/icons',
    to: '/docs/icons',
    sectionKey: 'nav.components',
    navKey: 'nav.icons',
    docFile: 'IconDoc.vue',
    localeKeys: [],
    componentTag: 'NanoIcon',
    keywords: 'icon ikona svg vector lucide sparkles warn map check close search',
  },
  {
    id: '/docs/3d-donut-chart',
    to: '/docs/3d-donut-chart',
    sectionKey: 'nav.components',
    navKey: 'nav.donut',
    docFile: 'ThreeDDonutChartDoc.vue',
    localeKeys: [],
    componentTag: 'ThreeDDonutChart',
    keywords: 'donut pie chart wykres kolowy 3d svg slice extrude tilt rotation',
  },
  {
    id: '/docs/precision-scrubber',
    to: '/docs/precision-scrubber',
    sectionKey: 'nav.components',
    navKey: 'nav.scrubber',
    docFile: 'PrecisionScrubberDoc.vue',
    localeKeys: [],
    componentTag: 'PrecisionScrubber',
    keywords: 'scrubber jog dial precyzyjny suwak micro vernier skala',
  },
  {
    id: '/docs/topology-radar',
    to: '/docs/topology-radar',
    sectionKey: 'nav.components',
    navKey: 'nav.radar',
    docFile: 'TopologyRadarDoc.vue',
    localeKeys: [],
    componentTag: 'TopologyRadar',
    keywords: 'radar topologia siec mesh sonar nodes canvas telemetry',
  },
  {
    id: '/docs/mutating-header',
    to: '/docs/mutating-header',
    sectionKey: 'nav.components',
    navKey: 'nav.mutatingHeader',
    docFile: 'MutatingHeaderDoc.vue',
    localeKeys: ['mutatingHeader'],
    componentTag: 'MutatingHeader',
    keywords: 'header naglowek navbar sticky dock floating glassmorphism scroll hysteresis',
  },
  {
    id: '/docs/code-editor',
    to: '/docs/code-editor',
    sectionKey: 'nav.components',
    navKey: 'nav.codeEditor',
    docFile: 'CodeEditorDoc.vue',
    localeKeys: ['codeEditor'],
    componentTag: 'NanoCodeEditor',
    keywords: 'NanoFileList NanoCodeBlock git diff split unified syntax highlight parser edytor kodu commit',
  },
  {
    id: '/docs/splitter',
    to: '/docs/splitter',
    sectionKey: 'nav.components',
    navKey: 'nav.splitter',
    docFile: 'SplitterDoc.vue',
    localeKeys: ['splitter'],
    componentTag: 'NanoSplitter',
    keywords: 'splitter podzial resize pane panel horizontal vertical lock laser ide',
  },
  {
    id: '/docs/select',
    to: '/docs/select',
    sectionKey: 'nav.components',
    navKey: 'nav.select',
    docFile: 'SelectDoc.vue',
    localeKeys: ['select'],
    componentTag: 'NanoSelect',
    keywords: 'select dropdown lista rozwijana combobox filter filtr searchable multi-select diacritic zolty',
  },
  {
    id: '/docs/knob',
    to: '/docs/knob',
    sectionKey: 'nav.components',
    navKey: 'nav.knob',
    docFile: 'KnobDoc.vue',
    localeKeys: ['knob'],
    componentTag: 'NanoKnob',
    keywords: 'knob pokretlo rotary dial potencjometr kat angle studio audio',
  },
  {
    id: '/docs/globe',
    to: '/docs/globe',
    sectionKey: 'nav.components',
    navKey: 'nav.globe',
    docFile: 'GlobeDoc.vue',
    localeKeys: ['globe'],
    componentTag: 'NanoGlobe',
    keywords: 'globe globus 3d ziemia kula healpix graticule countries mapa swiata',
  },
  {
    id: '/docs/map',
    to: '/docs/map',
    sectionKey: 'nav.components',
    navKey: 'nav.map',
    docFile: 'MapDoc.vue',
    localeKeys: ['mapDoc'],
    componentTag: 'NanoMap',
    keywords: 'map mapa gps mercator tiles osm openstreetmap satellite topo compass zoom scale trasa',
  },
  {
    id: '/docs/color-picker',
    to: '/docs/color-picker',
    sectionKey: 'nav.components',
    navKey: 'nav.colorPicker',
    docFile: 'ColorPickerDoc.vue',
    localeKeys: ['colorPicker'],
    componentTag: 'NanoColorPickerOklch',
    keywords: 'color picker kolor probnik barw oklch hex rgb wcag contrast kontrast jasnosc',
  },
  {
    id: '/docs/masked-input',
    to: '/docs/masked-input',
    sectionKey: 'nav.components',
    navKey: 'nav.maskedInput',
    docFile: 'MaskedPinDoc.vue',
    localeKeys: ['maskedInput'],
    componentTag: 'NuMaskedInput',
    keywords: 'NuPinInput maska masked pin 2fa otp kod weryfikacja token',
  },
  {
    id: '/docs/channel-osd',
    to: '/docs/channel-osd',
    sectionKey: 'nav.components',
    navKey: 'nav.channelOsd',
    docFile: 'ChannelOsdDoc.vue',
    localeKeys: [],
    componentTag: 'NanoChannelOsd',
    keywords: 'osd channel tv hud kanal numeryczny ekran overlay',
  },
  {
    id: '/docs/number-stepper',
    to: '/docs/number-stepper',
    sectionKey: 'nav.components',
    navKey: 'nav.numberStepper',
    docFile: 'NumberStepperDoc.vue',
    localeKeys: [],
    componentTag: 'NanoNumberStepper',
    keywords: 'stepper number licznik plus minus increment decrement stacked split input',
  },
];

const getNestedLocale = (obj, dotKey) =>
  dotKey.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);

export const SEARCH_DOCUMENTS = PLAYGROUND_NAV_ITEMS.map((item, index) => {
  const titlePl = getNestedLocale(pl, item.navKey) || '';
  const titleEn = getNestedLocale(en, item.navKey) || '';
  const sectionPl = getNestedLocale(pl, item.sectionKey) || '';
  const sectionEn = getNestedLocale(en, item.sectionKey) || '';

  const localeContentPl = (item.localeKeys || []).map(k => flattenValues(pl[k])).join(' ');
  const localeContentEn = (item.localeKeys || []).map(k => flattenValues(en[k])).join(' ');
  const rawVue = rawDocFiles[`./docs/${item.docFile}`] || '';
  const docSourceText = stripVueSource(rawVue);

  const fullContent = [
    item.componentTag || '',
    item.keywords || '',
    localeContentPl,
    localeContentEn,
    docSourceText,
  ].join(' ');

  return {
    ...item,
    order: index,
    titlePl,
    titleEn,
    sectionPl,
    sectionEn,
    componentName: item.componentTag || '',
    description: `${titlePl} ${titleEn}`,
    content: fullContent,
    normalizedHaystack: normalizeSearchText(
      [titlePl, titleEn, item.componentTag, item.keywords, fullContent].join(' ')
    ),
  };
});

export function usePlaygroundSearch() {
  const searchQuery = ref('');

  const { search, searchResults } = useMiniSearch(SEARCH_DOCUMENTS, {
    idField: 'id',
    fields: ['titlePl', 'titleEn', 'componentTag', 'componentName', 'keywords', 'description', 'content'],
    storeFields: [
      'id',
      'to',
      'order',
      'sectionKey',
      'navKey',
      'componentTag',
      'componentName',
      'titlePl',
      'titleEn',
    ],
    searchOptions: {
      boost: {
        titlePl: 6,
        titleEn: 6,
        componentTag: 5,
        componentName: 5,
        keywords: 4,
        description: 2,
        content: 1,
      },
      prefix: true,
      fuzzy: 0.2,
      processTerm: term => normalizeSearchText(term),
    },
  });

  watch(
    searchQuery,
    (q) => {
      const clean = normalizeSearchText(q).trim();
      search(clean);
    },
    { immediate: true, flush: 'sync' }
  );

  const matchedItems = computed(() => {
    const rawQ = searchQuery.value.trim();
    if (!rawQ) return SEARCH_DOCUMENTS;

    const normQ = normalizeSearchText(rawQ);
    const byId = new Map();

    if (Array.isArray(searchResults.value)) {
      for (const hit of searchResults.value) {
        const fullDoc = SEARCH_DOCUMENTS.find(d => d.id === hit.id) || hit;
        byId.set(hit.id, fullDoc);
      }
    }

    // Substring fallback across normalized titles, tags, and full subpage content
    const tokens = normQ.split(/\s+/).filter(Boolean);
    for (const doc of SEARCH_DOCUMENTS) {
      if (!byId.has(doc.id) && tokens.every(tok => doc.normalizedHaystack.includes(tok))) {
        byId.set(doc.id, doc);
      }
    }

    return Array.from(byId.values());
  });

  const matchedIdSet = computed(() => new Set(matchedItems.value.map(item => item.id)));

  const clearSearch = () => {
    searchQuery.value = '';
  };

  return {
    searchQuery,
    matchedItems,
    matchedIdSet,
    totalCount: SEARCH_DOCUMENTS.length,
    clearSearch,
  };
}
