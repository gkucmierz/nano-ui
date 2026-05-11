import { createApp } from 'vue';
import App from './App.vue';
import NanoUI from '../index.js'; // Import the local library directly!

const app = createApp(App);

// Install the NanoUI plugin (this registers our v-ripple globally and loads styles)
app.use(NanoUI);

app.mount('#app');
