import { tracker } from '@gkucmierz/analytics'
tracker.init('nano-ui', 'https://analytics.7u.pl')

import Ripple from './directives/ripple.js';
import { tooltipDirective } from './directives/tooltip.js';
import { showTooltip, hideTooltip, tooltipState } from './composables/useTooltip.js';
import GlobalTooltip from './components/GlobalTooltip.vue';
import NanoModal from './components/NanoModal.vue';
import ThreeDDonutChart from './components/ThreeDDonutChart.vue';
import PrecisionScrubber from './components/PrecisionScrubber.vue';
import MutatingHeader from './components/MutatingHeader.vue';
import TopologyRadar from './components/TopologyRadar.vue';
import NanoSwitch from './components/NanoSwitch.vue';
import KineticRotator from './components/KineticRotator.vue';
import NanoCodeBlock from './components/NanoCodeBlock.vue';
import { transitions, durations, easings, transitionVariables } from './config/transitions.js';
import './style.css';

export { 
  Ripple, 
  tooltipDirective, 
  showTooltip, 
  hideTooltip, 
  tooltipState, 
  GlobalTooltip, 
  NanoModal, 
  ThreeDDonutChart, 
  PrecisionScrubber, 
  TopologyRadar, 
  MutatingHeader, 
  NanoSwitch,
  KineticRotator,
  NanoCodeBlock,
  transitions,
  durations,
  easings,
  transitionVariables
};

export default {
  install(app) {
    app.directive('ripple', Ripple);
    app.directive('tooltip', tooltipDirective);
    app.component('GlobalTooltip', GlobalTooltip);
    app.component('NanoModal', NanoModal);
    app.component('ThreeDDonutChart', ThreeDDonutChart);
    app.component('PrecisionScrubber', PrecisionScrubber);
    app.component('TopologyRadar', TopologyRadar);
    app.component('MutatingHeader', MutatingHeader);
    app.component('NanoSwitch', NanoSwitch);
    app.component('KineticRotator', KineticRotator);
    app.component('NanoCodeBlock', NanoCodeBlock);
  }
};
