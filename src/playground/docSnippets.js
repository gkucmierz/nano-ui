/**
 * Utility for generating standardized documentation code snippets and interactive tabs.
 * Enforces SSoT and DRY across all component playground docs in @gkucmierz/nano-ui.
 */

/**
 * Formats a prop key-value pair into a Vue template attribute string.
 *
 * @param {string} key - Prop name (e.g. 'v-model', ':duration', 'color')
 * @param {any} value - Prop value (boolean, number, string, object)
 * @returns {string} Formatted attribute line
 */
export const formatPropAttribute = (key, value) => {
  if (typeof value === 'boolean') {
    return value ? key : `:${key}="false"`;
  }
  if (typeof value === 'number') {
    return `:${key}="${value}"`;
  }
  if (typeof value === 'object' && value !== null) {
    return `:${key}='${JSON.stringify(value)}'`;
  }
  return `${key}="${value}"`;
};

/**
 * Generates the component invocation markup in Vue template syntax.
 *
 * @param {Object} options
 * @param {string} options.name - Component tag name (e.g. 'KineticRotator')
 * @param {Object} [options.props={}] - Object with prop key-value pairs
 * @param {string} [options.slots=''] - Optional inner slot content
 * @param {boolean} [options.wrapTemplate=false] - Whether to enclose in <template>
 * @returns {string} Formatted template snippet
 */
export const generateComponentTemplate = ({
  name,
  props = {},
  slots = '',
  wrapTemplate = false,
} = {}) => {
  const propEntries = Object.entries(props);
  const formattedProps = propEntries.map(([k, v]) => `  ${formatPropAttribute(k, v)}`);

  let invocation = '';
  if (slots && slots.trim()) {
    const propsBlock = formattedProps.length > 0 ? `\n${formattedProps.join('\n')}\n` : ' ';
    const indentedSlots = slots
      .trim()
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n');
    invocation = `<${name}${propsBlock}>\n${indentedSlots}\n</${name}>`;
  } else if (formattedProps.length > 0) {
    invocation = `<${name}\n${formattedProps.join('\n')}\n/>`;
  } else {
    invocation = `<${name} />`;
  }

  if (wrapTemplate) {
    const indented = invocation
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n');
    return `<template>\n${indented}\n</template>`;
  }

  return invocation;
};

/**
 * Generates the full bundle package usage snippet (<script setup> + template).
 *
 * @param {Object} options
 * @param {string} options.name - Component name (e.g. 'KineticRotator')
 * @param {Object} [options.props={}] - Component props
 * @param {string} [options.slots=''] - Inner slot content
 * @param {boolean} [options.wrapTemplate=false] - Enclose in <template>
 * @param {boolean} [options.requiresCss=true] - Include style.css import comment
 * @param {string[]} [options.imports] - Additional imports (e.g. ["import { ref } from 'vue';"])
 * @returns {string} Full bundle usage snippet
 */
export const generateBundleSnippet = ({
  name,
  props = {},
  slots = '',
  wrapTemplate = false,
  requiresCss = true,
  imports = ["import { ref } from 'vue';"],
} = {}) => {
  const templateCode = generateComponentTemplate({ name, props, slots, wrapTemplate });

  const scriptLines = [
    ...imports,
    `import { ${name} } from '@gkucmierz/nano-ui';`,
    requiresCss ? "import '@gkucmierz/nano-ui/style.css'; // Wymagany raz w main.js" : '',
  ].filter(Boolean);

  return `<!-- 1. Pełny import z paczki (Full package bundle) -->
<script setup>
${scriptLines.join('\n')}
</script>

${templateCode}`;
};

/**
 * Generates the granular single-file import snippet for minimal footprint / tree-shaking.
 *
 * @param {Object} options
 * @param {string} options.name - Component name
 * @param {boolean} [options.requiresCss=true] - Include CSS import
 * @param {string} [options.componentPath] - Custom relative path from package root
 * @returns {string} Granular import snippet
 */
export const generateGranularSnippet = ({
  name,
  requiresCss = true,
  componentPath = `src/components/${name}.vue`,
} = {}) => {
  const lines = [
    '// 2. Granularny import pojedynczego pliku (Minimal footprint / Tree-shaking)',
    `import ${name} from '@gkucmierz/nano-ui/${componentPath}';`,
    requiresCss ? "import '@gkucmierz/nano-ui/dist/nano-ui.css';" : '',
  ].filter(Boolean);

  return lines.join('\n');
};

/**
 * Constructs the standardized codeTabs array for <NanoCodeBlock :tabs="codeTabs" />.
 * Creates 3 distinct docked tabs:
 * 1. API Reference - props, slots, events, methods specification
 * 2. Usage - ready-to-paste bundle usage code
 * 3. Granular - direct single-file imports for tree-shaking
 *
 * @param {Object} options
 * @param {string} options.name - Component name (e.g. 'KineticRotator')
 * @param {string} [options.apiDoc=''] - API Reference documentation text
 * @param {Object} [options.props={}] - Example props
 * @param {string} [options.slots=''] - Example slots
 * @param {boolean} [options.wrapTemplate=false] - Wrap in <template>
 * @param {boolean} [options.requiresCss=true] - Whether component requires CSS
 * @param {boolean} [options.showGranular=true] - Whether to generate Granular tab
 * @param {string[]} [options.imports] - Custom script imports
 * @returns {Array<{ id: string, label: string, lang: string, code: string }>}
 */
export const createDocTabs = ({
  name,
  apiDoc = '',
  props = {},
  slots = '',
  wrapTemplate = false,
  requiresCss = true,
  showGranular = true,
  imports,
} = {}) => {
  const tabs = [];

  if (apiDoc && apiDoc.trim()) {
    tabs.push({
      id: 'api',
      label: 'API Reference',
      lang: 'api',
      code: apiDoc.trim(),
    });
  }

  const usageCode = generateBundleSnippet({
    name,
    props,
    slots,
    wrapTemplate,
    requiresCss,
    ...(imports ? { imports } : {}),
  });

  tabs.push({
    id: 'usage',
    label: 'Usage',
    lang: 'vue',
    code: usageCode,
  });

  if (showGranular) {
    const granularCode = generateGranularSnippet({
      name,
      requiresCss,
    });

    tabs.push({
      id: 'granular',
      label: 'Granular',
      lang: 'js',
      code: granularCode,
    });
  }

  return tabs;
};
