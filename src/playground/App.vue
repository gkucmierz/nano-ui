<template>
  <div class="playground-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>Nano UI</h1>
        <div class="version">v1.1.0</div>
      </div>
      
      <nav class="sidebar-nav">
        <div class="nav-section">
          <h3>Directives</h3>
          <router-link to="/docs/ripple" class="nav-link" active-class="active">v-ripple</router-link>
          <router-link to="/docs/tooltip" class="nav-link" active-class="active">v-tooltip</router-link>
        </div>
        <!-- Future sections go here -->
        <div class="nav-section">
          <h3>Components</h3>
          <span class="nav-link disabled">GlobalTooltip</span>
        </div>
      </nav>
    </aside>
    
    <main class="content">
      <div class="content-header">
        <h1>Playground</h1>
        <p>Testing ground for all library components and directives.</p>
      </div>
      
      <div class="component-section">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <GlobalTooltip />
  </div>
</template>

<script setup>
// Main layout component
</script>

<style scoped>
.playground-layout {
  display: flex;
  min-height: 100vh;
  background: #09090b; /* bg-zinc-950 */
}

.sidebar {
  width: 280px;
  background: #18181b; /* bg-zinc-900 */
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h1 {
  font-weight: 800;
  letter-spacing: -0.5px;
  font-size: 1.5rem;
  margin: 0;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.version {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  color: #a1a1aa;
}

.sidebar-nav {
  padding: 1.5rem;
  flex-grow: 1;
}

.nav-section {
  margin-bottom: 2rem;
}

.nav-section h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #52525b; /* zinc-600 */
  font-weight: 700;
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
}

.nav-link {
  display: block;
  padding: 8px 12px;
  color: #a1a1aa;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.nav-link:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #f4f4f5;
}

.nav-link.active {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  font-weight: 600;
}

.nav-link.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.content {
  flex-grow: 1;
  padding: 3rem;
  max-width: 1000px;
}

.content-header {
  margin-bottom: 2rem;
}

.content-header h1 {
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 0.5rem;
  font-size: 2.2rem;
}

.content-header p {
  color: #a1a1aa;
  font-size: 1.1rem;
}

.component-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 2rem;
  min-height: 400px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>
