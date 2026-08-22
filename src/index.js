import { tracker } from '@gkucmierz/analytics'
tracker.init('nano-ui', 'https://analytics.7u.pl')

import Ripple from './directives/ripple.js';
import { tooltipDirective } from './directives/tooltip.js';
import { showTooltip, hideTooltip, tooltipState } from './composables/useTooltip.js';
import GlobalTooltip from './components/GlobalTooltip.vue';
import NanoModal from './components/NanoModal.vue';
import ThreeDDonutChart from './components/ThreeDDonutChart.vue';
import PrecisionScrubber from './components/PrecisionScrubber.vue';
import TopologyRadar from './components/TopologyRadar.vue';
import './assets/style.css';

export { Ripple, tooltipDirective, showTooltip, hideTooltip, tooltipState, GlobalTooltip, NanoModal, ThreeDDonutChart, PrecisionScrubber, TopologyRadar };

export default {
  install(app) {
    app.directive('ripple', Ripple);
    app.directive('tooltip', tooltipDirective);
    app.component('GlobalTooltip', GlobalTooltip);
    app.component('NanoModal', NanoModal);
    app.component('ThreeDDonutChart', ThreeDDonutChart);
    app.component('PrecisionScrubber', PrecisionScrubber);
    app.component('TopologyRadar', TopologyRadar);
  }
};
