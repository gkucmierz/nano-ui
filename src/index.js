import Ripple from './directives/ripple.js';
import './assets/style.css';

export { Ripple };

export default {
  install(app) {
    app.directive('ripple', Ripple);
  }
};
