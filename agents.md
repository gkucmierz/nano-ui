# AI Agents Rules - Nano-UI Workspace Policy

This file contains local workspace rules specifically for the `nano-ui` component library repository. These rules supplement the global workspace rules.

## 1. Documentation Formatting (Markdown)
1. **Markdown-First Docs:** All descriptive text, instructions, and "API Reference" sections within the documentation (Playground) MUST be authored and maintained as Markdown (`.md`) files and imported directly into Vue components.
2. **Separation of Concerns:** Do NOT pollute `.vue` components with large blocks of static text or HTML. Presentation logic and interactive demos remain exclusively in `.vue` files, while extensive textual documentation and API references MUST be imported from dedicated `.md` files.
