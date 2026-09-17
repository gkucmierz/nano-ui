<template>
  <div class="doc-page">
    <h2>v-tooltip Directive</h2>
    <p class="desc">A lightweight, high-performance tooltip directive with dynamic positioning.</p>
    
    <div class="test-row">
      <div class="example">
        <button v-tooltip="'This is a simple tooltip'" class="btn primary">
          Hover me
        </button>
        <div class="code-snippet" @click="copyCode(codeSimple)" v-tooltip="'Click to copy'">
          <code>&lt;button v-tooltip="'This is a simple tooltip'"&gt;...&lt;/button&gt;</code>
          <span class="copy-icon">📋</span>
        </div>
      </div>

      <div class="example">
        <button v-tooltip="'Tooltips can be much longer and contain more detailed instructions or explanations. The max width will automatically wrap the text.'" class="btn outline">
          Long Text Tooltip
        </button>
        <div class="code-snippet" @click="copyCode(codeLong)" v-tooltip="'Click to copy'">
          <code>&lt;button v-tooltip="'Tooltips can be much longer...'"&gt;...&lt;/button&gt;</code>
          <span class="copy-icon">📋</span>
        </div>
      </div>
    </div>

    <h3 class="section-title">Contextual Styling</h3>
    <p class="desc">Pass an object to inject a custom class into the GlobalTooltip for a specific element.</p>

    <div class="test-row">
      <div class="example">
        <button v-tooltip="{ text: 'Irreversible action!', class: 'tooltip-danger' }" class="btn danger">
          Danger Action
        </button>
        <div class="code-snippet" @click="copyCode(codeObject)" v-tooltip="'Click to copy'">
          <code>&lt;button v-tooltip="{ text: '...', class: 'tooltip-danger' }"&gt;...&lt;/button&gt;</code>
          <span class="copy-icon">📋</span>
        </div>
      </div>

      <div class="example">
        <button v-tooltip="{ text: 'Critical error occurred!', class: 'tooltip-error' }" class="btn error">
          Error Action
        </button>
        <div class="code-snippet" @click="copyCode(codeError)" v-tooltip="'Click to copy'">
          <code>&lt;button v-tooltip="{ text: '...', class: 'tooltip-error' }"&gt;...&lt;/button&gt;</code>
          <span class="copy-icon">📋</span>
        </div>
      </div>
      
      <div class="example">
        <button v-tooltip="{ text: 'Everything is fine', class: 'tooltip-success' }" class="btn success">
          Success Action
        </button>
        <div class="code-snippet" @click="copyCode(codeSuccess)" v-tooltip="'Click to copy'">
          <code>&lt;button v-tooltip="{ text: '...', class: 'tooltip-success' }"&gt;...&lt;/button&gt;</code>
          <span class="copy-icon">📋</span>
        </div>
      </div>
    </div>
    
    <h3 class="section-title">Global Theming</h3>
    <p class="desc">Override these CSS variables on <code>:root</code> or a parent container to change the default theme.</p>
    <div class="css-vars-block">
<pre><code>.global-tooltip {
  --nu-tooltip-bg: var(--nano-tooltip-bg);
  --nu-tooltip-color: var(--nano-tooltip-color);
  --nu-tooltip-radius: var(--nano-radius-md); /* 8px */
  --nu-tooltip-padding: var(--nano-space-sm) var(--nano-space-md); /* 8px 16px */
  --nu-tooltip-shadow: 0 var(--nano-space-sm) var(--nano-space-lg) rgba(0, 0, 0, 0.3); /* 0 8px 24px */
  --nu-tooltip-border: var(--nano-border-width) solid rgba(255, 255, 255, 0.1);
  --nu-tooltip-arrow-border: rgba(255, 255, 255, 0.1);
}</code></pre>
    </div>
  </div>
</template>

<script setup>
const codeSimple = '<button v-tooltip="\'This is a simple tooltip\'">...</button>';
const codeLong = `<button v-tooltip="'Tooltips can be much longer...'">...</button>`;
const codeObject = `<button v-tooltip="{ text: '...', class: 'tooltip-danger' }">...</button>`;
const codeError = `<button v-tooltip="{ text: '...', class: 'tooltip-error' }">...</button>`;
const codeSuccess = `<button v-tooltip="{ text: '...', class: 'tooltip-success' }">...</button>`;

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

.section-title {
  font-weight: 600;
  margin-top: 3rem;
  margin-bottom: 0.5rem;
}

.desc {
  color: var(--nano-text-muted);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
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

.code-snippet:active {
  transform: scale(0.98);
}

.copy-icon {
  font-size: 14px;
  opacity: 0.5;
  transition: opacity var(--nano-transition-interactive);
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

.btn.outline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.btn.outline:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn.danger {
  background: linear-gradient(135deg, #f97316, #c2410c);
  box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
}
.btn.danger:hover {
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5);
}

.btn.error {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
}
.btn.error:hover {
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
}

.btn.success {
  background: linear-gradient(135deg, #10b981, #047857);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}
.btn.success:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
}

.css-vars-block {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  border-radius: 12px;
  overflow-x: auto;
}

.css-vars-block pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.85rem;
  color: #e4e4e7;
}

</style>

