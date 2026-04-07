# Research: Figma → Code Design Token Pipeline (2025-2026)

**For:** MindShift (React + Vite + Tailwind) and VOLAURA (Next.js 14 + Tailwind)
**Team size:** 2 people (Yusif + 1)
**Research date:** 2026-04-07
**Research depth:** Level 3 (surface + real usage + source truth)

---

## TL;DR — Recommended Pipeline

**For a 2-person team with MindShift + VOLAURA, skip Enterprise tools entirely. Do this:**

1. **Figma Variables** (free on Professional plan, $12/editor/month) as source of truth
2. **Tokens Studio free plugin** for extraction with GitHub single-file sync
3. **Style Dictionary v4** (open source, Amazon) to transform JSON → CSS custom properties
4. **Tailwind v4 `@theme` directive** reading CSS variables (`var(--color-teal)`)
5. **Data-attribute theming** (`[data-energy="low"]`) for Energy modes
6. **GitHub Actions** manually triggered for Figma REST API pulls (no cron, no webhook)
7. **Figma Code Connect** (free until end of 2026) for component mappings

**Total cost:** $0-24/month (Figma Pro seats only). **Setup time:** ~2 days for one product, ~1 day to replicate for second.

**What to skip:**
- Tokens Studio Pro ($39+/month) — only needed for multi-file token splits
- Supernova ($35/seat/month) — overkill for 2 people, built for mid-to-large enterprise
- Knapsack — enterprise-only, no public pricing, requires annual ACH contracts
- Figma Variables REST API **write** endpoint — Tier 3, requires Enterprise plan (~$75+/editor/month)

**What you CAN use from Figma REST API on a Pro plan:** The READ endpoint `GET /v1/files/{key}/variables/local` is Tier 2 and available on Professional. The WRITE endpoint is not.

---

## Section 1: Tools Deep-Dive

### 1.1 Tokens Studio for Figma (formerly Figma Tokens)

**What it is:** Figma plugin by a third-party company (not Figma Inc.) that stores tokens in its own JSON format (legacy) or the W3C DTCG format. Predates native Figma Variables by years. Bridges Figma ↔ GitHub ↔ Style Dictionary.

**Pricing (2026):**
- **Free plugin:** Core features, single-file GitHub sync, all token types
- **Pro licence (starts ~€39/month):** Multi-file sync (tokens split into `colors.json`, `spacing.json`, etc.), all Git providers (GitLab, Bitbucket, Azure DevOps), advanced automation
- **Studio (platform, separate product):** Logic-first tokens, team collaboration, more infra (overkill for 2 people)
- **Plus tier:** Documentation + asset management

**Key features:**
- Stores tokens in JSON, syncs to GitHub via the plugin UI
- Defines tokens even for properties Figma Variables doesn't support natively (e.g., `box-shadow` composites, typography groups with multiple properties)
- Supports aliases (`{color.primary.500}` references)
- Math operations on tokens (e.g., `{spacing.base} * 2`)
- 23+ token types including composite types (typography, borderRadius, shadows)

**Figma Variables vs. Tokens Studio's own system:**
- Tokens Studio predates Figma Variables. When Figma added Variables, Tokens Studio added a "Sync with Figma Variables" feature.
- You can import existing Figma Variables into Tokens Studio, but Tokens Studio also maintains its own richer token layer on top.
- For new projects: either use Figma Variables natively + REST API, or commit fully to Tokens Studio. Mixing causes sync drift.

