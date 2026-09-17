<script setup>
import { ref } from 'vue';

const codeDefault = '<button v-ripple>...</button>';
const codeCustom = `<button v-ripple="'rgba(0, 255, 100, 0.4)'">...</button>`;
const codeGlass = '<div v-ripple class="glass-card">...</div>';

const copiedId = ref(null);

const copyCode = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) {
        copiedId.value = null;
      }
    }, 1500);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};
</script>

<template>
  <div class="doc-page">
    <h2>v-ripple Directive</h2>
    <p class="desc">Adds a beautiful Material Design-like ripple effect to any element when clicked.</p>
    
    <div class="test-grid">
      <div class="example">
        <!-- Default Ripple -->
        <button v-ripple class="btn primary">
          Default Ripple
        </button>
        <div class="code-snippet">
          <code>&lt;button v-ripple&gt;...&lt;/button&gt;</code>
          <button 
            class="copy-btn" 
            @click="copyCode(codeDefault, 'default')" 
            v-tooltip="copiedId === 'default' ? 'Copied!' : 'Click to copy'"
            aria-label="Copy code"
          >
            <span class="copy-icon">{{ copiedId === 'default' ? '✅' : '📋' }}</span>
          </button>
        </div>
      </div>

      <div class="example">
        <!-- Custom Color Ripple -->
        <button v-ripple="'rgba(0, 255, 100, 0.4)'" class="btn success">
          Custom Color Ripple
        </button>
        <div class="code-snippet">
          <code>&lt;button v-ripple="'rgba(0, 255, 100, 0.4)'"&gt;...&lt;/button&gt;</code>
          <button 
            class="copy-btn" 
            @click="copyCode(codeCustom, 'custom')" 
            v-tooltip="copiedId === 'custom' ? 'Copied!' : 'Click to copy'"
            aria-label="Copy code"
          >
            <span class="copy-icon">{{ copiedId === 'custom' ? '✅' : '📋' }}</span>
          </button>
        </div>
      </div>
      
      <div class="example">
        <!-- Glassmorphism Card Ripple (Underneath on the left) -->
        <div v-ripple class="glass-card">
          <span>Glassmorphism Card</span>
          <small>(Click anywhere inside)</small>
        </div>
        <div class="code-snippet">
          <code>&lt;div v-ripple class="glass-card"&gt;...&lt;/div&gt;</code>
          <button 
            class="copy-btn" 
            @click="copyCode(codeGlass, 'glass')" 
            v-tooltip="copiedId === 'glass' ? 'Copied!' : 'Click to copy'"
            aria-label="Copy code"
          >
            <span class="copy-icon">{{ copiedId === 'glass' ? '✅' : '📋' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  padding-top: 1rem;
}

.doc-page h2 {
  font-weight: 700;
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: var(--nano-text-main);
  user-select: none;
  -webkit-user-select: none;
}

.desc {
  color: var(--nano-text-muted);
  margin-bottom: 2rem;
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 2.5rem 2rem;
  max-width: 720px;
  align-items: start;
}

@media (max-width: 640px) {
  .test-grid {
    grid-template-columns: 1fr;
  }
}

.example {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
  width: 100%;
}

.code-snippet {
  background: var(--nano-bg-code);
  border: 1px solid var(--nano-border-card);
  padding: 8px 12px;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: var(--nano-text-code);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  outline: none;
  transition: border-color var(--nano-transition-interactive), background var(--nano-transition-interactive);
}

.code-snippet:hover {
  border-color: var(--nano-border-hover);
}

.code-snippet code {
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
  flex-grow: 1;
}

.copy-btn {
  background: transparent;
  border: none;
  padding: 2px 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  transition: background var(--nano-transition-interactive);
}

.copy-btn:hover {
  background: var(--nano-bg-hover);
}

.copy-icon {
  font-size: 14px;
  color: var(--nano-text-muted);
  opacity: 0.7;
  user-select: none;
  -webkit-user-select: none;
  transition: opacity var(--nano-transition-interactive);
}

.copy-btn:hover .copy-icon {
  opacity: 1;
}

/* Beautiful Premium Buttons */
.btn {
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  color: white;
  transition: transform var(--nano-transition-interactive), box-shadow var(--nano-transition-interactive);
}

.btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.6);
}

.btn:active {
  transform: scale(0.95);
}

.btn.primary {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}
.btn.primary:hover {
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
}

.btn.success {
  background: linear-gradient(135deg, #10b981, #3b82f6);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}
.btn.success:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
}

/* Premium Glass Card */
.glass-card {
  width: 100%;
  box-sizing: border-box;
  padding: 24px 30px;
  border-radius: 16px;
  background: var(--nano-bg-card-elevated);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--nano-border-card);
  box-shadow: var(--nano-shadow-card);
  color: var(--nano-text-main);
  cursor: pointer;
  transition: transform var(--nano-transition-interactive), border-color var(--nano-transition-interactive);
  transform: translateZ(0);
  user-select: none;
  -webkit-user-select: none;
  text-align: center;
  font-weight: 500;
}

.glass-card small {
  display: block;
  margin-top: 0.5rem;
  color: var(--nano-text-muted);
  font-weight: 400;
}

.glass-card:hover {
  border-color: var(--nano-border-hover);
}

.glass-card:active {
  transform: scale(0.97);
}
</style>
