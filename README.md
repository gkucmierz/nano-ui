# Nano UI

High-performance, minimal footprint Vue 3 UI library and directives designed for the Nano ecosystem. Built for speed, glassmorphism, and a premium UX.

🌐 **[Live Playground & Documentation](https://nano-ui.7u.pl)**

## 📦 Installation

```bash
npm install @gkucmierz/nano-ui
```

## 🛠️ Usage

### Global Installation

You can register Nano UI globally in your Vue 3 application:

```javascript
import { createApp } from 'vue';
import App from './App.vue';
import NanoUI from '@gkucmierz/nano-ui';
import '@gkucmierz/nano-ui/style.css'; // Import core animations and styles

const app = createApp(App);

app.use(NanoUI);
app.mount('#app');
```

### 💧 `v-ripple` Directive

A highly optimized material-style ripple effect directive.

```vue
<template>
  <!-- Standard usage -->
  <button v-ripple class="btn">Click Me</button>

  <!-- Custom color ripple -->
  <div v-ripple="'rgba(255, 0, 0, 0.5)'" class="card">
    Interactive Card
  </div>
</template>

<style>
/* You can override the default ripple color globally */
:root {
  --nano-ripple-color: rgba(255, 255, 255, 0.3);
}
</style>
```

## 📜 License

MIT License
