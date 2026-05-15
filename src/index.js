import Ripple from './directives/ripple.js';
import { tooltipDirective } from './directives/tooltip.js';
import { showTooltip, hideTooltip, tooltipState } from './composables/useTooltip.js';
import GlobalTooltip from './components/GlobalTooltip.vue';
import NanoModal from './components/NanoModal.vue';
import './assets/style.css';

export { Ripple, tooltipDirective, showTooltip, hideTooltip, tooltipState, GlobalTooltip, NanoModal };

export default {
  install(app) {
    app.directive('ripple', Ripple);
    app.directive('tooltip', tooltipDirective);
    app.component('GlobalTooltip', GlobalTooltip);
    app.component('NanoModal', NanoModal);
  }
};
