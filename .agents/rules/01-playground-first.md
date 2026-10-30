# Mandatory Playground-First Development Policy (`@gkucmierz/nano-ui`)

1. **Immediate Playground Presentation for Every Component & Feature:**
   - Whenever any new component, directive, composable, parser, theme profile, or visual feature is added to `@gkucmierz/nano-ui`, you **MUST** immediately create (or update) its interactive presentation page in `src/playground/docs/*Doc.vue`, register its route in `src/playground/router/index.js`, and link it in the `src/playground/App.vue` sidebar navigation.
   - No exported UI component, input primitive, chart, or visual utility may exist in `src/index.js` without an interactive showcase in the Playground (`http://localhost:33164`).
2. **100% i18n Parity Across All Locales (`en.json` & `pl.json`):**
   - Every Playground view, navigation item, control label, badge, and component default string MUST have complete translations in both `src/locales/en.json` and `src/locales/pl.json` using the `t()` helper from `src/locales.js`.
3. **Dual-Theme Verification (`Dark` & `Light`):**
   - All new components and playground demos must work seamlessly in both default Dark mode and `[data-theme="light"]` Light mode with WCAG-compliant contrast.
