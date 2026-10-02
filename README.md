# Center of Gravity Calculator V2 — Concept E
## Guided Workflow Design Exploration

> **This is the `concept-e-guided-workflow` branch. It is a design exploration, not the production site.**

| | URL | Source branch |
|---|---|---|
| **Production** | https://ayay2270.github.io/Center-of-Gravity-Calculator-V2/ | `main` |
| **Concept E Preview** | https://ayay2270.github.io/Center-of-Gravity-Calculator-V2/concept-e/ | `concept-e-guided-workflow` |

Both versions are live at the same time so they can be tested side by side. This version is being **evaluated before deciding whether to replace `main`**. Nothing on this branch has been merged into `main`.

## Purpose of Concept E

Concept E turns the order of engineering reasoning — **geometry → tilt / spec → CG → result** — into the order of the page. It is still one calculator, not a wizard: every step is visible at once.

## Differences from production

- **Inputs as numbered steps 1 → 2 → 3** on a thin spine (棧板與機櫃尺寸 / 角度設定 / 重心 CG). All steps are open by default; each can collapse to a one-line value summary.
- **Results read as a chain (4.1 → 4.4):** 臨界角 θc → compared with the current tilt θ → compared with the spec limit → required pallet width. Each item notes which step it draws on. Card 4.1 shows only the large critical-angle value (21.6° by default).
- **Step-to-drawing highlighting:** hovering or focusing a step emphasises what it controls in the 2D drawing (dimensions / tilt arc / CG) and softens the rest.
- **1-2-3-4 index** in the drawing header; every calculation card is tagged with the step its inputs come from.
- Tilt slider markers for θc (orange) and the spec limit (red); quick targets carry the same colours.
- Small secondary text lifted to AA contrast; status marks and chevrons drawn as SVG icons.

Visual language (navy chrome, white panels, blue/orange/red angle numerals, pass/fail cards, engineering drawing) follows production.

## Engineering logic is unchanged

The engineering formulas, calculation logic, PASS / FAIL / boundary rules, CG behaviour (drag, arrow keys, manual / theoretical modes), defaults and input ranges are the same as production. The shared engine was checked against the production calculation function over 20,000 random inputs (both CG modes) with no differences. All production inputs and outputs, the six-step calculation panel, the engineering dimensions, help and reset are present.

## Concept E file locations

```
cog-refinements/concept-e/index.html     the Concept E page
cog-refinements/shared/cog-base.css      design system (production look)
cog-refinements/shared/cog-core.js       calculation engine, state, input binding, CG drag, drawing geometry
cog-refinements/shared/cog-ui.js         icons, input controls, calculation cards, engineering drawing
.github/workflows/trigger-pages.yml      re-runs main's Pages workflow when this branch changes
```

Open `cog-refinements/concept-e/index.html` directly in Chrome / Edge, or use the preview URL above.

## How the preview is deployed

GitHub Pages publishes **one combined artifact**, built by the workflow on `main`:

- `/` — production, always built from `main`
- `/concept-e/` — this branch's `cog-refinements/` files, copied into a separate subdirectory (`/concept-e/shared/` holds the three shared files; only the asset path prefix is rewritten)

A push to this branch dispatches the `main` workflow, so branch code can never be deployed over the production root.

> The rest of this repository (`src/`, `tests/`, build config) is the production source as of the branch point and is not part of Concept E.
