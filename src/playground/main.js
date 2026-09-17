import { createApp } from 'vue';
import App from './App.vue';
import NanoUI from '../index.js'; // Import the local library directly!
import router from './router/index.js';
import i18n from '../locales.js';

const app = createApp(App);

app.use(router);
app.use(i18n);

// Install the NanoUI plugin (this registers our v-ripple globally and loads styles)
app.use(NanoUI);

app.mount('#app');