**GitHub integration workflow:**
1. Designer installs the plugin, authenticates with a GitHub PAT
2. Plugin reads `tokens.json` from the repo on startup
3. Designer edits tokens in Figma (via plugin UI, not Figma's native panel)
4. Designer clicks "Push to GitHub" → plugin creates a new branch and opens a PR
5. GitHub Actions fires on the PR → runs Style Dictionary → commits generated CSS/JS files back to the PR
6. Developer reviews and merges

**Limitations:**
- Push/pull indicator is buggy (stuck "Out of sync" after push completes — known issue in GitHub discussions)
- Free tier is single-file only (everything in one `tokens.json`)
- If you're already using Figma Variables heavily, the two systems compete

**Verdict for MindShift/VOLAURA:** Free plugin is fine as a bridge. Don't pay for Pro unless you need multi-file splits. Alternatively, skip it entirely and pull Figma Variables directly via REST API (see Section 1.3).

Sources:
- [Tokens Studio homepage](https://tokens.studio/)
- [Tokens Studio pricing](https://tokens.studio/pricing)
- [Tokens Studio docs — Git Sync Provider](https://docs.tokens.studio/token-storage/remote/sync-git-github)
- [GitHub: tokens-studio/figma-plugin](https://github.com/tokens-studio/figma-plugin)

---

### 1.2 Style Dictionary (Amazon, open source)

**What it is:** Build system for creating cross-platform styles. Takes JSON/YAML token files, runs them through transforms and formats, and spits out CSS, SCSS, JS, Swift, XML, etc. v4 released with W3C DTCG support.

**Pricing:** Free, MIT-licensed. Maintained by Amazon employees plus community.

**Core concepts:**
- **Tokens:** Source JSON files
- **Transforms:** Functions that modify a single token (e.g., `color/hsl` converts hex → hsl)
- **Transform groups:** Pre-bundled transforms for a platform (e.g., `css`, `scss`, `js`)
- **Formats:** Turn the transformed token tree into a file (e.g., `css/variables` writes `:root { --color-primary: #7B72FF; }`)
- **Actions:** Side effects (e.g., copy asset files)
- **Filters:** Include/exclude tokens in a specific output

**Custom transforms for Tailwind:**

```javascript
// config.js
import StyleDictionary from 'style-dictionary';

StyleDictionary.registerTransform({
  name: 'color/hsl-tailwind',
  type: 'value',
  matcher: (token) => token.type === 'color',
  transformer: (token) => {
    // Convert "#7B72FF" → "244 98% 72%" (Tailwind v4 expects space-separated HSL)
    const hsl = hexToHsl(token.value);
    return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
  },
});

export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transforms: ['attribute/cti', 'name/cti/kebab', 'color/hsl-tailwind'],
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            outputReferences: true, // keeps alias refs as var(--...)
          },
        },
      ],
    },
  },
};
```

**Output:**
```css
:root {
  --color-primary: 244 98% 72%;
  --color-teal: 178 50% 55%;
  --color-gold: 41 94% 50%;
  --radius-md: 12px;
  --spacing-4: 16px;
}
```

Then in Tailwind v4 (`src/index.css`):

```css
@import "tailwindcss";
@import "./tokens.css";

@theme inline {
  --color-primary: hsl(var(--color-primary));
  --color-teal: hsl(var(--color-teal));
  --color-gold: hsl(var(--color-gold));
  --radius-md: var(--radius-md);
  --spacing-4: var(--spacing-4);
}
```

Now `bg-primary` works in components. And `bg-primary/50` works because we stored HSL as space-separated values (Tailwind's opacity modifier trick, same as shadcn/ui).

**Handling Figma Modes → CSS data-attributes:**

Style Dictionary doesn't natively understand Figma modes. You have two patterns:

**Pattern A:** Separate token files per mode, merge at build time:
```
tokens/
  base.json       # neutral
  energy-full.json
  energy-mid.json
  energy-low.json
```

Generate multiple outputs:
```javascript
platforms: {
  'css-energy-full': {
    transformGroup: 'css',
    buildPath: 'src/styles/',
    files: [{ destination: 'energy-full.css', format: 'css/variables', options: { selector: '[data-energy="full"]' } }],
  },
  'css-energy-mid': { /* ... */ },
  'css-energy-low': { /* ... */ },
}
```

**Pattern B:** Store mode in the token structure:
```json
{
  "color": {
    "bg": {
      "full":  { "$value": "#1E2136", "$type": "color" },
      "mid":   { "$value": "#252840", "$type": "color" },
      "low":   { "$value": "#2C2F48", "$type": "color" }
    }
  }
}
```

Then write a custom format that generates:
```css
[data-energy="full"] { --color-bg: #1E2136; }
[data-energy="mid"]  { --color-bg: #252840; }
[data-energy="low"]  { --color-bg: #2C2F48; }
```

**Pattern A is cleaner for MindShift** because Energy modes are stable (only 3 values) and each mode has strong semantic meaning. Pattern B is better when you have dozens of themes (multi-brand SaaS).

**sd-tailwindcss-transformer (alternative):**

The `sd-tailwindcss-transformer` npm package (v2.1.0 for Style Dictionary v4) generates a full `tailwind.config.js` from tokens. Useful for Tailwind v3 but less necessary in v4 where you can write CSS variables directly in `@theme`.

**Verdict for MindShift/VOLAURA:** This is the centerpiece. Free, owned by Amazon, used by Adobe, GitHub, Intuit. Pick this.

Sources:
- [Style Dictionary docs](https://styledictionary.com/)
- [GitHub: style-dictionary/style-dictionary](https://github.com/style-dictionary/style-dictionary)
- [sd-tailwindcss-transformer](https://www.npmjs.com/package/sd-tailwindcss-transformer)
- [DEV Community: Style Dictionary + Tailwind](https://dev.to/philw_/using-style-dictionary-to-transform-tailwind-config-into-scss-variables-css-custom-properties-and-javascript-via-design-tokens-24h5)

---

### 1.3 Figma REST API — Native Variables Endpoint

**Endpoints:**
- `GET /v1/files/{file_key}/variables/local` — read variables (Tier 2)
- `POST /v1/files/{file_key}/variables` — bulk create/update/delete variables (Tier 3, **Enterprise only**)
- `GET /v1/files/{file_key}/variables/published` — read published library variables

**Authentication:** `X-Figma-Token` header with a personal access token. Token needs scope `file_variables:read` (Tier 2) or `file_variables:write` (Tier 3).

**CRITICAL pricing gate:** The READ endpoint is Tier 2 and available to Pro plan users. The WRITE endpoint (`POST`) requires being a full member of an Enterprise org. For a 2-person team, you can **read** but not **write** — meaning you can pull Figma Variables → code, but you can't push code → Figma Variables without enterprise.

**Rate limits (2025):**
- Pro plan, Full seat: enough for manual/daily syncs. Not documented precisely per endpoint, but forum reports suggest ~200 calls/day is safe.
- Enterprise: higher limits.
- Rate limit type returned in header `X-Figma-Rate-Limit-Type: low|medium|high`.
- Retry-After header when rate limited.

**Response structure (from READ endpoint):**

```json
{
  "status": 200,
  "error": false,
  "meta": {
    "variables": {
      "VariableID:1:2": {
        "id": "VariableID:1:2",
        "name": "color/primary",
        "key": "abc123",
        "variableCollectionId": "VariableCollectionId:1:1",
        "resolvedType": "COLOR",
        "valuesByMode": {
          "1:0": { "r": 0.48, "g": 0.45, "b": 1.0, "a": 1.0 },
          "1:1": { "r": 0.52, "g": 0.48, "b": 1.0, "a": 1.0 }
        },
        "remote": false,
        "description": "Primary CTA color",
        "hiddenFromPublishing": false,
        "scopes": ["ALL_FILLS"],
        "codeSyntax": {
          "WEB": "var(--color-primary)"
        }
      }
    },
    "variableCollections": {
      "VariableCollectionId:1:1": {
        "id": "VariableCollectionId:1:1",
        "name": "Colors",
        "key": "def456",
        "modes": [
          { "modeId": "1:0", "name": "Energy Full" },
          { "modeId": "1:1", "name": "Energy Low" }
        ],
        "defaultModeId": "1:0",
        "remote": false,
        "hiddenFromPublishing": false,
        "variableIds": ["VariableID:1:2"]
      }
    }
  }
}
```

**Pulling variables in Node.js (direct, no Tokens Studio):**

```javascript
// scripts/pull-figma-variables.mjs
import fs from 'node:fs/promises';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY;

async function pullVariables() {
  const res = await fetch(
    `https://api.figma.com/v1/files/${FILE_KEY}/variables/local`,
    { headers: { 'X-Figma-Token': FIGMA_TOKEN } }
  );
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${await res.text()}`);
  const { meta } = await res.json();

  const collections = meta.variableCollections;
  const variables = meta.variables;
  const outputByMode = {};

  for (const variable of Object.values(variables)) {
    const collection = collections[variable.variableCollectionId];
    for (const mode of collection.modes) {
      const modeName = mode.name.toLowerCase().replace(/\s+/g, '-');
      outputByMode[modeName] ??= {};
      const value = variable.valuesByMode[mode.modeId];
      outputByMode[modeName][variable.name] = {
        $value: resolveValue(value, variable.resolvedType),
        $type: mapType(variable.resolvedType),
        $description: variable.description,
      };
    }
  }

  // Write one DTCG token file per mode
  for (const [modeName, tokens] of Object.entries(outputByMode)) {
    const tree = buildTree(tokens); // turn "color/primary" into nested { color: { primary: {...} } }
    await fs.writeFile(
      `tokens/${modeName}.tokens.json`,
      JSON.stringify(tree, null, 2)
    );
  }
}

function resolveValue(value, type) {
  if (type === 'COLOR') {
    const { r, g, b, a } = value;
    // Convert 0-1 floats → hex
    const to256 = (n) => Math.round(n * 255);
    return `#${[to256(r), to256(g), to256(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')}${a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''}`;
  }
  if (type === 'FLOAT') return value;
  if (type === 'STRING') return value;
  if (type === 'BOOLEAN') return value;
  // VariableAlias — follow the id reference (advanced)
  return value;
}

function mapType(figmaType) {
  return {
    COLOR: 'color',
    FLOAT: 'number',
    STRING: 'string',
    BOOLEAN: 'boolean',
  }[figmaType];
}

function buildTree(flat) {
  const root = {};
  for (const [path, token] of Object.entries(flat)) {
    const parts = path.split('/');
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cursor[parts[i]] ??= {};
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = token;
  }
  return root;
}

pullVariables().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

This is ~60 lines of code. Runs in a GitHub Action. Outputs W3C DTCG-compliant JSON that Style Dictionary v4 reads natively.

**Verdict:** Use the READ endpoint directly if your team is small. Skip Tokens Studio plugin entirely. Write a ~60-line pull script.

Sources:
- [Figma REST API — Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [Figma REST API — Variables reference](https://developers.figma.com/docs/rest-api/variables/)
- [Figma Developer Docs — Rate Limits](https://developers.figma.com/docs/rest-api/rate-limits/)
- [Tony Ward — Syncing Figma Variables to CSS Variables](https://www.tonyward.dev/articles/figma-variables-to-css-variables)
- [Figma Forum — Variables API Enterprise restriction](https://forum.figma.com/suggest-a-feature-11/why-s-the-variables-api-only-available-on-enterprise-plans-36426)

---

### 1.4 Specify, Supernova, Knapsack — Enterprise Platforms

**Skip these for a 2-person team.** Summary for awareness:

| Platform | Pricing (2026) | Best for | Why not for us |
|---|---|---|---|
| **Specify** | Not publicly listed, sales-led | Agencies managing client design systems | Overkill, no public pricing, cold-call sales cycle |
| **Supernova** | $35/full seat/month (annual), Free tier for solo designers | Mid-to-large enterprises, 3+ brands, 500+ tokens | We have 1 brand, ~100 tokens per product |
| **Knapsack** | Annual contract, no public pricing, ACH only | Enterprises needing governance, approval workflows, documentation + tokens in one | Enterprise-grade governance is overkill |

All three are W3C DTCG-compliant, so migrating to them later is possible. Don't lock in now.

**One caveat:** Supernova has a free solo-designer tier. If you want their docs + tokens + components in one UI, it's worth a look. But the Pro tier ($35/seat/month) is where the automation lives, and that's $70/month for 2 people — better to spend that on Cursor or Linear.

Sources:
- [Supernova Pricing](https://www.supernova.io/pricing)
- [Knapsack Pricing](https://www.knapsack.cloud/pricing)
- [CSS Author — Design Token Management Tools 2025](https://cssauthor.com/design-token-management-tools/)

---

### 1.5 Figma Dev Mode + Code Connect

**What Figma Dev Mode gives natively (no setup):**
- Code snippets for any selected component (auto-generated CSS/iOS/Android)
- Measurements, colors, typography, spacing as copyable values
- Variable inspection — see which Figma Variable is bound to which property
- Export assets (SVG, PNG) with one click
- Dev Resources — link Figma components to GitHub PRs, Storybook, etc.
- Focus mode — hide layers not in the current viewport

**Code Connect (free until end of 2026, then pricing TBD):**

**What it is:** A CLI + React library that maps Figma components to their real code counterparts. When a developer selects a component in Dev Mode, instead of autogenerated JSX, they see the actual props API from your codebase.

**Setup:**

1. Install: `npm install -D @figma/code-connect`
2. Create `figma.config.json` at project root:

```json
{
  "codeConnect": {
    "include": ["src/**/*.figma.ts"],
    "label": "React",
    "language": "jsx",
    "parser": "react",
    "importPaths": {
      "src/components/*": "@/components/$1"
    }
  }
}
```

3. Write mapping files (`.figma.ts`) next to components:

```typescript
// src/components/Button/Button.figma.tsx
import { figma } from '@figma/code-connect';
import { Button } from './Button';

figma.connect(
  Button,
  'https://www.figma.com/design/abc123/MindShift?node-id=1-2',
  {
    props: {
      children: figma.string('Label'),
      variant: figma.enum('Variant', {
        Primary: 'primary',
        Ghost: 'ghost',
        Danger: 'danger', // (MindShift doesn't ship this — but shows API)
      }),
      disabled: figma.boolean('Disabled'),
      size: figma.enum('Size', {
        Small: 'sm',
        Medium: 'md',
        Large: 'lg',
      }),
    },
    example: ({ children, variant, disabled, size }) => (
      <Button variant={variant} disabled={disabled} size={size}>
        {children}
      </Button>
    ),
  }
);
```

4. Generate a Figma PAT with `Code Connect: Write` scope + `File content: Read` scope
5. Run `npx figma connect publish` — pushes the mappings to Figma
6. Developers on the design file now see real code snippets in Dev Mode

**What designers/developers actually see:**

Without Code Connect:
```jsx
// Auto-generated from Figma inspection — useless for your team
<div style={{ backgroundColor: '#7B72FF', padding: '8px 16px', borderRadius: '12px' }}>
  <span style={{ color: 'white' }}>Start session</span>
</div>
```

With Code Connect:
```jsx
// Actual component from your codebase
<Button variant="primary" size="md">Start session</Button>
```

**Pricing:**
- Code Connect is **free until end of 2026**, Figma has said nothing about future pricing.
- Requires Dev Mode seat (included in Pro plan at $12/editor/month).

**Verdict:** Set this up once for both products. The biggest value is for onboarding new engineers — they see real component APIs, not made-up JSX. Setup takes ~2 hours per product.

Sources:
- [Figma Dev Docs — Connecting React components](https://developers.figma.com/docs/code-connect/react/)
- [Figma Dev Docs — Quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/)
- [GitHub: figma/code-connect](https://github.com/figma/code-connect)
- [npm: @figma/code-connect](https://www.npmjs.com/package/@figma/code-connect)
- [Francesca Tabor — Figma Code Connect](https://www.francescatabor.com/articles/2026/3/31/figma-code-connect)

---

### 1.6 Tailwind Variants + Tailwind v4 @theme

**Tailwind v4's `@theme` directive** is the biggest shift since v3. Instead of writing `tailwind.config.js`, you declare tokens in CSS:

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.65 0.18 280);
  --color-teal: oklch(0.75 0.12 180);
  --color-gold: oklch(0.78 0.14 70);
  --color-surface: oklch(0.15 0.02 260);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
}
```

This generates utility classes automatically: `bg-primary`, `text-teal`, `rounded-md`, `p-md`.

**Why `@theme` works with Figma tokens pipeline:** Style Dictionary generates `:root { --color-primary: ...; }`, and you bridge it into `@theme` via `@theme inline { --color-primary: var(--color-primary); }`. The `inline` keyword makes Tailwind generate utilities without Tailwind owning the value.

**Tailwind Variants** is a separate library (not part of Tailwind) that adds typed variant APIs, useful for component composition:

```typescript
import { tv } from 'tailwind-variants';

export const button = tv({
  base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary',
  variants: {
    variant: {
      primary: 'bg-primary text-white hover:bg-primary/90',
      ghost: 'bg-transparent text-primary hover:bg-primary/10',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

// Usage
<button className={button({ variant: 'ghost', size: 'lg' })}>Start</button>
```

**Value for MindShift:** Tailwind Variants codifies the design system variants in one place. Combines well with shadcn/ui (which uses `cva`, a sibling library). For a 2-person team, `cva` is a simpler default — it comes for free if you use shadcn.

Sources:
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind docs — Theme variables](https://tailwindcss.com/docs/theme)
- [Tailwind Variants docs](https://www.tailwind-variants.org/)
- [Mavik Labs — Design Tokens Tailwind v4 2026](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026)

---

### 1.7 shadcn/ui token structure (the pragmatic standard)

shadcn/ui popularized the pattern most React teams use today. It's not a library — it's a set of copy-pasteable components + a CSS variable convention.

**Token structure:**

```css
/* src/index.css */
:root {
  /* Base tokens — bare HSL values (no hsl() wrapper) */
  --background: 0 0% 100%;
  --foreground: 222.2 47.4% 11.2%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 47.4% 11.2%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}

.dark {
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 1.2%;
  /* ... */
}
```

**Tailwind v3 config** bridges these to utilities:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
};
```

**Tailwind v4 equivalent** (CSS-first):

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --primary: 222.2 47.4% 11.2%;
}

.dark {
  --background: 224 71% 4%;
  --primary: 210 40% 98%;
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --radius-lg: var(--radius);
}
```

**Why bare HSL:** Because `bg-primary/50` (opacity modifier) requires Tailwind to inject the alpha: `hsl(var(--primary) / 0.5)`. If you store `hsl(222 47% 11%)` as the full value, the `/ 0.5` syntax breaks. Bare HSL is the only format that works. (Tailwind v4 also supports OKLCH and a newer syntax, but bare HSL remains the baseline.)

**Background/foreground convention:** Every color has a matching `-foreground` variant for text on that background. `bg-primary text-primary-foreground` always pairs correctly. Adopt this for MindShift.

**For MindShift Energy modes:** Extend the pattern with data attributes:

```css
:root {
  --bg: 228 24% 16%;
  --fg: 240 17% 93%;
}

[data-energy="full"] {
  --bg: 228 24% 16%;
  --fg: 240 17% 93%;
  --accent: 244 98% 72%;
}

[data-energy="mid"] {
  --bg: 228 24% 18%;
  --fg: 240 17% 90%;
  --accent: 244 88% 68%; /* slightly desaturated */
}

[data-energy="low"] {
  --bg: 228 20% 12%;     /* darker */
  --fg: 240 15% 85%;     /* softer */
  --accent: 178 50% 55%; /* teal instead of indigo — lower stimulation */
}
```

This cleanly maps to the `isLowEnergy` pattern already in the MindShift store.

Sources:
- [shadcn/ui docs — Theming](https://ui.shadcn.com/docs/theming)
- [BetterLink Blog — shadcn/ui CSS Variables Guide](https://eastondev.com/blog/en/posts/dev/20260326-shadcn-ui-theme-customization/)
- [Medium — shadcn UI Theming](https://medium.com/@enayetflweb/theming-in-shadcn-ui-customizing-your-design-with-css-variables-bb6927d2d66b)

---

## Section 2: How Top Teams Do It

### 2.1 Vercel (Geist Design System)

- Uses **semantic tokens** (`foreground`, `background`, `accent`) rather than raw colors.
- Geist is **not fully open source** — only the React component library portion.
- **Vercel's token philosophy:** fewer decisions, absolute consistency. Minimal border radius. Narrow palette. No rebranding, no multi-theme.
- No public info on their Figma-to-code pipeline; it's a closed internal workflow.

**Takeaway:** Vercel's minimalism is the lesson. Don't build multi-brand abstractions unless you have multiple brands.

### 2.2 Shopify (Polaris)

- Ships design tokens as an npm package: `@shopify/polaris-tokens`
- All CSS custom properties prefixed with `--p-` to avoid collisions (`--p-color-bg-surface`)
- Monorepo: `polaris-tokens` (tokens) + `polaris-react` (components) + `stylelint-polaris` (lint rules enforcing token usage)
- **The `polaris-tokens` package is now deprecated** as of the 2025 update — Shopify consolidated into a newer internal package. Public signal: the publicly maintained token approach has moved on.
- Used Style Dictionary under the hood for cross-platform output (web, iOS, Android, Rails Ruby gem).

**Takeaway:** The prefix convention (`--p-`) prevents conflicts if you merge design systems or ship components as an npm library. For MindShift consider `--ms-` and for VOLAURA `--vol-`. Even though it's internal, if you ever open source anything, prefix now saves pain later.

### 2.3 Linear (Orbiter Design System)

- Orbiter is Linear's internal design system — not public
- Built on **Radix UI primitives** + custom theme layer
- Interesting recent disclosure: Linear used **Claude Code** to build an internal color tool inside their dev toolbar, allowing token tweaks by OKLCH values. When they landed on a palette, they "copied the token values as JSON and imported them directly into Figma using a plugin."
- This is the **reverse direction** from most teams: code is the source of truth, Figma mirrors it.

**Takeaway:** For a 2-person team where engineering leads, code-first is valid. You can use Figma Variables purely for designer mockups and keep production tokens in your repo.

Sources:
- [Vercel Geist introduction](https://vercel.com/geist/introduction)
- [Vercel Geist breakdown](https://seedflip.co/blog/vercel-design-system)
- [Shopify polaris-tokens GitHub](https://github.com/Shopify/polaris-tokens)
- [Shopify polaris-tokens npm](https://www.npmjs.com/package/@shopify/polaris-tokens)
- [Linear — A calmer interface](https://linear.app/now/behind-the-latest-design-refresh)

---

## Section 3: Handling Energy Modes (MindShift-specific)

**Context:** MindShift already has an energy-adaptive UI. `isLowEnergy = energyLevel <= 2 || burnoutScore > 60` is the live signal in the store. CLAUDE.md Law #2 requires energy adaptation.

**Three ways to express Energy modes in CSS:**

### Approach A: Data attributes (recommended)

```css
:root {
  --color-bg: 228 24% 16%;
  --color-fg: 240 17% 93%;
  --color-accent: 244 98% 72%;
  --spacing-card-y: 16px;
}

[data-energy="mid"] {
  --color-accent: 244 88% 68%;
}

[data-energy="low"] {
  --color-bg: 228 20% 12%;
  --color-fg: 240 15% 85%;
  --color-accent: 178 50% 55%;
  --spacing-card-y: 24px; /* more breathing room */
}
```

```typescript
// Single useEffect in AppShell.tsx
useEffect(() => {
  document.documentElement.dataset.energy = isLowEnergy ? 'low' : 'full';
}, [isLowEnergy]);
```

**Pros:**
- One CSS file, zero JS work per component
- Changes propagate instantly on store update
- Tailwind `@theme inline` picks up the variables automatically
- Matches shadcn pattern — no bespoke wiring
- Works with `prefers-reduced-motion` media query combinations

**Cons:**
- Can't use `@media` query directly for things like brightness adjustments (have to handle in JS)

### Approach B: Class variants

```css
.energy-full { --color-accent: 244 98% 72%; }
.energy-mid  { --color-accent: 244 88% 68%; }
.energy-low  { --color-accent: 178 50% 55%; }
```

**Pros:** Same performance as data attributes.
**Cons:** Classes are a messier signal; they don't nest as cleanly for aria attributes. Prefer data attributes.

### Approach C: Separate CSS files with `@import`

```javascript
if (isLowEnergy) await import('./energy-low.css');
```

**Cons:** Flash of unstyled content, network waterfall, incompatible with SSR. Don't do this.

**Approach A is canonical.** The MindShift guardrails already use `[data-mode="calm"]` (Sprint 8), so this follows existing precedent.

**Figma Modes mapping:** If your Figma file has a "Energy" variable collection with Full/Mid/Low modes, your pull script from Section 1.3 outputs three DTCG files:
- `tokens/energy-full.tokens.json`
- `tokens/energy-mid.tokens.json`
- `tokens/energy-low.tokens.json`

Style Dictionary reads all three and emits one CSS file with `[data-energy="full"]`, `[data-energy="mid"]`, `[data-energy="low"]` blocks.

---

## Section 4: The Three Pipeline Approaches (Compared)

### Approach 1: "Scrappy" — Direct Figma API + Style Dictionary

**Pipeline:** Figma Variables → Node script (REST API) → DTCG JSON → Style Dictionary → CSS custom properties → Tailwind v4 `@theme inline`

**Stack:** `@figma/code-connect` (free) + `style-dictionary` (free) + Figma Pro ($12/editor)

**Best for:** 2-person teams, engineering-led, comfortable writing scripts

**Pros:**
- Zero paid tools (Figma Pro only)
- Full control over the pipeline
- No vendor lock-in
- ~100 lines of total code
- Works identically for MindShift and VOLAURA

**Cons:**
- You write and maintain the pull script
- You set up the GitHub Action
- Designers need to manually trigger pulls (or wait for scheduled run)

**Setup checklist:**
1. Create Figma Pro plan, generate PAT with `file_variables:read`
2. Write `scripts/pull-figma-variables.mjs` (Section 1.3)
3. Add `style-dictionary` config
4. Create `.github/workflows/sync-figma-tokens.yml` (see Section 5)
5. Bridge tokens in `src/index.css` with `@theme inline`
6. Install Code Connect, write `.figma.ts` mappings for core components

### Approach 2: "Assisted" — Tokens Studio + Style Dictionary

**Pipeline:** Figma Variables → Tokens Studio plugin (designer pushes) → GitHub PR → Style Dictionary (on CI) → CSS → Tailwind

**Stack:** Tokens Studio (free plugin) + `style-dictionary` (free) + Figma Pro

**Best for:** Teams where designers want push-button sync without asking devs

**Pros:**
- Designer-controlled (no dev intervention for token changes)
- Plugin handles W3C DTCG format conversion
- Automatic PR creation
- Multi-file sync (Pro tier only, €39/month+)

**Cons:**
- Third-party plugin introduces sync drift bugs (known issue)
- Free tier is single-file only
- Adds Tokens Studio as a vendor dependency
- Designers need to learn yet another tool

**Setup checklist:**
1. Install Tokens Studio plugin
2. Create `tokens.json` in repo root
3. Configure GitHub sync in plugin (PAT with repo access)
4. Add Style Dictionary on CI to process `tokens.json`
5. Same Tailwind bridging as Approach 1

### Approach 3: "Enterprise" — Supernova or similar

**Pipeline:** Figma Variables → Supernova UI → GitHub auto-PR → distributed to all platforms

**Stack:** Supernova ($35-70/month) + Figma Pro

**Best for:** Teams with 5+ engineers, 3+ brands, 500+ tokens, compliance needs

**Pros:**
- Full governance UI (approval workflows, audit logs)
- Documentation + tokens + components in one place
- Multi-platform output (iOS, Android, Flutter, web) out of box

**Cons:**
- $70+/month for 2 people
- Vendor lock-in
- Overkill for our scale
- Slow to set up

**Not recommended for us.**

---

## Section 5: Concrete Config Files

### 5.1 `scripts/pull-figma-variables.mjs`

See Section 1.3 for the full script. Here's the minimal version with Energy modes handling:

```javascript
// scripts/pull-figma-variables.mjs
import fs from 'node:fs/promises';

const { FIGMA_TOKEN, FIGMA_FILE_KEY } = process.env;
if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) {
  console.error('Missing FIGMA_TOKEN or FIGMA_FILE_KEY');
  process.exit(1);
}

async function main() {
  const res = await fetch(
    `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/variables/local`,
    { headers: { 'X-Figma-Token': FIGMA_TOKEN } }
  );
  if (!res.ok) throw new Error(`Figma API ${res.status}`);
  const { meta } = await res.json();

  const modeOutputs = {};
  for (const v of Object.values(meta.variables)) {
    const collection = meta.variableCollections[v.variableCollectionId];
    for (const mode of collection.modes) {
      const modeSlug = mode.name.toLowerCase().replace(/\s+/g, '-');
      modeOutputs[modeSlug] ??= {};
      const val = v.valuesByMode[mode.modeId];
      const resolved =
        v.resolvedType === 'COLOR'
          ? rgbaToHex(val)
          : val;
      setDeep(modeOutputs[modeSlug], v.name.split('/'), {
        $value: resolved,
        $type: v.resolvedType === 'COLOR' ? 'color' : 'number',
      });
    }
  }

  await fs.mkdir('tokens', { recursive: true });
  for (const [modeSlug, tree] of Object.entries(modeOutputs)) {
    await fs.writeFile(
      `tokens/${modeSlug}.tokens.json`,
      JSON.stringify(tree, null, 2)
    );
  }
  console.log(`Wrote ${Object.keys(modeOutputs).length} mode files to tokens/`);
}

function rgbaToHex({ r, g, b, a }) {
  const to256 = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${to256(r)}${to256(g)}${to256(b)}${a < 1 ? to256(a) : ''}`;
}

function setDeep(obj, path, value) {
  let cursor = obj;
  for (let i = 0; i < path.length - 1; i++) {
    cursor[path[i]] ??= {};
    cursor = cursor[path[i]];
  }
  cursor[path[path.length - 1]] = value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 5.2 `style-dictionary.config.mjs`

```javascript
// style-dictionary.config.mjs
import StyleDictionary from 'style-dictionary';

// Custom transform: HSL space-separated for Tailwind opacity modifiers
StyleDictionary.registerTransform({
  name: 'color/hsl-bare',
  type: 'value',
  transitive: true,
  filter: (token) => token.$type === 'color' || token.type === 'color',
  transform: (token) => {
    const hex = token.$value ?? token.value;
    const { h, s, l } = hexToHsl(hex);
    return `${h} ${s}% ${l}%`;
  },
});

// Custom format: wrap each mode in a data-attribute selector
StyleDictionary.registerFormat({
  name: 'css/mode-variables',
  format: ({ dictionary, options }) => {
    const selector = options.selector ?? ':root';
    const lines = dictionary.allTokens.map(
      (t) => `  --${t.name}: ${t.$value ?? t.value};`
    );
    return `${selector} {\n${lines.join('\n')}\n}`;
  },
});

// Helper
function hexToHsl(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h1 = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h1 = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h1 = (b - r) / d + 2; break;
      case b: h1 = (r - g) / d + 4; break;
    }
    h1 /= 6;
  }
  return {
    h: Math.round(h1 * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export default {
  source: ['tokens/**/*.tokens.json'],
  platforms: {
    'css-energy-full': {
      transforms: ['attribute/cti', 'name/kebab', 'color/hsl-bare'],
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'energy-full.css',
          format: 'css/mode-variables',
          filter: (token) => token.filePath.includes('energy-full'),
          options: { selector: ':root, [data-energy="full"]' },
        },
      ],
    },
    'css-energy-mid': {
      transforms: ['attribute/cti', 'name/kebab', 'color/hsl-bare'],
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'energy-mid.css',
          format: 'css/mode-variables',
          filter: (token) => token.filePath.includes('energy-mid'),
          options: { selector: '[data-energy="mid"]' },
        },
      ],
    },
    'css-energy-low': {
      transforms: ['attribute/cti', 'name/kebab', 'color/hsl-bare'],
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'energy-low.css',
          format: 'css/mode-variables',
          filter: (token) => token.filePath.includes('energy-low'),
          options: { selector: '[data-energy="low"]' },
        },
      ],
    },
  },
};
```

### 5.3 `src/index.css` (Tailwind v4)

```css
@import "tailwindcss";
@import "./styles/energy-full.css";
@import "./styles/energy-mid.css";
@import "./styles/energy-low.css";

@theme inline {
  --color-primary: hsl(var(--color-primary));
  --color-teal: hsl(var(--color-teal));
  --color-gold: hsl(var(--color-gold));
  --color-bg: hsl(var(--color-bg));
  --color-fg: hsl(var(--color-fg));
  --color-accent: hsl(var(--color-accent));
  --radius-md: var(--radius-md);
  --spacing-card: var(--spacing-card);
}
```

### 5.4 `.github/workflows/sync-figma-tokens.yml`

```yaml
name: Sync Figma Tokens

on:
  workflow_dispatch: # Manual trigger only
  schedule:
    - cron: '0 6 * * 1' # Every Monday 6am UTC (optional)

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Pull variables from Figma
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
          FIGMA_FILE_KEY: ${{ secrets.FIGMA_FILE_KEY }}
        run: node scripts/pull-figma-variables.mjs

      - name: Run Style Dictionary
        run: npx style-dictionary build

      - name: Check for changes
        id: changes
        run: |
          if [[ -n "$(git status --porcelain)" ]]; then
            echo "changed=true" >> $GITHUB_OUTPUT
          else
            echo "changed=false" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request
        if: steps.changes.outputs.changed == 'true'
        uses: peter-evans/create-pull-request@v6
        with:
          commit-message: "chore(tokens): sync Figma variables"
          title: "chore(tokens): Figma token sync"
          body: |
            Automated Figma token sync.

            Review the diff to confirm no ADHD-safety violations:
            - No red hues (0-15 / 345-360 range)
            - Palette matches guardrails.md Rule 1
          branch: auto/figma-token-sync
          base: main
```

### 5.5 `figma.config.json` (Code Connect)

```json
{
  "codeConnect": {
    "include": ["src/**/*.figma.tsx"],
    "label": "React + Tailwind",
    "language": "jsx",
    "parser": "react"
  }
}
```

### 5.6 Example Code Connect mapping for MindShift

```tsx
// src/shared/ui/Button.figma.tsx
import { figma } from '@figma/code-connect';
import { Button } from './Button';

figma.connect(
  Button,
  'https://www.figma.com/design/YOUR_FILE_KEY/MindShift?node-id=YOUR_BUTTON_NODE',
  {
    props: {
      children: figma.string('Label'),
      variant: figma.enum('Variant', {
        Primary: 'primary',
        Ghost: 'ghost',
        Outline: 'outline',
      }),
      size: figma.enum('Size', {
        Small: 'sm',
        Medium: 'md',
        Large: 'lg',
      }),
      disabled: figma.boolean('Disabled'),
      loading: figma.boolean('Loading'),
    },
    example: ({ children, variant, size, disabled, loading }) => (
      <Button variant={variant} size={size} disabled={disabled} loading={loading}>
        {children}
      </Button>
    ),
  }
);
```

---

## Section 6: Critical Gotchas

1. **Figma Variables WRITE is Enterprise only.** You cannot push code-changes back to Figma without an Enterprise plan (~$75/editor/month). Design stays as the writer, code as the reader. This is acceptable for most teams but rules out the "code is source of truth" pattern.

2. **Free Tokens Studio is single-file.** If your tokens tree grows past ~100 entries, the Pro tier becomes necessary for clean splits. Alternatively, skip the plugin and pull via REST API.

3. **Tailwind v4 is still fresh (released early 2025).** Plugins and tooling that worked on v3 may not have updated. Verify `sd-tailwindcss-transformer` compatibility before committing to it. (v2.1.0 supports Style Dictionary v4.)

4. **Color opacity modifiers break with full `hsl()` wrapping.** Always store colors as bare `H S% L%` values. This is the #1 gotcha shadcn users hit when migrating.

5. **Figma REST API rate limits are vague.** Professional plan rate limits are not published per-endpoint. Assume conservative limits (~200 calls/day safe). Cache responses if possible.

6. **Code Connect pricing is "free until end of 2026."** Plan for potential future cost. Figma has been vague. Don't build a mission-critical workflow solely around Code Connect.

7. **The W3C DTCG spec reached stable 2025.10 in October 2025.** Use `$value` and `$type` fields (with dollar sign prefix). Older examples without `$` are the legacy Tokens Studio format.

8. **Figma Variables don't support all token types yet.** No native support for typography groups (font + size + line-height + letter-spacing bundled), no native support for composite shadows. Use Tokens Studio if you need these, or stitch them manually in your build script.

9. **Style Dictionary v4 has breaking changes from v3.** The config format changed (`.mjs` or ESM), custom transform signatures changed. If you find tutorials from 2023, they're probably v3.

10. **Code Connect requires a Dev Mode seat.** A regular Editor seat is not enough. Costs an extra seat in Figma (Dev seat) unless your plan includes it.

---

## Section 7: The "Designer Changes Token in Figma → PR in GitHub" Workflow

**Three workflow options, ranked by setup effort:**

### Option 1: Manual (zero setup)

Designer changes variable in Figma. Designer messages engineer. Engineer runs `npm run sync:tokens` locally. Engineer commits and opens PR.

**Effort:** 0 minutes. **Maintenance:** 0. **Downside:** Requires engineer to be available.

### Option 2: Scheduled GitHub Action

`cron: '0 6 * * 1'` — runs every Monday morning, pulls latest Figma variables, opens PR if anything changed.

**Effort:** 2 hours. **Maintenance:** 5 min/quarter. **Downside:** Up to 7-day lag between Figma change and PR. Good for "batch weekly changes."

### Option 3: Manual trigger with Figma notification

`workflow_dispatch` — designer triggers the workflow from GitHub UI (or from a Slack command, or from a Figma plugin button). PR opens instantly.

**Effort:** 3 hours. **Maintenance:** 10 min/month. **Downside:** Designer needs GitHub access and 1-click training.

### Option 4: Tokens Studio Plugin (push-button from Figma)

Designer installs Tokens Studio, authenticates with GitHub PAT. "Push to GitHub" button in plugin. PR appears automatically.

**Effort:** 1 hour to set up, but adds third-party plugin as dependency. **Maintenance:** Deal with Tokens Studio bugs.

### Option 5: Webhook (not recommended for 2-person team)

Figma has no official variables-changed webhook. You'd have to write a polling daemon. Not worth it.

**Recommendation for MindShift/VOLAURA:** Start with Option 3 (manual trigger). Upgrade to Option 2 (scheduled) once tokens stabilize. Skip Option 4 unless designer really wants it.

---

## Section 8: Specific Recommendations for MindShift + VOLAURA

### For MindShift (React + Vite + Tailwind)

1. **Pick Approach 1** (Scrappy). You're already engineering-led and the codebase is lean.
2. **Stay on Tailwind v3 for now** if you're already there. The `bg-primary/50` pattern requires bare HSL either way. Migrate to v4 when you have a free week.
3. **Adopt the shadcn background/foreground convention** for every color. Fix gaps where colors don't pair with text-on-background.
4. **Map Energy modes to data attributes** — `[data-energy="full"]`, `[data-energy="mid"]`, `[data-energy="low"]`. Wire in AppShell (similar to existing `[data-mode="calm"]`).
5. **Set up Code Connect for top 10 components**: Button, TaskCard, EnergyPicker, BurnoutAlert, ArcTimer, Mascot, AppShell, BottomNav, Fab, AddTaskModal. Defer the rest.
6. **Create a `--ms-` prefix namespace** — it's free insurance against future conflicts.

### For VOLAURA (Next.js 14 + Tailwind)

1. **Same Approach 1**, same Style Dictionary config — literally copy the `scripts/` folder.
2. **Use a separate Figma file** for VOLAURA (different file key in GitHub Secrets).
3. **Fork the MindShift config,** adjust prefix to `--vol-`.
4. **Next.js 14 App Router tip:** Put the generated `tokens.css` files inside `src/app/` so they're picked up by the RSC layer. Import in `layout.tsx` once.
5. **SSR consideration:** When setting `data-energy` attribute, set it on `<html>` in a server component (if it comes from the session) or in a client component (if from local state). Avoid hydration flicker.

### Shared infra (the dream)

Once both products have the same pipeline, you can:
- Share a `@volaura/tokens` internal package (npm workspace)
- Unify primitive tokens (`color-primary-500`, `spacing-md`) across products
- Keep semantic tokens (`color-bg-surface`) product-specific
- Run both sync actions in the same GitHub org with shared secrets

**But:** don't build this shared package until both products are independently working. Premature abstraction kills velocity. Wait until you find yourself copy-pasting the third token change across repos.

---

## Section 9: Decision Matrix

| Question | Answer |
|---|---|
| Which tool owns design tokens as source of truth? | **Figma Variables** (with Pro plan) |
| How do tokens flow to code? | **Figma REST API (read) → Node script → DTCG JSON → Style Dictionary → CSS custom properties** |
| How do tokens plug into Tailwind? | **`@theme inline` with `hsl(var(--token))` bridging** |
| How are Figma Modes expressed in CSS? | **Data attributes (`[data-energy="low"]`)** |
| What triggers a sync? | **Manual GitHub Action (`workflow_dispatch`), optionally scheduled** |
| How do components map to code? | **Figma Code Connect, free until end of 2026** |
| Who writes the scripts? | **You (one-time ~100 lines)** |
| Cost per month (2 people)? | **$24** ($12/editor × 2 Figma Pro seats). Zero if you stick with Figma Starter. |
| Lock-in risk? | **Minimal.** All tools are open or standards-based (W3C DTCG, CSS custom properties) |
| Can we migrate to Supernova later? | **Yes** — W3C DTCG JSON is the bridge |

---

## Section 10: What to Do Next Week

If you want to start tomorrow, this is the order:

1. **Day 1 — Scaffolding (2-3 hours)**
   - Create a Figma Variables collection in MindShift's existing file (just colors for now)
   - Generate Figma PAT with `file_variables:read`
   - Add `FIGMA_TOKEN` + `FIGMA_FILE_KEY` to GitHub repo secrets
   - Write `scripts/pull-figma-variables.mjs` (copy from Section 5.1, ~60 lines)
   - Run it locally, verify `tokens/*.tokens.json` files are generated

2. **Day 2 — Style Dictionary (2-3 hours)**
   - `npm install -D style-dictionary@^4`
   - Write `style-dictionary.config.mjs` (copy from Section 5.2)
   - Run `npx style-dictionary build`, verify `src/styles/tokens.css` is generated
   - Update `src/index.css` with `@theme inline` bridge
   - Run the app, verify styles still work

3. **Day 3 — GitHub Action (1-2 hours)**
   - Create `.github/workflows/sync-figma-tokens.yml` (copy from Section 5.4)
   - Trigger manually from GitHub UI
   - Confirm PR opens with token changes
   - Review the bot's PR, merge if good

4. **Day 4 — Code Connect (2-3 hours)**
   - `npm install -D @figma/code-connect`
   - Write `figma.config.json` (copy from Section 5.5)
   - Pick 3 core components: Button, TaskCard, Mascot
   - Write `.figma.tsx` files for each
   - Run `npx figma connect publish`
   - Verify in Figma Dev Mode — select a component, see your code

5. **Day 5 — Replicate for VOLAURA (3-4 hours)**
   - Same steps, different file key and token prefix
   - Verify the second product works standalone (no shared code yet)

**Total effort: 10-15 hours across 5 days.** After this, tokens flow from Figma → CSS → Tailwind utilities with zero manual copying.

---

## Section 11: Sources (reading list)

- [Figma — REST API Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [Figma — REST API Variables reference types](https://developers.figma.com/docs/rest-api/variables/)
- [Figma — Rate Limits](https://developers.figma.com/docs/rest-api/rate-limits/)
- [Figma — Code Connect quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/)
- [Figma — Code Connect React docs](https://developers.figma.com/docs/code-connect/react/)
- [Figma — Variables GitHub Action example repo](https://github.com/figma/variables-github-action-example)
- [Figma — Pricing plans](https://www.figma.com/pricing/)
- [Figma — Modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Style Dictionary — docs](https://styledictionary.com/)
- [Style Dictionary — GitHub](https://github.com/style-dictionary/style-dictionary)
- [Style Dictionary — Formats reference](https://styledictionary.com/reference/hooks/formats/)
- [Tokens Studio — homepage](https://tokens.studio/)
- [Tokens Studio — pricing](https://tokens.studio/pricing)
- [Tokens Studio — GitHub Git Sync docs](https://docs.tokens.studio/token-storage/remote/sync-git-github)
- [Tokens Studio — figma-plugin GitHub](https://github.com/tokens-studio/figma-plugin)
- [Design Tokens Community Group — spec stable release](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/drafts/format/)
- [shadcn/ui — Theming](https://ui.shadcn.com/docs/theming)
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS — Theme variables](https://tailwindcss.com/docs/theme)
- [Tailwind Variants — docs](https://www.tailwind-variants.org/)
- [sd-tailwindcss-transformer — npm](https://www.npmjs.com/package/sd-tailwindcss-transformer)
- [Shopify — polaris-tokens GitHub](https://github.com/Shopify/polaris-tokens)
- [Vercel Geist — introduction](https://vercel.com/geist/introduction)
- [Linear — calmer interface design refresh](https://linear.app/now/behind-the-latest-design-refresh)
- [Supernova — pricing](https://www.supernova.io/pricing)
- [Knapsack — pricing](https://www.knapsack.cloud/pricing)
- [James Ives — Syncing Figma Variables with GitHub Actions](https://jamesiv.es/blog/frontend/design/2023/08/01/syncing-figma-variables-with-github-actions-and-styledictionary/)
- [Tony Ward — Syncing Figma Variables to CSS Variables](https://www.tonyward.dev/articles/figma-variables-to-css-variables)
- [Mavik Labs — Design Tokens Tailwind v4 2026](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026)
- [DEV Community — Style Dictionary + Tailwind integration](https://dev.to/philw_/using-style-dictionary-to-transform-tailwind-config-into-scss-variables-css-custom-properties-and-javascript-via-design-tokens-24h5)

---

**Research completed 2026-04-07. Confidence level: high.**
**Two-person, two-product pipeline is feasible in under 15 hours of setup for $0-24/month.**
