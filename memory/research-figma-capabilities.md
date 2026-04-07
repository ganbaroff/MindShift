# Figma Capabilities Research — 2026

> Research date: 2026-04-07
> Purpose: Inform MindShift design system architecture (adaptive UI for ADHD energy states)
> Scope: Figma MCP server, Variables + Modes, Components + Variants, Figma → Code pipelines, 2026 features
> Audience: Anyone building an adaptive design system that maps Figma → React + Tailwind/CSS

---

## TL;DR — What Matters For MindShift

1. **Variables + Modes is the answer for energy-adaptive UI.** Create one collection with 3+ modes ("Energy-Full", "Energy-Mid", "Energy-Low"), bind every color/spacing/font-size token. Switch the mode on the root frame → entire UI reflows. This maps cleanly to MindShift's `isLowEnergy` flag.

2. **Plan limit is the constraint.** Figma Free = 0 modes (only the default). Professional = up to 10 modes per collection. Organization = up to 20. Enterprise = up to 40+. Confirm Yusif's plan before architecting beyond 4 modes.

3. **Figma MCP `use_figma` tool can do almost anything in the file** (create variables, modes, components, variants, set bindings) but **requires a Full seat** and **cannot import images**. Read tools (`get_design_context`, `get_metadata`, `search_design_system`) have rate limits per minute on paid plans.

