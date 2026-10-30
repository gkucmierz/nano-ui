# AI Agents Rules - Local Project Policy (`@gkucmierz/nano-ui`)

> [!IMPORTANT]
> This repository adheres to the global workspace policy defined in `/workspace/AGENTS.md` and `.agents/rules/*.md`. Below are the local project rules specific to `@gkucmierz/nano-ui`.

---

## 1. Project Workflow & Code Recipes

1. **Recipe Directory (`code-recipes/`):**
   - All scratchpad recipes, technical algorithms, layer ordering notes, and design guidelines provided during development MUST reside in `code-recipes/`.
   - `code-recipes` MUST strictly remain ignored in `.gitignore`.
2. **Recipe Archival & Completion Convention (ASCII 126 `~` Prefix):**
   - Whenever all notes, formulas, or layer specifications from a file in `code-recipes/` are fully implemented and verified in the codebase, prepend the tilde character `~` (ASCII 126) to its filename.
   - Example: `code-recipes/3d-pie-chart` → `code-recipes/~3d-pie-chart`.
   - Rationale: In ASCII and Unicode collation, `~` (code 126) sorts after standard alphanumeric characters, automatically pushing completed recipes to the very bottom of directory and file tree listings.

---

## 2. Component Architecture & Rendering

1. **3D Donut Chart 9-Layer Painter's Architecture:**
   - Rendering order follows the exact 9-layer painter's algorithm:
     1. Back outer walls
     2. Back cut walls (sorted by angle order / depth ascending: $-90^\circ$ furthest $\to$ $0^\circ/180^\circ$ closest)
     3. Back inner walls (drawn *after* back cut walls so cuts never clip inner walls)
     4. Back top upper half of surface
     5. Center hole label
     6. Front inner walls
     7. Front cut walls (sorted by angle order / depth ascending: $0^\circ/180^\circ$ furthest $\to$ $+90^\circ$ closest)
     8. Front outer walls
     9. Front top upper half of surface
2. **Pure Mathematical Helpers (`src/utils/chart-walls.js`):**
   - Maintain pure, decoupled functions for interval splitting (`splitAngleIntervals`), circular neighbor resolution (`getNeighborSliceIds`), cut visibility (`resolvePartitionCutVisibility`), and depth sorting (`sortCutWallsByDepth`).
   - All geometry helpers must be 100% testable via native `node:test`.

---

## 3. Testing Tiers & Verification

1. **Unit Testing:** Native Node test runner (`node --test tests/unit/**/*.test.js`), mirroring `src/` directory layout.
2. **E2E Testing:** Playwright test suite in `tests/e2e/components/` and `tests/e2e/docs/`.

---

## 4. Documentation Formatting (Markdown)

1. **Markdown-First Docs:** All descriptive text, instructions, and "API Reference" sections within the documentation (Playground) MUST be authored and maintained as Markdown (`.md`) files and imported directly into Vue components.
2. **Separation of Concerns:** Do NOT pollute `.vue` components with large blocks of static text or HTML. Presentation logic and interactive demos remain exclusively in `.vue` files, while extensive textual documentation and API references MUST be imported from dedicated `.md` files.

---

## 5. Mandatory Playground-First Development & i18n Parity

1. **Zero Orphan Exports (Playground-First Policy):**
   - Every new component, directive, parser, theme profile, or interactive utility added to `@gkucmierz/nano-ui` **MUST** immediately be accompanied by an interactive presentation view in `src/playground/docs/`, registered in `src/playground/router/index.js`, and added to the sidebar in `src/playground/App.vue`.
   - Never ship or export a feature in `src/index.js` that is hidden from the Playground (`http://localhost:33164`).
2. **100% Bilingual i18n Coverage (`en` & `pl`):**
   - Every Playground page, sidebar link, interactive control, and component UI label must be localized in both `src/locales/en.json` and `src/locales/pl.json` via `t()`.


