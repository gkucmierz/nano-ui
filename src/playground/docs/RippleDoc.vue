<template>
  <div class="doc-page">
    <h2>v-ripple Directive</h2>
    <p class="desc">Adds a beautiful Material Design-like ripple effect to any element when clicked.</p>
    
    <div class="test-row">
      <div class="example">
        <!-- Default Ripple -->
        <button v-ripple class="btn primary">
          Default Ripple
        </button>
        <div class="code-snippet" @click="copyCode(codeDefault)" v-tooltip="'Click to copy'">
          <code>&lt;button v-ripple&gt;...&lt;/button&gt;</code>
          <span class="copy-icon">📋</span>
        </div>
      </div>

      <div class="example">
        <!-- Custom Color Ripple -->
        <button v-ripple="'rgba(0, 255, 100, 0.4)'" class="btn success">
          Custom Color Ripple
        </button>
        <div class="code-snippet" @click="copyCode(codeCustom)" v-tooltip="'Click to copy'">
          <code>&lt;button v-ripple="'rgba(...) '"&gt;...&lt;/button&gt;</code>
          <span class="copy-icon">📋</span>
        </div>
      </div>
      
      <div class="example">
        <!-- Glassmorphism Card Ripple -->
        <div v-ripple class="glass-card">
          Glassmorphism Card<br>
          <small>(Click anywhere inside)</small>
        </div>
        <div class="code-snippet" @click="copyCode(codeGlass)" v-tooltip="'Click to copy'">
          <code>&lt;div v-ripple class="glass-card"&gt;...&lt;/div&gt;</code>
          <span class="copy-icon">📋</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const codeDefault = '<button v-ripple>...</button>';
const codeCustom = `<button v-ripple="'rgba(...)'">...</button>`;
const codeGlass = '<div v-ripple class="glass-card">...</div>';

const copyCode = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};
</script>

<style scoped>
.doc-page {
  padding-top: 1rem;
}

.doc-page h2 {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.desc {
  color: #a1a1aa;
  margin-bottom: 2rem;
}

.test-row {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.example {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

.code-snippet {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 8px 12px;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: #e4e4e7;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.code-snippet:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
}

.code-snippet:active {
  transform: scale(0.98);
}

.copy-icon {
  font-size: 14px;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.code-snippet:hover .copy-icon {
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
  color: white;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
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
  padding: 30px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;
  transform: translateZ(0);
  user-select: none;
  text-align: center;
  font-weight: 500;
}

.glass-card small {
  display: block;
  margin-top: 0.5rem;
  color: #a1a1aa;
  font-weight: 400;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.glass-card:active {
  transform: scale(0.97);
}
</style>
