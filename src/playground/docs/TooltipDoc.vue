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
  --nu-tooltip-bg: rgba(15, 23, 42, 0.95);
  --nu-tooltip-color: #f8fafc;
  --nu-tooltip-radius: 8px;
  --nu-tooltip-padding: 8px 14px;
  --nu-tooltip-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  --nu-tooltip-border: 1px solid rgba(255, 255, 255, 0.1);
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
  color: #a1a1aa;
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
  outline: none !important;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.code-snippet:focus-visible {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
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
  outline: none !important;
  color: white;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
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

<style>
/* Light Mode Overrides */
:root[data-theme="light"] .doc-page h2,
:root[data-theme="light"] .section-title {
  color: #0f172a;
}
:root[data-theme="light"] .desc {
  color: #475569;
}

:root[data-theme="light"] .code-snippet {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}
:root[data-theme="light"] .code-snippet:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}
:root[data-theme="light"] .copy-icon {
  color: #64748b;
}

:root[data-theme="light"] .css-vars-block {
  background: #f1f5f9;
  border-color: #e2e8f0;
}
:root[data-theme="light"] .css-vars-block pre {
  color: #334155;
}

:root[data-theme="light"] .btn.outline {
  border-color: #cbd5e1;
  color: #0f172a;
}
:root[data-theme="light"] .btn.outline:hover {
  background: #f1f5f9;
}

/* 
  Global styles for our custom tooltips!
  Normally these would be in your app's global css (like style.css).
  We put them here globally so the GlobalTooltip component can pick them up.
*/
</style>

<style>
.tooltip-danger {
  --nu-tooltip-bg: rgba(234, 88, 12, 0.95) !important;
  --nu-tooltip-border: 1px solid rgba(253, 186, 116, 0.3) !important;
  --nu-tooltip-arrow-border: rgba(253, 186, 116, 0.3) !important;
}

.tooltip-error {
  --nu-tooltip-bg: rgba(220, 38, 38, 0.95) !important;
  --nu-tooltip-border: 1px solid rgba(255, 100, 100, 0.3) !important;
  --nu-tooltip-arrow-border: rgba(255, 100, 100, 0.3) !important;
}

.tooltip-success {
  --nu-tooltip-bg: rgba(5, 150, 105, 0.95) !important;
  --nu-tooltip-border: 1px solid rgba(52, 211, 153, 0.3) !important;
  --nu-tooltip-arrow-border: rgba(52, 211, 153, 0.3) !important;
}
</style>
