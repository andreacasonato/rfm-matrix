# DESIGN.md: UI rules for AI agents

Read before any UI work. Full rationale and token values: `/docs/DESIGN_BRIEF.md`.

- Only theme tokens; no raw hex values and no default Tailwind palette classes.
- Geist at 600 for headings and 400 for body; Geist Mono only for numbers in tables; no third font family. Fonts are bundled locally, never loaded from a host.
- No emoji icons, gradient text, glassmorphism or decorative illustrations.
- Lucide icons only, and only where they label an action.
- Colour is reserved for status and data. Segments use the five families in DESIGN_BRIEF.md and always show the segment name, never colour alone.
- Panels use a border, no shadow. Only menus, tooltips and dialogs get a shadow.
- Radius by role: controls 8 px, panels 12 px, pills fully rounded, heatmap cells 6 px.
- One animated moment: heatmap cells fill once when an analysis finishes; disabled under `prefers-reduced-motion`.
- Primary buttons use dark text on the orange fill (white text fails contrast).
- Button labels name the outcome ("Export Champions"), no trailing arrows.
- Same verbs everywhere: Export, Delete, Run analysis, Save project.
- Every component has hover, active, focus, disabled, loading, empty and error states.
- Screenshot mobile and desktop, in light and dark themes, before finishing any UI task.
