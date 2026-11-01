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
  componentName,
  props = {},
  templateAttrs = [],
  slots = '',
  slotContent = '',
  wrapTemplate = false,
} = {}) => {
  const resolvedName = name || componentName || 'div';
  const resolvedSlots = slots || slotContent || '';
  const propEntries = Object.entries(props);
  const formattedProps =
    Array.isArray(templateAttrs) && templateAttrs.length > 0
      ? templateAttrs.map(attr => `  ${attr}`)
      : propEntries.map(([k, v]) => `  ${formatPropAttribute(k, v)}`);

  let invocation = '';
  if (resolvedSlots && resolvedSlots.trim()) {
    const propsBlock = formattedProps.length > 0 ? `\n${formattedProps.join('\n')}\n` : '';
    const indentedSlots = resolvedSlots
      .trim()
      .split('\n')
      .map(line => `  ${line.trimStart()}`)
      .join('\n');
    invocation = `<${resolvedName}${propsBlock}>\n${indentedSlots}\n</${resolvedName}>`;
  } else if (formattedProps.length > 0) {
    invocation = `<${resolvedName}\n${formattedProps.join('\n')}\n/>`;
  } else {
    invocation = `<${resolvedName} />`;
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
 * @param {string} [options.name] - Component name (e.g. 'KineticRotator')
 * @param {string} [options.componentName] - Alias for name
 * @param {Object} [options.props={}] - Component props
 * @param {string[]} [options.templateAttrs=[]] - Pre-formatted attribute lines
 * @param {string} [options.slots=''] - Inner slot content
 * @param {string} [options.slotContent=''] - Alias for slots
 * @param {string} [options.stateRef=''] - Optional reactive ref variable name
 * @param {string} [options.initialValue='null'] - Initial value expression for stateRef
 * @param {boolean} [options.wrapTemplate=false] - Enclose in <template>
 * @param {boolean} [options.requiresCss=true] - Include style.css import comment
 * @param {string[]} [options.imports] - Additional imports (e.g. ["import { ref } from 'vue';"])
 * @returns {string} Full bundle usage snippet
 */
export const generateBundleSnippet = ({
  name,
  componentName,
  props = {},
  templateAttrs = [],
  slots = '',
  slotContent = '',
  stateRef = '',
  initialValue = 'null',
  wrapTemplate = false,
  requiresCss = true,
  imports = ["import { ref } from 'vue';"],
} = {}) => {
  const resolvedName = name || componentName || '';
  const templateCode = generateComponentTemplate({
    name: resolvedName,
    props,
    templateAttrs,
    slots,
    slotContent,
    wrapTemplate,
  });

  const importStatements = imports.filter(line => line.trim().startsWith('import '));
  const nonImportStatements = imports.filter(line => !line.trim().startsWith('import '));

  const scriptLines = [
    ...importStatements,
    resolvedName ? `import { ${resolvedName} } from '@gkucmierz/nano-ui';` : '',
    requiresCss ? "import '@gkucmierz/nano-ui/style.css';" : '',
    ...nonImportStatements,
    ...(stateRef ? ['', `const ${stateRef} = ref(${initialValue});`] : []),
  ].filter((line, idx, arr) => {
    if (line === '') {
      return idx > 0 && idx < arr.length - 1 && arr[idx - 1] !== '';
    }
    return Boolean(line);
  });

  return `<script setup>
${scriptLines.join('\n')}
</script>

${templateCode}`;
};

/**
 * Generates the granular single-file import snippet for minimal footprint / tree-shaking.
 *
 * @param {Object} options
 * @param {string} [options.name] - Component name
 * @param {string} [options.componentName] - Alias for name
 * @param {boolean} [options.requiresCss=true] - Include CSS import
 * @param {string} [options.componentPath] - Custom relative path from package root
 * @param {Array<string | { symbols: string[], path: string }>} [options.headlessImports=[]]
 * @returns {string} Granular import snippet
 */
export const generateGranularSnippet = ({
  name,
  componentName,
  requiresCss = true,
  componentPath,
  headlessImports = [],
} = {}) => {
  const resolvedName = name || componentName || '';
  const resolvedPath = componentPath || (resolvedName ? `src/components/${resolvedName}.vue` : '');

  const formattedHeadless = (headlessImports || [])
    .map(item => {
      if (typeof item === 'string') return item;
      if (item && Array.isArray(item.symbols) && item.path) {
        return `import { ${item.symbols.join(', ')} } from '@gkucmierz/nano-ui/${item.path}';`;
      }
      return '';
    })
    .filter(Boolean);

  const lines = [
    resolvedName ? `import ${resolvedName} from '@gkucmierz/nano-ui/${resolvedPath}';` : '',
    ...formattedHeadless,
    requiresCss ? "import '@gkucmierz/nano-ui/dist/nano-ui.css';" : '',
  ].filter(Boolean);

  return lines.join('\n');
};

/**
 * Constructs the standardized codeTabs array for <NanoCodeBlock :tabs="codeTabs" />.
 * Creates 3 distinct docked tabs:
 * 1. API Reference - props, slots, events, methods specification
 * 2. Usage - ready-to-paste bundle usage code
 * 3. Granular - direct single-file imports for tree-shaking & headless utilities
 *
 * @param {Object} options
 * @param {string} [options.name=''] - Component name (e.g. 'KineticRotator')
 * @param {string} [options.componentName=''] - Alias for name
 * @param {string} [options.apiDoc=''] - API Reference documentation text
 * @param {Array<{ title: string, items: string[] }>} [options.apiSections=[]] - Structured API Reference sections
 * @param {Object} [options.props={}] - Example props
 * @param {string[]} [options.templateAttrs=[]] - Pre-formatted template attributes
 * @param {string} [options.slots=''] - Example slots
 * @param {string} [options.slotContent=''] - Alias for slots
 * @param {string} [options.stateRef=''] - Optional reactive ref variable name
 * @param {string} [options.initialValue='null'] - Initial value expression for stateRef
 * @param {boolean} [options.wrapTemplate=false] - Wrap in <template>
 * @param {boolean} [options.requiresCss=true] - Whether component requires CSS
 * @param {boolean} [options.showGranular=true] - Whether to generate Granular tab
 * @param {string[]} [options.imports] - Custom script imports
 * @param {string} [options.componentPath] - Custom relative path from package root
 * @param {Array<string | { symbols: string[], path: string }>} [options.headlessImports] - Additional headless utility imports for the Granular tab
 * @param {string} [options.usageCode] - Custom override for Usage tab code
 * @param {string} [options.granularCode] - Custom override for Granular tab code
 * @returns {Array<{ id: string, label: string, lang: string, code: string }>}
 */
export const createDocTabs = ({
  name = '',
  componentName = '',
  apiDoc = '',
  apiSections = [],
  props = {},
  templateAttrs = [],
  slots = '',
  slotContent = '',
  stateRef = '',
  initialValue = 'null',
  wrapTemplate = false,
  requiresCss = true,
  showGranular = true,
  imports,
  componentPath,
  headlessImports = [],
  usageCode: customUsageCode,
  granularCode: customGranularCode,
} = {}) => {
  const resolvedName = name || componentName || '';
  const resolvedApiDoc =
    apiDoc && apiDoc.trim()
      ? apiDoc.trim()
      : Array.isArray(apiSections) && apiSections.length > 0
        ? apiSections
          .map(sec => `// ${sec.title}\n${(sec.items || []).join('\n')}`)
          .join('\n\n')
        : '';

  const tabs = [];

  if (resolvedApiDoc) {
    tabs.push({
      id: 'api',
      label: 'API Reference',
      lang: 'api',
      code: resolvedApiDoc,
    });
  }

  const resolvedUsageCode = customUsageCode
    ? customUsageCode.trim()
    : generateBundleSnippet({
      name: resolvedName,
      props,
      templateAttrs,
      slots,
      slotContent,
      stateRef,
      initialValue,
      wrapTemplate,
      requiresCss,
      ...(imports ? { imports } : {}),
    });

  tabs.push({
    id: 'usage',
    label: 'Usage',
    lang: 'vue',
    code: resolvedUsageCode,
  });

  if (showGranular) {
    const resolvedGranularCode = customGranularCode
      ? customGranularCode.trim()
      : generateGranularSnippet({
        name: resolvedName,
        requiresCss,
        ...(componentPath ? { componentPath } : {}),
        headlessImports,
      });

    tabs.push({
      id: 'granular',
      label: 'Granular',
      lang: 'js',
      code: resolvedGranularCode,
    });
  }

  return tabs;
};