4. **The two-layer token architecture is the industry standard** (Linear, Shopify, Vercel Geist, Figma's own SDS use it). Layer 1 = primitives ("color/teal/500" = `#4ECDC4`). Layer 2 = semantic aliases that point to primitives ("color/text/primary" → "color/teal/500"). MindShift already has CSS tokens — they map 1:1 to Layer 2.

5. **Code Connect is the bridge.** It maps Figma component variants to React components. Once a Figma "Button" variant set is connected to `<Button />`, Dev Mode shows real production code instead of garbage auto-generated CSS. Use `figma.boolean()`, `figma.enum()`, `figma.instance()` helpers for prop mapping.

6. **Sync pipeline: Figma Variables REST API → Style Dictionary → CSS variables.** GitHub Actions runs on cron or webhook. Drift detection on PR. The official `figma/variables-github-action-example` repo is the canonical reference. Tokens Studio is optional middleware for teams that want git-first authoring.

7. **2026 expression tokens (beta)** allow `if(is-dark, #FFF, #111)` syntax inside variables. Math + conditionals + context-driven computation. Watch this — it could replace the multi-mode pattern eventually.

---

## 1. Figma MCP Tools — What Can And Cannot Be Done

The Figma MCP server is the bridge between Claude/Cursor/VS Code and a live Figma file. There are two flavors: **local** (read-only, runs in the desktop app) and **remote** (read + write, runs on Figma's servers).

### Tool inventory (full list available in this Claude environment)

| Tool | Purpose | Read/Write | Notes |
|------|---------|-----------|-------|
| `use_figma` | Run arbitrary JavaScript via the Figma Plugin API (`figma` global). The general-purpose write tool. | Write | Requires Full seat. Cannot import images/videos/GIFs. |
| `create_new_file` | Create a blank Figma Design or FigJam file in user's drafts. | Write | Returns new fileKey + URL. Asks which team if user is on multiple plans. |
| `get_design_context` | Fetch a node as code + screenshot + metadata. Default output is React + Tailwind (customizable via prompt). | Read | The primary "design → code" tool. Counts against rate limits. |
| `get_metadata` | XML overview of a node tree (IDs, layer types, names, positions, sizes only). Lightweight. | Read | Useful for navigating before drilling in with `get_design_context`. Never call for Figma Make files. |
| `get_screenshot` | PNG of a node or current selection. | Read | nodeId + fileKey both required. |
| `get_variable_defs` | Returns `{ [variableName]: value }` map for variables referenced by a node. Example: `{ 'icon/default/secondary': '#949494' }`. | Read | Critical for design-system-aware code generation. |
| `get_figjam` | Generate UI code from a FigJam node. | Read | FigJam files only — not Design files. |
| `search_design_system` | Search libraries for components, variables, and styles by query. | Read | Filters: includeComponents, includeVariables, includeStyles, includeLibraryKeys. Use BEFORE creating new components — reuse first. |
| `add_code_connect_map` / `send_code_connect_mappings` / `get_code_connect_map` / `get_code_connect_suggestions` / `get_context_for_code_connect` | Code Connect operations: AI-suggest mappings, save mappings, fetch existing mappings. | Read + Write | Maps Figma components → code components. Supports React, Vue, Svelte, SwiftUI, Compose, etc. |
| `generate_diagram` | Create a flowchart/sequence/state/gantt diagram in FigJam from Mermaid syntax. | Write | FigJam-only. Limited to 6 Mermaid diagram types. |
| `create_design_system_rules` | Returns a prompt that generates design system rules for the current repo. | Read | Bootstrapping helper. |
| `whoami` | Returns authenticated user info + plan list (with `key` field needed for `create_new_file`). | Read | Use to discover which team/plan to write into. |

### `use_figma` superpower (and gotchas)

`use_figma` is the escape hatch — it executes arbitrary JS in the context of a live Figma file with full Plugin API access via the `figma` global. This means:

- Create/edit/delete pages, frames, components, variables, styles, instances
- Bulk-create variables across modes
- Iterate every node in the document tree
- Apply auto-layout, set fills, bind variables programmatically
- Read `figma.currentPage.selection` to act on the user's current selection

**Hard limits and gotchas (from official docs + experience):**

- `figma.currentPage = page` is **NOT supported**. Use `await figma.setCurrentPageAsync(page)`.
- Font name "Inter" needs `style: "Semi Bold"` (with space), not `"SemiBold"`. Same for "Extra Bold".
- No image/video/GIF asset imports — you cannot create components that contain bitmap content.
- 50,000 character code limit per call.
- Async operations require `await` (e.g. `figma.loadFontAsync()`, `figma.getNodeByIdAsync()`).
- Writes happen in real time on Yusif's machine — visible to anyone in the file at the moment.

### Plans, seats, rate limits (2026)

| Plan / Seat | Read tools | Write tools (`use_figma`) |
|-------------|-----------|---------------------------|
| Starter / View / Collab seat | 6 calls per **month** total | Not available |
| Dev seat or Full seat on Professional | Tier 1 REST API per-minute limits | Full seat only |
| Org / Enterprise (Full seat) | Tier 1 REST API per-minute limits | Yes |

> **Action item for Yusif:** Confirm seat type. If on a Free/View seat, the MCP write workflow won't work — must upgrade to Full seat on at least Professional ($15/editor/month as of 2026).

### What CANNOT be done via Figma MCP

- Import images, videos, GIFs into a file
- Set up payment, billing, organization settings
- Modify another user's local plugin storage
- Bypass plan limits on variable modes
- Read files you don't have access to (it inherits the authenticated user's permissions)
- Set `figma.currentPage` synchronously (must use `setCurrentPageAsync`)
- Create components from nodes that contain image fills (loading bitmap data is blocked)

---

## 2. Figma Variables + Modes — The Adaptive UI Engine

This is the most important section for MindShift. Variables + Modes = the native Figma mechanism for adaptive UI without duplicating frames.

### What variables are

Variables are reusable typed values applied to design properties. They're Figma's answer to design tokens, but lighter and more interactive than CSS custom properties because they participate in the prototype runtime.

**4 native types** (5 if you count alias):

| Type | Stores | Use case |
|------|--------|----------|
| `COLOR` | RGB(A) color | Backgrounds, fills, strokes, gradients |
| `FLOAT` (number) | Number | Spacing, sizing, opacity, border radius, font size, line height |
| `STRING` | Text | Labels, placeholder text, locale strings, asset paths |
| `BOOLEAN` | true/false | Layer visibility, conditional layout |
| `VARIABLE_ALIAS` | Reference to another variable | Semantic-token layer pointing at primitive layer |

### Collections and modes — the architecture

A **collection** groups related variables. A collection has 1+ **modes**. Each variable in the collection holds *one value per mode*.

```
Collection: "MindShift Core"
├── Modes: [light, dark]               <- mode list
├── Variable: color/surface/base       <- one variable
│   ├── light: #1E2136                 <- value for light mode
│   └── dark:  #0E1020                 <- value for dark mode
├── Variable: color/text/primary
│   ├── light: #E8E8F0
│   └── dark:  #FFFFFF
└── ...
```

Switch the **mode of any frame** → every variable on that frame (and its children) re-resolves to the new mode's value. No frame duplication. No variant explosion.

### Mode count limits by plan (CRITICAL)

| Plan | Modes per collection |
|------|----------------------|
| Free / Starter | **1** (default mode only — modes feature is paywall-locked) |
| Education | Modes available |
| Professional | **Up to 10** modes per collection (raised in Schema 2025) |
| Organization | **Up to 20** modes per collection |
| Enterprise | **Up to 40+** modes per collection |

**Implication for MindShift:** A 3-mode setup (Energy-Full / Energy-Mid / Energy-Low) needs at minimum a Professional plan. Adding Vision Modes (default + protanopia + deuteranopia + tritanopia + high-contrast) on top puts you at 8 modes — still fits Professional.

### Modes for adaptive design — real patterns

| Pattern | Mode list | What changes per mode |
|---------|-----------|-----------------------|
| Theme | light, dark | Colors only |
| Multi-brand | brand-a, brand-b, brand-c | Colors, font, sometimes radius |
| Density | comfortable, cozy, compact | Spacing + font sizes (number variables) |
| Device | mobile, tablet, desktop | Spacing, font sizes, breakpoints |
| Locale | en, ru, ja, ar | String variables, sometimes font/direction |
| Vision | default, protan, deutan, tritan, high-contrast | Colors only |
| **Energy (MindShift)** | **full, mid, low** | **Colors saturated → desaturated, spacing tight → loose, font size base → larger, motion intensity** |

### Variable scoping

You can scope a variable to specific properties so it only appears in matching dropdowns. Example: scope `color/text/*` to "Text fills" only — it won't show in stroke or fill pickers for shapes. This prevents misuse.

Available scopes: `ALL_FILLS`, `FRAME_FILL`, `SHAPE_FILL`, `TEXT_FILL`, `STROKE_COLOR`, `STROKE_FLOAT`, `EFFECT_FLOAT`, `EFFECT_COLOR`, `OPACITY`, `CORNER_RADIUS`, `TEXT_CONTENT`, `WIDTH_HEIGHT`, `GAP`, `FONT_SIZE`, `LINE_HEIGHT`, etc.

### Aliases (the semantic layer)

A variable can hold a `VARIABLE_ALIAS` value pointing at another variable. This is how the two-layer token architecture works:

```
Primitives collection (single mode):
  color/teal/500   = #4ECDC4
  color/teal/600   = #3CBDB4
  color/indigo/500 = #7B72FF

Semantic collection (multi-mode):
  color/accent/primary
    energy-full → ALIAS → color/teal/500
    energy-mid  → ALIAS → color/teal/600
    energy-low  → ALIAS → color/indigo/500
```

**Aliases cannot form cycles.** A variable cannot alias itself, and Figma rejects A→B→A loops at write time.

### Extended collections (multi-brand)

Schema 2025 introduced **extended collections**: a child collection inherits all variables from a parent, but can override specific values per mode. Use this for brand variations on top of a shared core. (For MindShift this is YAGNI — single product, no brand variants.)

### Plugin API: creating modes programmatically

This is the example pattern via `use_figma`:

```javascript
// 1. Create collection
const collection = figma.variables.createVariableCollection("MindShift Core");

// 2. Rename default mode
collection.renameMode(collection.modes[0].modeId, "energy-full");

// 3. Add additional modes
const midModeId = collection.addMode("energy-mid");
const lowModeId = collection.addMode("energy-low");

// 4. Create a color variable in the collection
const surfaceVariable = figma.variables.createVariable(
  "color/surface/base",
  collection,
  "COLOR"
);

// 5. Set value per mode (RGB normalized 0-1, NOT 0-255)
const fullModeId = collection.modes[0].modeId;
surfaceVariable.setValueForMode(fullModeId, { r: 0.118, g: 0.130, b: 0.212 }); // #1E2136
surfaceVariable.setValueForMode(midModeId,  { r: 0.146, g: 0.157, b: 0.251 }); // #252840
surfaceVariable.setValueForMode(lowModeId,  { r: 0.055, g: 0.063, b: 0.125 }); // #0E1020

// 6. Create a number variable for spacing
const gapVariable = figma.variables.createVariable(
  "spacing/gap/md",
  collection,
  "FLOAT"
);
gapVariable.setValueForMode(fullModeId, 16);
gapVariable.setValueForMode(midModeId,  20);
gapVariable.setValueForMode(lowModeId,  24); // more breathing room when energy is low

// 7. Bind a node fill to the variable
const frame = figma.currentPage.selection[0];
if (frame && frame.type === "FRAME") {
  // For paint/fill bindings use the special helper
  const fills = frame.fills.slice();
  fills[0] = figma.variables.setBoundVariableForPaint(
    fills[0],
    "color",
    surfaceVariable
  );
  frame.fills = fills;

  // For non-paint bindable fields use setBoundVariable
  frame.setBoundVariable("itemSpacing", gapVariable);
  frame.setBoundVariable("paddingLeft", gapVariable);
}
```

### Plugin API: switching mode on a frame

The most useful trick — switch modes on a single root frame and the entire subtree adapts:

```javascript
// frame.setExplicitVariableModeForCollection(collection, modeId)
// In current API the method is on the node:
frame.setExplicitVariableModeForCollection(collection, midModeId);
```

This is exactly what MindShift's runtime does in CSS via `[data-mode="calm"]` overrides — but in Figma it's structural, so designers can preview the energy-low state without leaving the file.

### Prototyping: switch modes interactively

In a prototype, the **Set variable mode** action switches a frame's mode at runtime. So you can prototype the entire MindShift energy-state experience inside Figma without writing code:

- Tap "I'm low energy" button → `Set variable mode` → energy-low → all frames re-resolve.
- This is great for usability testing the adaptive system before shipping it.

### REST API: read + write variables

Two endpoints (Variables REST API is in beta but stable enough for production sync):

- `GET /v1/files/:file_key/variables/local` — all variables in the file (un-published).
- `GET /v1/files/:file_key/variables/published` — only the variables published to a library. Use this to fetch from a design system file consumed elsewhere.
- `POST /v1/files/:file_key/variables` — bulk create/update/delete via an `actions` array.

**POST request body shape (abbreviated):**

```json
{
  "variableCollections": [
    { "action": "CREATE", "id": "tempCollectionId", "name": "MindShift Core" }
  ],
  "variableModes": [
    { "action": "CREATE", "id": "tempMidId", "name": "energy-mid", "variableCollectionId": "tempCollectionId" }
  ],
  "variables": [
    {
      "action": "CREATE",
      "id": "tempSurfaceId",
      "name": "color/surface/base",
      "variableCollectionId": "tempCollectionId",
      "resolvedType": "COLOR"
    }
  ],
  "variableModeValues": [
    {
      "variableId": "tempSurfaceId",
      "modeId": "tempMidId",
      "value": { "r": 0.146, "g": 0.157, "b": 0.251 }
    },
    {
      "variableId": "tempSemanticTextId",
      "modeId": "tempMidId",
      "value": { "type": "VARIABLE_ALIAS", "id": "tempPrimitiveTextId" }
    }
  ]
}
```

The `value` object accepts either a literal (color/number/string/boolean) **or** a `VARIABLE_ALIAS` reference for the semantic layer.

> Hidden gotcha: **Write access to the Variables REST API is gated to Enterprise plans only**. Read access is on Professional+. If MindShift stays on Professional, the write path must use the Plugin API via Figma MCP `use_figma` (which has no Enterprise requirement). This is a real architectural constraint.

---

## 3. Component Properties + Variants

Component Properties let you expose configurable knobs on a Figma component without building 50 variants. They map cleanly onto React props.

### 4 property types

| Type | Maps to React | Example |
|------|---------------|---------|
| **Variant** | Discriminated union prop (`size: 'sm' \| 'md' \| 'lg'`) | Button size, status |
| **Boolean** | Boolean prop (`disabled: boolean`) | Show/hide a layer, set a variant |
| **Instance Swap** | Component prop (`icon: ReactNode`) | Replace nested icon |
| **Text** | String prop (`label: string`) | Button text content |

### Variants vs nested instance swaps — when to use which

The official guidance (from Figma's docs and the SDS reference design system) is **don't make a variant for every icon**. That would explode combinatorially: a Button with 4 sizes × 2 states × 30 icons = 240 variants.

Instead:
1. Make a base Button component with variants for `size` and `state` only.
2. Inside the Button, place an Icon **instance** (just one — any icon will do).
3. Add an **Instance Swap** property called `Icon` that can be set to any of the 30 icons.

Now you have 8 variants × 30 swap targets = same coverage with 1/30th the maintenance.

### Nested instances: known limitations

- If you swap a parent component, instances **lose all overrides** unless the swap happens *inside* the parent (not at the parent's own level).
- Changing variants on a single nested swap instance can sometimes propagate to other instances linked to the same swap property — known bug as of late 2025, may still bite.
- Boolean variables binding to variant properties has a long-running edge case where Yes/No string variants don't auto-coerce to boolean. Workaround: name variants `true`/`false` literally.

### 2026 deprecation: Simplified Instances

> **Important date:** Simplified Instances are deprecated **March 23, 2026**. After that date, all instances show every component property and layer by default. If you've been hiding properties via Simplified Instances for layout efficiency, those will reappear. Audit MindShift's component library before that date.

### Best practice patterns (from figma/sds + Linear + Vercel Geist)

1. **One source of truth per primitive.** Don't make 3 different Button components. Make one with variants.
2. **Variants for visual states, instance swaps for content.** Size, color, density = variant. Icon, child label, badge = instance swap.
3. **Match Figma variant names to React prop values exactly.** This makes Code Connect mapping trivial (no `figma.enum` translation needed).
4. **Use boolean properties for layer visibility, not new variants.** A "Has Icon" boolean that hides/shows a layer is cleaner than a `withIcon` / `withoutIcon` variant pair.
5. **Name variants with single-word values when possible** (`primary`, `secondary`, not `Primary Button` / `Secondary Button`). Easier to map.

---

## 4. Figma → Code Pipelines

Three viable approaches in 2026, in order of complexity.

### Approach A: Native Variables REST API + Style Dictionary (recommended for MindShift)

The cleanest, lightest path. No plugins, no third-party services.

**Pipeline:**

```
Figma file (variables defined)
    │
    │ GET /v1/files/:key/variables/local  ← REST API call
    ▼
sync-figma-tokens.ts (Node.js script)
    │
    │ Outputs: tokens/{collection}.json   ← raw token JSON
    ▼
Style Dictionary v4
    │
    │ Transforms + builds
    ▼
src/styles/tokens.css                     ← CSS custom properties
src/styles/tokens.ts                      ← TypeScript exports (optional)
```

**Setup steps:**

1. `npm install style-dictionary node-fetch`
2. Create `scripts/sync-figma-tokens.ts` that:
   - Calls `GET /v1/files/{FIGMA_FILE_KEY}/variables/local` with `X-Figma-Token` header.
   - Walks `meta.variables` and `meta.variableCollections`.
   - For each variable, writes one token entry per mode into a JSON file shaped like Style Dictionary expects.
   - For aliases, emits `{ "value": "{color.teal.500}" }` references.
3. Create `style-dictionary.config.js`:
   ```js
   module.exports = {
     source: ['tokens/**/*.json'],
     platforms: {
       css: {
         transformGroup: 'css',
         buildPath: 'src/styles/',
         files: [
           {
             destination: 'tokens.css',
             format: 'css/variables',
             options: { selector: ':root' }
           },
           // One file per mode → MindShift uses [data-mode="X"]
           {
             destination: 'tokens-energy-mid.css',
             format: 'css/variables',
             filter: (token) => token.attributes.mode === 'energy-mid',
             options: { selector: '[data-mode="energy-mid"]' }
           }
         ]
       }
     }
   };
   ```
4. GitHub Action triggers on cron + manual + Figma webhook (when published library updates).

The official `figma/variables-github-action-example` repo on GitHub is the canonical reference for this. It does bi-directional sync.

### Approach B: Tokens Studio plugin

Tokens Studio is a Figma plugin that stores tokens in a JSON file (committed to your repo or stored in their cloud), syncs to Figma Variables, and integrates with Style Dictionary via `@tokens-studio/sd-transforms`.

**Pros:**
- Git-first authoring (designers commit tokens via the plugin's GitHub integration)
- Multi-dimensional theme support (added 2025) — useful when you have many overlapping mode axes
- W3C Design Tokens Community Group spec-compliant
- Better than native Variables for very large multi-brand systems

**Cons:**
- Extra plugin to install + learn
- Designers must remember to use the plugin instead of native Variables (or the two get out of sync)
- Free tier is limited; Pro is $9/editor/month
- One more vendor to depend on

**Verdict for MindShift:** Skip Tokens Studio. Native Variables + Style Dictionary is simpler and you only have one product.

### Approach C: Code Connect (the design-side mapping layer)

Code Connect is Figma's official tool that maps Figma component variants to actual React components. After you connect a component:

- **Dev Mode displays real production code snippets** — not the auto-generated `<div className="flex flex-col gap-2 ...">` garbage.
- AI agents (Claude, Cursor) writing Figma → React understand which component to import and what props to pass.
- The Figma MCP `get_design_context` tool returns Code Connect snippets when available.

**Setup (CLI approach):**

```bash
npm install -D @figma/code-connect
npx figma connect create  # interactive setup
```

Create `figma.config.json`:

```json
{
  "codeConnect": {
    "include": ["src/components/**/*.{tsx,ts}"],
    "exclude": ["**/*.test.tsx", "**/*.stories.tsx"],
    "label": "React",
    "language": "typescript"
  }
}
```

Generate a Personal Access Token with **Code Connect: Write** + **File content: Read** scopes.

**React example mapping** for a Button component:

```tsx
// src/components/Button.figma.tsx
import figma from '@figma/code-connect';
import { Button } from './Button';

figma.connect(
  Button,
  'https://www.figma.com/design/abc123/MindShift?node-id=42-100',
  {
    props: {
      // Variant prop in Figma → variant prop in code
      variant: figma.enum('Variant', {
        'Primary': 'primary',
        'Secondary': 'secondary',
        'Ghost': 'ghost',
      }),
      // Boolean property in Figma → disabled prop in code
      disabled: figma.boolean('Disabled'),
      // Text property in Figma → label prop in code
      label: figma.string('Label'),
      // Boolean → conditional render of icon
      icon: figma.boolean('Has Icon', {
        true: figma.instance('Icon'),
        false: undefined,
      }),
    },
    example: ({ variant, disabled, label, icon }) => (
      <Button variant={variant} disabled={disabled}>
        {icon}
        {label}
      </Button>
    ),
  }
);
```

Run `npx figma connect publish` to push the mapping to Figma. From then on, the Figma component shows real React code in Dev Mode.

**Code Connect helpers:**
- `figma.enum(propName, mapping)` — variant → enum value
- `figma.boolean(propName, optionalMapping)` — boolean → bool or conditional value
- `figma.string(propName)` — text content → string prop
- `figma.instance(propName)` — instance swap → React component
- `figma.children(layerName)` — slot content → children
- `figma.className([...])` — compose classNames with helpers
- `figma.nestedProps(...)` — propagate child props to parent

**One-to-many mappings:** A single Figma component can map to multiple code implementations across frameworks (React, Vue, SwiftUI). Useful for multi-platform products. MindShift only ships React + service worker, so this is YAGNI.

### How Linear, Shopify, Vercel actually do it

- **Linear** built a custom Figma plugin (in-house, by one of their designers) to import token JSON directly. The engineering team co-owns the variable structure and the alias operations that derive surfaces/text/icon/control colors from the core variables. Source: Linear's own engineering blog about the latest design refresh.
- **Shopify, GitHub, Atlassian** use the two-layer architecture (primitives + semantic), with Tokens Studio or in-house pipelines for sync. Source: Knapsack and Tokens Studio blog posts.
- **Vercel Geist** is mostly an in-house React component library. The Figma file uses native Variables. The published v0 and shadcn/ui-based templates use Geist tokens. Vercel published a blog post on importing custom design systems into v0 — the workflow extracts both the Figma file and supplementary visuals to give the AI enough context.
- **Figma's own SDS (Simple Design System)** is the official reference: GitHub `figma/sds`. It uses Variables + Styles + Components + Code Connect with a React + Vite + Storybook setup. The `figma.config.json` uses `documentUrlSubstitutions` so the same mappings work across multiple Figma file copies — useful for tutorials and forks. Worth cloning and reading end to end before architecting MindShift's pipeline.

---

## 5. Latest Figma 2026 Features

### Figma Make (relaunched January 22, 2026)

Figma Make is the AI-powered prototype-to-production layer. As of January 2026 you can:

- **Embed Figma Make prototypes inside Figma Design, FigJam, and Slides files** — they render live and stay in sync.
- **Bake your design system into Figma Make templates** so AI outputs respect your tokens and components.
- New editing tools for tweaking AI-generated prototypes without re-prompting.

Figma is positioning Make as the bridge between design exploration and shippable code — competing directly with v0, Lovable, and Bolt.

### Figma AI image tools

Now in FigJam, Slides, and Buzz (beta):
- **Expand** — generative outpainting
- **Erase** — content-aware removal
- **Isolate** — auto-select subject

**Vectorize** (raster → vector) is in Slides + Buzz. Useful for logo cleanup.

### Figma MCP server "agent canvas"

Figma's January 2026 announcement: AI agents can now write directly to Figma files, creating and modifying real assets using your components, variables, and tokens. The `use_figma` tool we have access to is the mechanism. This is the biggest 2026 unlock for design system automation — Claude can literally rebuild MindShift's Figma file from a YAML spec.

### Dev Mode improvements

- Dev Mode + AI: share design + dev context with coding agents (Claude, Cursor, Copilot) to generate production-aligned code.
- Code Connect snippets surface in Dev Mode's Inspect panel — replaces the auto-generated CSS that's been the default for years.
- Multi-cursor variable annotations
- Improved measurement tooling between selected nodes

### Figma Slides design mode

Slides now exposes Figma Design's auto-layout, layers panel, and advanced properties. You can build interactive component documentation directly in slide decks that updates when the source design system changes. Useful for internal team training.

### Schema 2025 → 2026 changes

| Feature | Status | Notes |
|---------|--------|-------|
| Mode count raised on Pro/Org plans | Shipped Schema 2025 | Pro: 4 → 10. Org: 4 → 20. |
| Extended variable collections | Shipped Schema 2025 | Multi-brand inheritance |
| Variable expressions (`if(...)`) | Beta late 2025 / early 2026 | Conditional + computed values inside variables |
| Composite/Array variable types | Shipped 2025 | Holds groups (e.g. shadow stack, border stack) |
| Simplified Instances deprecation | March 23, 2026 | All component properties become visible by default |
| AI agent canvas (write tools) | Beta, free during beta | Will become usage-based pricing later |

---

## 6. Concrete Architecture Recommendation For MindShift

Based on the constraints in MindShift's `.claude/rules/guardrails.md`, the existing CSS token system, and Foundation Law #2 (energy adaptation), here's the recommended architecture:

### Phase 1: Lay the foundation in Figma

1. Create a Figma Design file: "MindShift — Design System"
2. Create **two collections**:
   - **Primitives** (1 mode named `default`): every raw color, every spacing step (4/8/12/16/20/24/32...), every font size, every radius. These match `tokens.css` 1:1 today.
   - **Semantic** (3 modes: `energy-full`, `energy-mid`, `energy-low`): every variable used in components. Each value is an alias pointing at a primitive.
3. The mode-axis differences for MindShift specifically:
   - **`energy-full`**: full saturation, tight spacing, base font sizes
   - **`energy-mid`**: slightly desaturated, slightly more spacing, base font sizes
   - **`energy-low`**: significantly desaturated (the existing calm palette), generous spacing, +1 step font sizes, slower implied motion
4. Bind every component primitive (Button, Card, Input, TaskCard) to semantic variables. Never use primitive variables directly inside components — only via semantic aliases.

### Phase 2: Set up Code Connect

1. `npm install -D @figma/code-connect`
2. Create `.figma/connect/*.figma.tsx` files for the 8 most-used MindShift components:
   - Button (existing `src/shared/ui/Button.tsx`)
   - TaskCard (`src/features/tasks/TaskCard.tsx`)
   - EnergyPicker (`src/features/home/EnergyPicker.tsx`)
   - ArcTimer (`src/features/focus/ArcTimer.tsx`)
   - Mascot (`src/shared/ui/Mascot.tsx`)
   - Fab (`src/shared/ui/Fab.tsx`)
   - CollapsibleSection (`src/shared/ui/CollapsibleSection.tsx`)
   - BurnoutAlert (`src/features/home/BurnoutAlert.tsx`)
3. Map variants and props (size, variant, disabled, energy state).
4. Publish via `npx figma connect publish`.

### Phase 3: Sync pipeline

1. Create `scripts/sync-figma-variables.ts` that hits `GET /v1/files/{key}/variables/local` and writes JSON files keyed by collection + mode.
2. Configure Style Dictionary to emit:
   - `src/styles/tokens.css` — `:root` variables for `energy-full` mode
   - `src/styles/tokens-energy-mid.css` — `[data-mode="energy-mid"]` overrides
   - `src/styles/tokens-energy-low.css` — `[data-mode="energy-low"]` overrides
3. GitHub Action `figma-sync.yml`:
   - Trigger: cron `0 */6 * * *` + manual + repository_dispatch (Figma webhook)
   - Steps: checkout → npm ci → run sync script → run Style Dictionary → diff → if changed, open PR
4. PR template includes a screenshot of changed tokens for review.

### Phase 4: Drift detection in CI

Add a CI check `tokens-drift.yml` that:
- Re-runs the sync script on PR
- Diffs the output against the committed CSS
- Fails the PR if Figma and code disagree
- Output: "Variable `color/text/primary` differs: Figma says #E8E8F0, code says #E0E0E0"

This catches the case where designers edit Figma without merging the sync PR.

### Phase 5 (optional): Use `use_figma` MCP for bulk authoring

Once the architecture is in place, Claude can use the MCP `use_figma` tool to bulk-create/update variables instead of manual clicks. Example: ingest the existing `tokens.css` → spit out a `use_figma` script that creates 80+ variables across 3 modes in one call.

---

## 7. Code Examples Reference

### Example: bulk-create MindShift semantic tokens via `use_figma`

```javascript
// To be passed as the `code` parameter to mcp__figma__use_figma
(async () => {
  // Find or create the Semantic collection
  let collection = (await figma.variables.getLocalVariableCollectionsAsync())
    .find(c => c.name === "MindShift Semantic");

  if (!collection) {
    collection = figma.variables.createVariableCollection("MindShift Semantic");
    collection.renameMode(collection.modes[0].modeId, "energy-full");
    collection.addMode("energy-mid");
    collection.addMode("energy-low");
  }

  const [fullMode, midMode, lowMode] = collection.modes;

  // Find the primitive collection for aliasing
  const primitives = (await figma.variables.getLocalVariableCollectionsAsync())
    .find(c => c.name === "MindShift Primitives");
  if (!primitives) throw new Error("Primitives collection must exist first");

  const primVars = await Promise.all(
    primitives.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
  );
  const findPrim = (name) => primVars.find(v => v.name === name);

  // Define semantic tokens with their alias targets per mode
  const semanticTokens = [
    {
      name: "color/text/primary",
      type: "COLOR",
      modes: {
        "energy-full": "color/neutral/100",
        "energy-mid":  "color/neutral/200",
        "energy-low":  "color/neutral/300",
      },
    },
    {
      name: "spacing/gap/md",
      type: "FLOAT",
      modes: {
        "energy-full": "spacing/4",
        "energy-mid":  "spacing/5",
        "energy-low":  "spacing/6",
      },
    },
    // ... more tokens
  ];

  for (const token of semanticTokens) {
    const v = figma.variables.createVariable(token.name, collection, token.type);
    for (const [modeName, primName] of Object.entries(token.modes)) {
      const mode = collection.modes.find(m => m.name === modeName);
      const primVar = findPrim(primName);
      if (!primVar) throw new Error(`Missing primitive: ${primName}`);
      v.setValueForMode(mode.modeId, figma.variables.createVariableAlias(primVar));
    }
  }

  return { created: semanticTokens.length };
})();
```

### Example: switch a frame to energy-low mode programmatically

```javascript
(async () => {
  const collection = (await figma.variables.getLocalVariableCollectionsAsync())
    .find(c => c.name === "MindShift Semantic");
  const lowMode = collection.modes.find(m => m.name === "energy-low");

  const frame = figma.currentPage.selection[0];
  if (frame && "setExplicitVariableModeForCollection" in frame) {
    frame.setExplicitVariableModeForCollection(collection, lowMode.modeId);
  }
})();
```

### Example: Code Connect mapping for MindShift TaskCard

```tsx
// src/features/tasks/TaskCard.figma.tsx
import figma from '@figma/code-connect';
import { TaskCard } from './TaskCard';

figma.connect(
  TaskCard,
  'https://www.figma.com/design/FILE_KEY/MindShift?node-id=NODE_ID',
  {
    props: {
      title: figma.string('Title'),
      difficulty: figma.enum('Difficulty', {
        'Easy': 1,
        'Medium': 2,
        'Hard': 3,
      }),
      status: figma.enum('Status', {
        'Active': 'active',
        'Completed': 'completed',
        'Snoozed': 'snoozed',
      }),
      hasReminder: figma.boolean('Has Reminder'),
      hasDueDate: figma.boolean('Has Due Date'),
      hasNote: figma.boolean('Has Note'),
    },
    example: (props) => (
      <TaskCard
        task={{
          id: 'preview',
          title: props.title,
          difficulty: props.difficulty,
          status: props.status,
          dueDate: props.hasDueDate ? new Date().toISOString() : undefined,
          reminder: props.hasReminder,
          note: props.hasNote ? 'Optional context here' : undefined,
        }}
        onComplete={() => {}}
      />
    ),
  }
);
```

### Example: Style Dictionary config for multi-mode CSS output

```js
// style-dictionary.config.js
const StyleDictionary = require('style-dictionary');

const modes = ['energy-full', 'energy-mid', 'energy-low'];

module.exports = {
  source: ['tokens/**/*.json'],
  platforms: Object.fromEntries(
    modes.map((mode) => [
      mode,
      {
        transformGroup: 'css',
        buildPath: 'src/styles/',
        files: [
          {
            destination: `tokens-${mode}.css`,
            format: 'css/variables',
            filter: (token) => token.attributes.mode === mode,
            options: {
              selector: mode === 'energy-full' ? ':root' : `[data-mode="${mode}"]`,
            },
          },
        ],
      },
    ])
  ),
};
```

---

## 8. Open Questions / Things To Confirm Before Implementation

1. **What plan tier is Yusif on?** Need at least Professional for 3+ modes and write tools. If Free → upgrade is mandatory before Phase 1.
2. **Does the existing CSS token system map cleanly to Figma collections?** Audit `src/styles/tokens.css` and `src/styles/index.css` first. Likely yes — guardrails.md already lists the canonical palette.
3. **Are there any energy-specific spacing/sizing differences today, or is it only color desaturation?** If only color, the FLOAT-typed mode variables can be skipped initially and added later.
4. **What's the long-term story for Vision Mode (color blindness)?** If MindShift wants to ship that as a separate accessibility setting, plan for additional modes from the start (don't repaint primitives later).
5. **Should the Figma file be the source of truth, or should code be?** This decides the sync direction. For MindShift, recommendation = **code is source of truth** (because the React app already exists), and the sync pushes from `tokens.css` → Figma via the Plugin API. Reverse sync (Figma → code) only kicks in once designers regularly author in Figma first.
6. **Is Tokens Studio worth adopting?** Recommendation: no. Native Variables + Style Dictionary is sufficient for one product with a small team.

---

## Sources

**Figma official docs:**
- [Modes for variables — Figma Help Center](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Overview of variables, collections, and modes](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [Guide to variables in Figma](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
- [Create and manage variables and collections](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables-and-collections)
- [Extend a variable collection](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection)
- [Variable modes in prototypes](https://help.figma.com/hc/en-us/articles/15253268379799-Variable-modes-in-prototypes)
- [Use variables in prototypes](https://help.figma.com/hc/en-us/articles/14506587589399-Use-variables-in-prototypes)
- [Multiple actions and conditionals](https://help.figma.com/hc/en-us/articles/15253220891799-Multiple-actions-and-conditionals)
- [Use expressions in prototypes](https://help.figma.com/hc/en-us/articles/15253194385943-Use-expressions-in-prototypes)
- [Explore component properties](https://help.figma.com/hc/en-us/articles/5579474826519-Explore-component-properties)
- [Create and use variants](https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants)
- [Swap components and instances](https://help.figma.com/hc/en-us/articles/360039150413-Swap-components-and-instances)
- [What's new from Schema 2025](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025)
- [Figma plans and features](https://help.figma.com/hc/en-us/articles/360040328273-Figma-plans-and-features)
- [Get started with the Figma MCP server](https://help.figma.com/hc/en-us/articles/39216419318551-Get-started-with-the-Figma-MCP-server)
- [Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Code Connect (help center)](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)
- [Explore Figma Slides](https://help.figma.com/hc/en-us/articles/24170630629911-Explore-Figma-Slides)

**Figma developer docs:**
- [Figma MCP server — Introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [Figma MCP server — Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Figma MCP server — Write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/)
- [Figma MCP server — Code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/)
- [Figma MCP server — Plans, access, and permissions](https://developers.figma.com/docs/figma-mcp-server/plans-access-and-permissions/)
- [REST API — Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [REST API — Variables](https://developers.figma.com/docs/rest-api/variables/)
- [REST API — File endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/)
- [REST API — Introduction](https://developers.figma.com/docs/rest-api/)
- [Plugin API — figma.variables](https://www.figma.com/plugin-docs/api/figma-variables/)
- [Plugin API — Variable interface](https://www.figma.com/plugin-docs/api/Variable/)
- [Plugin API — VariableCollection](https://developers.figma.com/docs/plugins/api/VariableCollection/)
- [Plugin API — createVariableCollection](https://www.figma.com/plugin-docs/api/properties/figma-variables-createvariablecollection/)
- [Plugin API — setBoundVariable](https://www.figma.com/plugin-docs/api/properties/nodes-setboundvariable/)
- [Plugin API — Working with Variables](https://www.figma.com/plugin-docs/working-with-variables/)
- [Plugin API — resolveForConsumer](https://www.figma.com/plugin-docs/api/properties/Variable-resolveforconsumer/)
- [Code Connect — Introduction](https://developers.figma.com/docs/code-connect/)
- [Code Connect — React](https://developers.figma.com/docs/code-connect/react/)
- [Code Connect — CLI quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/)
- [Code Connect — Configuring your project](https://developers.figma.com/docs/code-connect/api/config-file/)
- [@figma/code-connect on npm](https://www.npmjs.com/package/@figma/code-connect)

**Figma official GitHub:**
- [figma/sds — Simple Design System reference](https://github.com/figma/sds)
- [figma/code-connect](https://github.com/figma/code-connect)
- [figma/variables-github-action-example](https://github.com/figma/variables-github-action-example)
- [figma/rest-api-spec](https://github.com/figma/rest-api-spec)
- [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide/)
- [figma/plugin-typings](https://github.com/figma/plugin-typings/blob/master/plugin-api.d.ts)

**Vercel:**
- [Working with Figma and custom design systems in v0](https://vercel.com/blog/working-with-figma-and-custom-design-systems-in-v0)
- [Geist by Vercel](https://vercel.com/geist/introduction)
- [Geist Design System on Figma Community](https://www.figma.com/community/file/1330020847221146106/geist-design-system-vercel)

**Linear:**
- [How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh)
- [Linear Design System on Figma Community](https://www.figma.com/community/file/1222872653732371433/linear-design-system)

**Figma blog:**
- [Agents, Meet the Figma Canvas](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/)
- [Design for everyone with these accessibility-focused plugins](https://www.figma.com/blog/design-for-everyone-with-these-accessibility-focused-plugins/)
- [AI Design Systems Generator](https://www.figma.com/solutions/ai-design-systems-generator/)
- [Figma release notes](https://www.figma.com/release-notes/)

**Tokens Studio + Style Dictionary:**
- [Tokens Studio docs](https://docs.tokens.studio/)
- [Tokens Studio — Variables overview](https://docs.tokens.studio/figma/variables-overview)
- [Style Dictionary + SD Transforms](https://docs.tokens.studio/transform-tokens/style-dictionary)
- [Native Tokens in Figma have landed in the form of Variables](https://tokens.studio/blog/native-tokens-in-figma-have-landed-in-the-form-of-variables)

**Design system blog posts and case studies:**
- [Design System Mastery with Figma Variables: 2025/2026 Best-Practice Playbook](https://www.designsystemscollective.com/design-system-mastery-with-figma-variables-the-2025-2026-best-practice-playbook-da0500ca0e66)
- [Design Tokens in Practice: From Figma Variables to Production Code](https://www.designsystemscollective.com/design-tokens-in-practice-from-figma-variables-to-production-code-fd40aeccd6f5)
- [Vision Modes as Variable Modes — Building Accessible Design Systems for Color Blindness](https://medium.com/@kehms/vision-modes-as-variable-modes-building-accessible-design-systems-in-figma-for-color-blindness-da8468172f41)
- [Exploring Design Token Workflows: Figma Variables and Tokens Studio (Knapsack)](https://www.knapsack.cloud/blog/exploring-design-token-workflows-figma-variables-and-tokens-studio)
- [Optimising the design system with Figma's variables (UX Collective)](https://uxdesign.cc/design-system-figma-variables-f3d9c4351bcc)
- [Figma Variables vs Tokens Studio: Why Both Matter](https://dev.to/quintonjason/figma-variables-vs-tokens-studio-why-both-matter-2md7)
- [Best Figma plugins for design systems in 2026 (story.to.design)](https://story.to.design/blog/best-design-system-plugins-of-2026)
- [The Complete Guide to Design Systems in Figma (2026 Edition)](https://medium.com/@EmiliaBiblioKit/the-world-of-design-systems-is-no-longer-just-about-components-and-libraries-its-about-5beecc0d21cb)
- [Design Tokens Architecture (Juan David Posada)](https://medium.com/@jdposada/design-tokens-architecture-7544c9a8f33a)
- [Building a Scalable Design Token System: From Figma to Code with Style Dictionary](https://medium.com/@mailtorahul2485/building-a-scalable-design-token-system-from-figma-to-code-with-style-dictionary-e2c9eacc75aa)
- [Syncing Figma Variables to CSS Variables (Tony Ward)](https://www.tonyward.dev/articles/figma-variables-to-css-variables)
- [Syncing Figma Variables and Style Dictionary with GitHub Actions (James Ives)](https://jamesiv.es/blog/frontend/design/2023/08/01/syncing-figma-variables-with-github-actions-and-styledictionary/)
- [Streamline Figma Variables Sync with GitHub Actions](https://infinitejs.com/posts/streamline-figma-variables-github-actions/)
- [How to Structure Figma Variables and Design Tokens (zeroheight)](https://zeroheight.com/blog/figma-variables-and-design-tokens-part-one-variable-architecture/)
- [Structuring scalable Figma variables for a multi-brand, multi-mode, and responsive layouts (Border Crossing UX)](https://bordercrossingux.com/structuring-figma-variables/)
- [How to Use Figma Component Properties (Designership)](https://www.thedesignership.com/blog/figma-component-properties-guide)
- [Using Figma's instance swap and other component properties (LogRocket)](https://blog.logrocket.com/ux-design/using-component-properties-figma/)
- [Creating and organizing Variants (Figma best practices)](https://www.figma.com/best-practices/creating-and-organizing-variants/)
- [Figma Code Connect (Franki T)](https://www.francescatabor.com/articles/2026/3/31/figma-code-connect)
- [Figma in 2026: How Multi-Channel Product Design Will Evolve With AI](https://medium.com/design-bootcamp/figma-in-2026-how-multi-channel-product-design-will-evolve-with-ai-c80f066fd3ae)
- [Figma plan limits forum: All plans should offer more than 4 variable modes (LAUNCHED)](https://forum.figma.com/suggest-a-feature-11/launched-all-plans-should-offer-more-than-4-variable-modes-13979)
