# Generative Marketer Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform UglyAds Revamped into a campaign-level ad generator that produces 144 DentalCancun veneer banner images (8 hooks x 9 sizes x 2 color variants) in a single ZIP export.

**Architecture:** Campaign presets define hooks, backgrounds, CTA, logo, and brand rules. A refactored geminiService supports multiple AI models (including Nano Banana Pro). An offscreen campaign exporter iterates hooks x sizes x color variants without touching React state, rendering each combination into a JSZip bundle. Components are extracted from the monolithic App.tsx into focused files sharing state via CampaignContext.

**Tech Stack:** React 19, TypeScript 5, Vite 6, Tailwind (CDN), html-to-image, JSZip, @google/genai (Gemini / Nano Banana Pro)

**Spec:** `docs/superpowers/specs/2026-04-03-generative-marketer-platform-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `types.ts` | Extended with CampaignPreset, HookPreset, CTABlock, BrandVoiceConfig, layout types |
| `CampaignContext.tsx` | React context provider -- campaign state, hooks, blocks, backgrounds, export fns |
| `campaignPresets.ts` | Campaign preset definitions; ships DentalCancun veneers preset |
| `campaignExporter.ts` | Offscreen DOM rendering + JSZip bundling for full campaign export |
| `constants.ts` | Shared RATIO_CONFIGS, getRatioValue, hexToRgba extracted from App.tsx |
| `components/Sidebar.tsx` | Left panel: source mode, sizes, hooks, composition, block editor |
| `components/AdCanvas.tsx` | Canvas renderer extracted from App.tsx inner component |
| `components/HookPanel.tsx` | Hook list with click-to-load, active indicator |
| `components/BlockEditor.tsx` | Per-word styling, block properties panel |
| `components/CampaignBar.tsx` | Top bar: campaign selector, model picker, export campaign button |
| `components/ExportModal.tsx` | Progress modal for campaign export (hook N/8, size M/9) |
| `components/BrandHub.tsx` | Brand Hub view extracted from App.tsx |
| `brand-voice/dentalcancun.json` | DentalCancun brand voice config |

**Logo overlay:** Deferred until Franklin provides the DentalCancun logo asset. The preset ships with `logo: undefined`. The `buildAdElement` and `AdCanvas` both have logo rendering code ready -- once the asset URL is added to the preset, logos will render automatically. No separate task needed.

### Modified Files
| File | Changes |
|------|---------|
| `App.tsx` | Gut to ~100 lines -- wrap in CampaignContext, compose extracted components |
| `geminiService.ts` | Add model parameter to generateAdBackground() |
| `types.ts` | Add new interfaces (CampaignPreset, HookPreset, CTABlock, BrandVoiceConfig) |

---

## Task 1: Extend Types

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Add new interfaces to types.ts**

Add after the existing AdState interface at line 68:

```typescript
export interface BrandVoiceConfig {
  name: string;
  product: string;
  positioning: string;
  bannedWords: string[];
  requiredTone: string;
  cta: string;
  whatsapp: string;
  keyProofPoints: string[];
}

export interface CTABlock {
  id: string;
  type: 'cta';
  text: string;
  style: 'pill' | 'rect';
  bgColor: string;
  textColor: string;
  position: 'bottom-center' | 'bottom-right';
  fontSize: number;
}

export type Block = TextBlock | AssetBlock | CTABlock;

export type SizeCategory = 'tall' | 'square' | 'wide';

export interface HookPreset {
  id: string;
  name: string;
  blocks: TextBlock[];
  layoutOverrides: {
    wide?: Partial<TextBlock>[];
    square?: Partial<TextBlock>[];
  };
  backgroundPromptOverride?: string;
}

export interface CampaignPreset {
  id: string;
  name: string;
  hooks: HookPreset[];
  backgroundPrompt: string;
  cta: CTABlock;
  logo?: {
    assetUrl: string;
    corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    scale: number;
    opacity: number;
  };
  brandVoice?: BrandVoiceConfig;
  targetSizes: AspectRatio[];
}
```

- [ ] **Step 2: Update existing Block references**

Replace the existing `AdState.blocks` type from `(TextBlock | AssetBlock)[]` to use the new Block type alias:

```typescript
export interface AdState {
  backgrounds: Partial<Record<AspectRatio, string>>;
  uploadedAssets: UploadedAsset[];
  activeRatio: AspectRatio;
  blocks: Block[];
  selectedSizes: AspectRatio[];
  sourceMode: 'ai' | 'upload' | 'solid';
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/ShawCole/UglyAds_Revamped && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors from App.tsx block references -- those get fixed in Task 4)

- [ ] **Step 4: Commit**

```bash
git add types.ts
git commit -m "feat: add CampaignPreset, HookPreset, CTABlock, BrandVoiceConfig types"
```

---

## Task 2: DentalCancun Campaign Preset

**Files:**
- Create: `campaignPresets.ts`
- Create: `brand-voice/dentalcancun.json`

- [ ] **Step 1: Create brand voice config**

Write `brand-voice/dentalcancun.json`:

```json
{
  "name": "DentalCancun",
  "product": "Premium veneer smile design in Puerto Cancun, Mexico",
  "positioning": "Boutique specialist, consultation-first, NOT competing on price",
  "bannedWords": [
    "Grand Hyatt",
    "same building as Grand Hyatt",
    "cheap",
    "discount",
    "Tijuana",
    "budget"
  ],
  "requiredTone": "premium, confident, specialist, luxury-accessible",
  "cta": "Book Free Consultation",
  "whatsapp": "+52 984 114 5997",
  "keyProofPoints": [
    "25+ years experience",
    "Master's degree",
    "Gold-diamond, carbon diamond, zirconia materials",
    "Certificate of authenticity",
    "Puerto Cancun location",
    "15 min from airport",
    "Smile design in one appointment"
  ]
}
```

- [ ] **Step 2: Create campaignPresets.ts with helpers**

This file defines `getSizeCategory()`, `applyLayoutForRatio()`, and all 8 hook presets.

```typescript
import { AspectRatio, CampaignPreset, HookPreset, TextBlock, SizeCategory } from './types';

export const getSizeCategory = (ratio: AspectRatio): SizeCategory => {
  const wide: AspectRatio[] = ['728x90', '320x100', '320x50'];
  const square: AspectRatio[] = ['1:1', '300x250'];
  if (wide.includes(ratio)) return 'wide';
  if (square.includes(ratio)) return 'square';
  return 'tall';
};

export const applyLayoutForRatio = (hook: HookPreset, ratio: AspectRatio): TextBlock[] => {
  const category = getSizeCategory(ratio);
  if (category === 'tall') return hook.blocks;
  const overrides = hook.layoutOverrides[category];
  if (!overrides) return hook.blocks;

  // Wide overrides may have fewer blocks (collapsed)
  if (category === 'wide' && overrides.length < hook.blocks.length) {
    return overrides.map((override, i) => ({
      ...hook.blocks[0],  // Base from first block
      ...override,
    } as TextBlock));
  }

  return hook.blocks.map((block, i) => {
    const override = overrides[i];
    if (!override) return block;
    return { ...block, ...override };
  });
};
```

- [ ] **Step 3: Define all 8 hooks with layout overrides**

Each hook needs:
- `blocks`: Tall layout (default) -- 2 or 3 text blocks vertically stacked
- `layoutOverrides.wide`: Collapsed to 1 block for 728x90, 320x100, 320x50
- `layoutOverrides.square`: Font size tweaks for 1:1, 300x250

Hook content:

| # | Name | Block 1 | Block 2 | Block 3 |
|---|------|---------|---------|---------|
| 1 | Fly In Friday | "FLY IN FRIDAY." | "GET YOUR DREAM SMILE." | "FLY HOME MONDAY." |
| 2 | One Weekend | "ONE WEEKEND IN CANCUN." | "A LIFETIME OF CONFIDENCE." | -- |
| 3 | 3 Hours | "YOUR SMILE REDESIGNED" | "IN 3 HOURS." | -- |
| 4 | 15 Minutes | "15 MINUTES FROM THE AIRPORT." | "ONE APPOINTMENT. DONE." | -- |
| 5 | Full Timeline | "FRIDAY: CANCUN." | "SATURDAY: NEW SMILE." | "SUNDAY: BITE CHECK. MONDAY: HOME." |
| 6 | Too Busy | "TOO BUSY FOR A NEW SMILE?" | "YOU HAVE A WEEKEND." | -- |
| 7 | One Visit | "SMILE DESIGN" | "IN ONE VISIT." | -- |
| 8 | Fly Home Smiling | "FLY IN FRIDAY. 3 HOURS. NO PAIN." | "FLY HOME SMILING." | -- |

Layout rules:
- 2-block hooks: y positions at 40% and 65%
- 3-block hooks: y positions at 25%, 50%, 75%
- Wide overrides: collapse all blocks into 1 block at y: 50%, fontSize: 30-40 (remember: the `buildAdElement` clamps `scalingBase` at 90px minimum, so `fontSize: 35 * 0.12 * 90 / 100 = 3.78px` is the effective minimum for 320x50. Use fontSize ~35 for wide banners -- with 3x pixelRatio this renders at ~11px effective which is readable on the exported image)
- Square overrides: reduce fontSize by ~0.8x

**Concrete wide override template (Hook 2 "One Weekend" as example):**

```typescript
const hook2: HookPreset = {
  id: 'hook-2',
  name: 'One Weekend',
  blocks: [
    {
      id: 'h2-b1', type: 'text', x: 50, y: 40, fontSize: 80, color: 'white', rotation: 0,
      words: [
        { text: 'ONE', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: true, isCircled: false },
        { text: 'WEEKEND', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: true, isCircled: false },
        { text: 'IN', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false },
        { text: 'CANCUN.', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false },
      ],
      highlightColor: '#0d9488', highlightOpacity: 0.9,
    },
    {
      id: 'h2-b2', type: 'text', x: 50, y: 65, fontSize: 60, color: 'white', rotation: 0,
      words: [
        { text: 'A', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false },
        { text: 'LIFETIME', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false },
        { text: 'OF', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false },
        { text: 'CONFIDENCE.', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false },
      ],
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'h2-b1', type: 'text', x: 50, y: 50, fontSize: 35, color: 'white', rotation: 0,
        words: [
          { text: 'ONE WEEKEND IN CANCUN.', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: true, isCircled: false },
          { text: 'A LIFETIME OF CONFIDENCE.', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false },
        ],
        highlightColor: '#0d9488', highlightOpacity: 0.9,
      } as TextBlock,
    ],
    square: [
      { fontSize: 65 } as Partial<TextBlock>,
      { fontSize: 48 } as Partial<TextBlock>,
    ],
  },
};
```

All 8 hooks follow this same pattern. The implementer should use this as the template for hooks 1, 3-8.

Highlight color: `#0d9488` (teal) at 0.9 opacity for emphasized words.

Export the final preset:

```typescript
export const DENTAL_CANCUN_PRESET: CampaignPreset = {
  id: 'dentalcancun-veneers',
  name: 'DentalCancun Veneers',
  hooks: [hook1, hook2, hook3, hook4, hook5, hook6, hook7, hook8],
  backgroundPrompt: 'Luxury dental clinic in Puerto Cancun Mexico, turquoise Caribbean water visible through floor-to-ceiling windows, modern minimalist clinical interior, soft natural lighting, premium medical equipment, clean white and teal color palette. NO TEXT NO WORDS NO LETTERS NO NUMBERS NO LOGOS.',
  cta: {
    id: 'cta-1', type: 'cta', text: 'Book Free Consultation',
    style: 'pill', bgColor: '#ffffff', textColor: '#111827',
    position: 'bottom-center', fontSize: 16,
  },
  logo: undefined,
  brandVoice: undefined,
  targetSizes: ['300x250', '728x90', '320x50', '160x600', '300x600', '320x100', '1:1', '4:5', '9:16'],
};

export const CAMPAIGN_PRESETS: CampaignPreset[] = [DENTAL_CANCUN_PRESET];
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/ShawCole/UglyAds_Revamped && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add campaignPresets.ts brand-voice/dentalcancun.json
git commit -m "feat: add DentalCancun campaign preset with 8 hooks and layout overrides"
```

---

## Task 3: Refactor geminiService for Model Selection

**Files:**
- Modify: `geminiService.ts`

- [ ] **Step 1: Add model parameter and available models list**

At the top of the file, after imports, add:

```typescript
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash-exp', label: 'Nano Banana (Gemini 2.0)' },
] as const;
```

The exact Nano Banana Pro model ID may need updating once Shaw confirms. This provides the UI dropdown data.

Note on env vars: the current code reads `process.env.API_KEY` (set by Vite's `define` in `vite.config.ts` from `GEMINI_API_KEY`). The `.env` file should use `GEMINI_API_KEY=<key>`. No code change needed -- just ensure `.env` uses the right name.

Change the function signature at line 34 to add a `model` parameter:

```typescript
export const generateAdBackground = async (
  prompt: string,
  ratio: AspectRatio,
  referenceImage?: { data: string; mimeType: string },
  model: string = 'gemini-2.5-flash-image'
): Promise<string> => {
```

Change the API call at line 69 to use the parameter:

```typescript
    const response = await ai.models.generateContent({
      model,
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/ShawCole/UglyAds_Revamped && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add geminiService.ts
git commit -m "feat: parameterize AI model in geminiService for Nano Banana Pro support"
```

---

## Task 4: Create CampaignContext

**Files:**
- Create: `CampaignContext.tsx`

- [ ] **Step 1: Create the context provider**

This context holds all shared state previously local to App.tsx. Migrate all useState/useLocalStorage calls from App.tsx lines 89-117 here.

Key interface:

```typescript
interface CampaignContextType {
  // Campaign
  activeCampaign: CampaignPreset | null;
  setActiveCampaignId: (id: string) => void;
  activeHook: HookPreset | null;
  activeHookId: string;
  loadHook: (hookId: string) => void;
  getBlocksForRatio: (hook: HookPreset, ratio: AspectRatio) => TextBlock[];

  // Blocks
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  updateTextBlock: (id: string, updates: Partial<TextBlock>) => void;
  updateWordInBlock: (blockId: string, wordIndex: number, updates: Partial<WordStyle>) => void;
  addWordToBlock: (blockId: string) => void;
  removeWordFromBlock: (blockId: string, wordIndex: number) => void;
  removeBlock: (id: string) => void;

  // Background
  sourceMode: 'ai' | 'upload' | 'solid';
  setSourceMode: (mode: 'ai' | 'upload' | 'solid') => void;
  solidColor: 'black' | 'white';
  setSolidColor: (color: 'black' | 'white') => void;
  backgrounds: Partial<Record<AspectRatio, string>>;
  setBackgrounds: React.Dispatch<React.SetStateAction<Partial<Record<AspectRatio, string>>>>;
  aiModel: string;
  setAiModel: (model: string) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  isGenerating: boolean;
  generateImagesForSelected: () => Promise<void>;

  // Layout
  activeRatio: AspectRatio;
  setActiveRatio: (r: AspectRatio) => void;
  selectedSizes: AspectRatio[];
  setSelectedSizes: React.Dispatch<React.SetStateAction<AspectRatio[]>>;
  workspaceMode: 'single' | 'multi';
  setWorkspaceMode: (m: 'single' | 'multi') => void;

  // Gaps
  topGap: number;
  bottomGap: number;
  isLinked: boolean;
  handleTopGapChange: (val: number) => void;
  handleBottomGapChange: (val: number) => void;
  setIsLinked: (v: boolean) => void;
  handleMagicResize: () => void;

  // Drag
  isDragging: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (e: React.MouseEvent | React.TouchEvent, id: string) => void;

  // Assets and Brands
  uploadedAssets: UploadedAsset[];
  activeAssetId: string | null;
  setActiveAssetId: (id: string | null) => void;
  brands: BrandBucket[];
  setBrands: React.Dispatch<React.SetStateAction<BrandBucket[]>>;
  selectedBrandId: string | null;
  setSelectedBrandId: (id: string | null) => void;

  // Export
  isExporting: boolean;
  isBatchExporting: boolean;
  setIsBatchExporting: (v: boolean) => void;
  exportAsPng: () => Promise<void>;

  // View
  currentView: 'editor' | 'brandHub';
  setCurrentView: (v: 'editor' | 'brandHub') => void;
}
```

The `loadHook(hookId)` function:
1. Finds hook in active campaign
2. Calls `applyLayoutForRatio(hook, activeRatio)` to get adapted blocks
3. Sets blocks state to adapted blocks + campaign CTA block
4. Updates `activeHookId` in localStorage

The `getBlocksForRatio(hook, ratio)` function:
1. Calls `applyLayoutForRatio(hook, ratio)`
2. Returns the result (used by campaign exporter)

The `generateImagesForSelected()` function passes `aiModel` to `generateAdBackground()`.

When `activeCampaignId` changes, auto-set:
- `prompt` to campaign's `backgroundPrompt`
- `selectedSizes` to campaign's `targetSizes`
- Load the first hook

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/ShawCole/UglyAds_Revamped && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add CampaignContext.tsx
git commit -m "feat: create CampaignContext provider with campaign/hook state management"
```

---

## Task 5: Extract AdCanvas Component and Constants

**Files:**
- Create: `components/AdCanvas.tsx`
- Create: `constants.ts`

- [ ] **Step 1: Create constants.ts**

Extract from App.tsx lines 9-87: RatioConfig interface, RATIO_CONFIGS array, getRatioValue(), hexToRgba().

```typescript
import { AspectRatio } from './types';

export interface RatioConfig {
  value: AspectRatio;
  label: string;
  description: string;
  dimensions: string;
}

export const RATIO_CONFIGS: RatioConfig[] = [
  { value: '1:1', label: 'Square (Feed) 1:1', description: 'Meta Feed', dimensions: '1080 x 1080' },
  { value: '4:5', label: 'Portrait (4:5)', description: 'Meta Post', dimensions: '1080 x 1350' },
  { value: '9:16', label: 'Story / Reel (9:16)', description: 'Meta Stories', dimensions: '800 x 1422' },
  { value: '300x250', label: 'Medium Rectangle', description: 'DSP Tier 1', dimensions: '300 x 250' },
  { value: '728x90', label: 'Leaderboard', description: 'DSP Tier 1', dimensions: '728 x 90' },
  { value: '320x50', label: 'Small Mobile', description: 'DSP Tier 1', dimensions: '320 x 50' },
  { value: '160x600', label: 'Skyscraper', description: 'DSP Tier 2', dimensions: '160 x 600' },
  { value: '300x600', label: 'Half Page', description: 'DSP Tier 2', dimensions: '300 x 600' },
  { value: '320x100', label: 'Large Mobile', description: 'DSP Tier 2', dimensions: '320 x 100' },
];

export const getRatioValue = (ratio: AspectRatio): number => {
  const cfg = RATIO_CONFIGS.find(r => r.value === ratio);
  if (!cfg) return 1;
  const [w, h] = cfg.dimensions.split(' x ').map(Number);
  return w / h;
};

export const hexToRgba = (hex: string, opacity: number) => {
  let r = 0, g = 0, b = 0;
  const cleanHex = (hex || '#4f46e5').replace('#', '');
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
```

- [ ] **Step 2: Create components/AdCanvas.tsx**

Extract the AdCanvas inner component from App.tsx lines 326-408. Consumes context via `useCampaign()`.

Key additions:
- Accepts optional `blocksOverride` prop for export rendering
- Renders CTABlock type with pill/rect styling pinned to position enum
- Renders campaign logo if present

CTA rendering (added inside the blocks.map):

```typescript
if (block.type === 'cta') {
  const posStyles: Record<string, React.CSSProperties> = {
    'bottom-center': { position: 'absolute', bottom: '5%', left: '50%', transform: 'translateX(-50%)' },
    'bottom-right': { position: 'absolute', bottom: '5%', right: '5%' },
  };
  return (
    <div key={block.id} style={posStyles[block.position]}>
      <div style={{
        backgroundColor: block.bgColor,
        color: block.textColor,
        fontSize: `calc(${block.fontSize} * 0.12cqmin)`,
        padding: '0.3em 1.2em',
        borderRadius: block.style === 'pill' ? '9999px' : '0.3em',
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        whiteSpace: 'nowrap' as const,
      }}>
        {block.text}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
mkdir -p components
git add components/AdCanvas.tsx constants.ts
git commit -m "feat: extract AdCanvas component and shared constants"
```

---

## Task 6: Extract Sidebar Components

**Files:**
- Create: `components/HookPanel.tsx`
- Create: `components/BlockEditor.tsx`
- Create: `components/Sidebar.tsx`

- [ ] **Step 1: Create HookPanel**

List of hooks from active campaign. Click a hook to call `loadHook(hookId)`.

```typescript
import React from 'react';
import { useCampaign } from '../CampaignContext';

export const HookPanel: React.FC = () => {
  const { activeCampaign, activeHookId, loadHook } = useCampaign();
  if (!activeCampaign) return null;

  return (
    <section className="bg-neutral-50 p-6 rounded-[2.5rem] space-y-4 border border-neutral-100 shadow-sm">
      <h2 className="font-black text-neutral-800 text-xs uppercase tracking-widest">Hooks</h2>
      <div className="space-y-2">
        {activeCampaign.hooks.map(hook => (
          <button
            key={hook.id}
            onClick={() => loadHook(hook.id)}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all text-sm font-bold truncate ${
              activeHookId === hook.id
                ? 'bg-teal-50 border-teal-500 text-teal-700'
                : 'bg-white border-neutral-100 text-neutral-500 hover:border-teal-200'
            }`}
          >
            {hook.name}
          </button>
        ))}
      </div>
    </section>
  );
};
```

- [ ] **Step 2: Create BlockEditor**

Extract App.tsx lines 557-612 (word-by-word styling panel + block properties sliders). Consumes `blocks`, `selectedBlockId`, block update functions from context.

- [ ] **Step 3: Create Sidebar**

Compose all sidebar sections: source mode toggle, prompt textarea, size selector checkboxes, generate button, HookPanel, vertical layout controls (top/bottom gap + link + magic resize), composition block list, BlockEditor. This is App.tsx lines 463-622 reorganized to use context.

Key change: When campaign is active, the prompt textarea is pre-filled with `activeCampaign.backgroundPrompt` and the size selector defaults to `activeCampaign.targetSizes`.

- [ ] **Step 4: Commit**

```bash
git add components/HookPanel.tsx components/BlockEditor.tsx components/Sidebar.tsx
git commit -m "feat: extract Sidebar, HookPanel, and BlockEditor components"
```

---

## Task 7: Create CampaignBar and ExportModal

**Files:**
- Create: `components/CampaignBar.tsx`
- Create: `components/ExportModal.tsx`

- [ ] **Step 1: Create CampaignBar**

Top bar with campaign name, AI model dropdown, and "Export Campaign" button.

```typescript
import React from 'react';
import { useCampaign } from '../CampaignContext';
import { AVAILABLE_MODELS } from '../geminiService';

export const CampaignBar: React.FC<{ onExportCampaign: () => void }> = ({ onExportCampaign }) => {
  const { activeCampaign, aiModel, setAiModel, isBatchExporting } = useCampaign();

  return (
    <div className="h-14 bg-black flex items-center justify-between px-8 shrink-0 z-30">
      <span className="text-white font-black text-sm uppercase tracking-widest">
        {activeCampaign?.name || 'No Campaign'}
      </span>
      <div className="flex items-center gap-4">
        <select
          value={aiModel}
          onChange={e => setAiModel(e.target.value)}
          className="bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl border border-white/20 outline-none"
        >
          {AVAILABLE_MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <button
          onClick={onExportCampaign}
          disabled={isBatchExporting}
          className="bg-teal-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-teal-500 transition-all"
        >
          {isBatchExporting ? 'Exporting...' : 'Export Campaign'}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create ExportModal**

Progress modal shown during campaign export with progress bar.

```typescript
import React from 'react';

interface ExportModalProps {
  isOpen: boolean;
  currentHook: number;
  totalHooks: number;
  currentSize: number;
  totalSizes: number;
  totalImages: number;
  completedImages: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen, currentHook, totalHooks, currentSize, totalSizes, totalImages, completedImages
}) => {
  if (!isOpen) return null;
  const pct = totalImages > 0 ? Math.round((completedImages / totalImages) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-10 w-[420px] shadow-2xl text-center">
        <h2 className="text-2xl font-black mb-2">Exporting Campaign</h2>
        <p className="text-neutral-400 text-sm font-bold mb-6">
          Hook {currentHook}/{totalHooks} - Size {currentSize}/{totalSizes}
        </p>
        <div className="w-full bg-neutral-100 rounded-full h-3 mb-4">
          <div className="bg-teal-600 h-3 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
          {completedImages} / {totalImages} images ({pct}%)
        </p>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add components/CampaignBar.tsx components/ExportModal.tsx
git commit -m "feat: add CampaignBar with model picker and ExportModal with progress"
```

---

## Task 8: Campaign Exporter (Offscreen Rendering)

**Files:**
- Create: `campaignExporter.ts`

- [ ] **Step 1: Create the offscreen campaign export function**

Creates a detached DOM node, renders each hook x size x color variant, captures via html-to-image, bundles into ZIP.

```typescript
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { AspectRatio, CampaignPreset, TextBlock } from './types';
import { applyLayoutForRatio } from './campaignPresets';
import { RATIO_CONFIGS, getRatioValue, hexToRgba } from './constants';

interface ExportProgress {
  hookIndex: number;
  sizeIndex: number;
  totalHooks: number;
  totalSizes: number;
  totalImages: number;
  completedImages: number;
}

export async function exportCampaign(
  preset: CampaignPreset,
  backgrounds: Partial<Record<AspectRatio, string>>,
  onProgress: (progress: ExportProgress) => void
): Promise<Blob> {
  const zip = new JSZip();
  const sizes = preset.targetSizes;
  const hooks = preset.hooks;
  const colorVariants: Array<'white' | 'black'> = ['white', 'black'];
  const totalImages = hooks.length * sizes.length * colorVariants.length;
  let completed = 0;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  try {
    for (let hi = 0; hi < hooks.length; hi++) {
      const hook = hooks[hi];
      const hookFolder = `hook-${hi + 1}-${hook.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      for (let si = 0; si < sizes.length; si++) {
        const ratio = sizes[si];
        const config = RATIO_CONFIGS.find(r => r.value === ratio);
        const blocks = applyLayoutForRatio(hook, ratio);
        const bgUrl = backgrounds[ratio];
        const [w, h] = (config?.dimensions || '300 x 250').split(' x ').map(Number);
        const pixelRatio = h > 1000 ? 2 : 3;

        for (const textColor of colorVariants) {
          const el = buildAdElement(w, h, bgUrl, blocks, preset.cta, textColor, preset.logo);
          container.textContent = '';
          container.appendChild(el);

          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

          try {
            const dataUrl = await htmlToImage.toPng(el, {
              cacheBust: true, quality: 1, pixelRatio, width: w, height: h,
            });
            const base64 = dataUrl.split(',')[1];
            const filename = `${config?.dimensions.replace(/\s/g, '')}_${textColor}.png`;
            zip.file(`${hookFolder}/${filename}`, base64, { base64: true });
          } catch (err) {
            console.error(`Export failed: ${hookFolder}/${ratio}/${textColor}`, err);
          }

          completed++;
          onProgress({
            hookIndex: hi + 1, sizeIndex: si + 1,
            totalHooks: hooks.length, totalSizes: sizes.length,
            totalImages, completedImages: completed,
          });
        }
      }
    }
    return await zip.generateAsync({ type: 'blob' });
  } finally {
    document.body.removeChild(container);
  }
}
```

- [ ] **Step 2: Implement buildAdElement helper**

Creates a pure DOM element matching AdCanvas rendering. This is the highest-risk function -- it must visually match the React AdCanvas output using pure DOM.

**CRITICAL: Font scaling formula.** The React AdCanvas uses `calc(${block.fontSize} * 0.12cqmin)` which is a CSS container query unit. In the pure DOM exporter, we use a pixel-based equivalent: `block.fontSize * 0.12 * Math.min(width, height) / 100`. However, for wide banners (320x50 where min=50), this produces tiny text. The fix: use `Math.max(Math.min(width, height), 90)` as the base to clamp the minimum scaling dimension at 90px. This ensures wide banner text is at least readable.

**CTA adaptation for wide banners:** If `height <= 100` (wide banners), skip the CTA entirely -- there is no room for a button on a 50px or 90px tall banner. The hook text IS the ad in wide format.

Full implementation:

```typescript
function buildAdElement(
  width: number,
  height: number,
  bgUrl: string | undefined,
  blocks: TextBlock[],
  cta: CampaignPreset['cta'],
  textColor: 'white' | 'black',
  logo?: CampaignPreset['logo']
): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${width}px; height: ${height}px; position: relative; overflow: hidden;
    background-color: #111; background-image: ${bgUrl ? `url(${bgUrl})` : 'none'};
    background-size: cover; background-position: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  // Font scaling base -- clamp min dimension to 90px for wide banners
  const scalingBase = Math.max(Math.min(width, height), 90);

  for (const block of blocks) {
    const blockEl = document.createElement('div');
    const effectiveFontSize = block.fontSize * 0.12 * scalingBase / 100;
    blockEl.style.cssText = `
      position: absolute; left: ${block.x}%; top: ${block.y}%;
      transform: translate(-50%, -50%) rotate(${block.rotation}deg);
      white-space: nowrap; font-weight: 900;
      font-size: ${effectiveFontSize}px; color: ${textColor};
      text-shadow: ${textColor === 'white'
        ? '0 2px 8px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.4)'
        : '0 2px 8px rgba(255,255,255,0.4), 0 4px 20px rgba(255,255,255,0.2)'};
      padding: 0.1em;
    `;

    for (let i = 0; i < block.words.length; i++) {
      const w = block.words[i];
      const span = document.createElement('span');
      span.textContent = w.text;
      const hlColor = w.isHighlighted
        ? hexToRgba(block.highlightColor || '#0d9488', block.highlightOpacity ?? 0.9)
        : 'transparent';
      span.style.cssText = `
        display: inline-block;
        margin-right: ${i === block.words.length - 1 ? '0' : '0.2em'};
        font-weight: ${w.isBold ? '900' : '400'};
        font-style: ${w.isItalic ? 'italic' : 'normal'};
        text-decoration: ${w.isUnderlined ? 'underline' : 'none'};
        padding: ${w.isHighlighted ? '0.05em 0.15em' : '0'};
        background-color: ${hlColor};
        border: ${w.isCircled ? `0.05em solid ${textColor}` : 'none'};
        border-radius: ${w.isCircled ? '50%' : (w.isHighlighted ? '0.1em' : '0')};
      `;
      blockEl.appendChild(span);
    }
    el.appendChild(blockEl);
  }

  // CTA -- skip on wide banners (height <= 100px)
  if (cta && height > 100) {
    const ctaEl = document.createElement('div');
    const ctaTextColor = textColor === 'white' ? '#111827' : '#ffffff';
    const ctaBgColor = textColor === 'white' ? '#ffffff' : '#111827';
    const ctaFontSize = cta.fontSize * 0.12 * scalingBase / 100;
    ctaEl.style.cssText = `
      position: absolute; bottom: 5%; left: 50%; transform: translateX(-50%);
      background-color: ${ctaBgColor}; color: ${ctaTextColor};
      font-size: ${ctaFontSize}px; padding: 0.3em 1.2em;
      border-radius: ${cta.style === 'pill' ? '9999px' : '0.3em'};
      font-weight: 800; letter-spacing: 0.05em;
      text-transform: uppercase; white-space: nowrap;
    `;
    ctaEl.textContent = cta.text;
    el.appendChild(ctaEl);
  }

  // Logo -- deferred until Franklin provides asset (preset.logo is undefined for now)
  if (logo && logo.assetUrl) {
    const logoEl = document.createElement('img');
    logoEl.src = logo.assetUrl;
    const corners: Record<string, string> = {
      'top-left': 'top: 4%; left: 4%;',
      'top-right': 'top: 4%; right: 4%;',
      'bottom-left': 'bottom: 4%; left: 4%;',
      'bottom-right': 'bottom: 4%; right: 4%;',
    };
    logoEl.style.cssText = `
      position: absolute; ${corners[logo.corner] || corners['top-right']}
      width: ${logo.scale * 100}%; max-width: 25%; opacity: ${logo.opacity};
      object-fit: contain;
    `;
    el.appendChild(logoEl);
  }

  return el;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/ShawCole/UglyAds_Revamped && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add campaignExporter.ts
git commit -m "feat: add offscreen campaign exporter for batch 144-image ZIP generation"
```

---

## Task 9: Rewire App.tsx

**Files:**
- Modify: `App.tsx`
- Create: `components/BrandHub.tsx`

- [ ] **Step 1: Extract BrandHub**

Move App.tsx lines 412-458 (the brandHub view) into `components/BrandHub.tsx`. Consumes brands state from context.

- [ ] **Step 2: Replace App.tsx with composed components**

Gut the 733-line monolith to ~100 lines:

```typescript
import React, { useState } from 'react';
import { CampaignProvider, useCampaign } from './CampaignContext';
import { Sidebar } from './components/Sidebar';
import { AdCanvas } from './components/AdCanvas';
import { CampaignBar } from './components/CampaignBar';
import { ExportModal } from './components/ExportModal';
import { BrandHub } from './components/BrandHub';
import { exportCampaign } from './campaignExporter';
import { RATIO_CONFIGS } from './constants';

const AppInner: React.FC = () => {
  const ctx = useCampaign();
  const [exportProgress, setExportProgress] = useState<any>(null);

  const handleExportCampaign = async () => {
    if (!ctx.activeCampaign) return;

    // Validate backgrounds exist for all target sizes
    const missingSizes = ctx.activeCampaign.targetSizes.filter(s => !ctx.backgrounds[s]);
    if (missingSizes.length > 0 && ctx.sourceMode === 'ai') {
      alert(`Missing backgrounds for: ${missingSizes.join(', ')}. Generate backgrounds first.`);
      return;
    }

    ctx.setIsBatchExporting(true);
    setExportProgress({ hookIndex: 0, sizeIndex: 0, totalHooks: 0, totalSizes: 0, totalImages: 0, completedImages: 0 });

    try {
      const blob = await exportCampaign(ctx.activeCampaign, ctx.backgrounds, setExportProgress);
      const link = document.createElement('a');
      link.download = `${ctx.activeCampaign.id}-${Date.now()}.zip`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExportProgress(null);
      ctx.setIsBatchExporting(false);
    }
  };

  if (ctx.currentView === 'brandHub') return <BrandHub />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-50 font-sans">
      <CampaignBar onExportCampaign={handleExportCampaign} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative flex flex-col overflow-hidden bg-neutral-200/50">
          {/* Workspace mode toggle bar */}
          {/* Single: ratio nav + centered AdCanvas */}
          {/* Multi: grid of AdCanvas thumbnails for selected sizes */}
          {/* Tooltip system */}
        </main>
      </div>
      <ExportModal
        isOpen={!!exportProgress}
        currentHook={exportProgress?.hookIndex || 0}
        totalHooks={exportProgress?.totalHooks || 0}
        currentSize={exportProgress?.sizeIndex || 0}
        totalSizes={exportProgress?.totalSizes || 0}
        totalImages={exportProgress?.totalImages || 0}
        completedImages={exportProgress?.completedImages || 0}
      />
    </div>
  );
};

const App: React.FC = () => (
  <CampaignProvider>
    <AppInner />
  </CampaignProvider>
);

export default App;
```

The main area preserves:
- Workspace mode toggle (single/multi)
- Single mode: ratio nav bar + centered AdCanvas
- Multi mode: grid of AdCanvas thumbnails for selected sizes
- Tooltip hover system for ratio buttons

These come from App.tsx lines 624-699 and use the extracted AdCanvas + constants.

- [ ] **Step 3: Move inline styles to style block**

Keep the existing CSS keyframes and grid background from App.tsx lines 701-728. Add CTA animation:

```css
.cta-pill {
  animation: cta-fade-in 0.4s ease both;
}
@keyframes cta-fade-in {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

- [ ] **Step 4: Verify the app compiles and renders**

Run: `cd /Users/ShawCole/UglyAds_Revamped && npm run dev`

Open http://localhost:3000 and verify:
- DentalCancun campaign name in top bar
- Hook panel lists 8 hooks
- Clicking a hook updates canvas text
- Source mode / size selector works
- Single Ad / Multi-View works
- CTA button renders at bottom of canvas

- [ ] **Step 5: Commit**

```bash
git add App.tsx components/BrandHub.tsx
git commit -m "feat: rewire App.tsx to use CampaignContext and extracted components"
```

---

## Task 10: Integration Test -- Full Campaign Export

**Files:**
- No new files -- manual testing

- [ ] **Step 1: Install dependencies and start dev server**

```bash
cd /Users/ShawCole/UglyAds_Revamped
npm install
```

Create `.env` with API key:
```
GEMINI_API_KEY=<key>
```

```bash
npm run dev
```

- [ ] **Step 2: Verify hook cycling**

Open http://localhost:3000. Click through all 8 hooks. Verify:
- Canvas text updates for each hook
- Text is readable (not clipped/overlapping)
- CTA button appears at bottom

- [ ] **Step 3: Generate backgrounds**

1. Set source mode to AI
2. Verify all 9 target sizes are selected
3. Background prompt should be pre-filled with DentalCancun prompt
4. Click Generate Variations
5. Wait for 9 backgrounds to generate
6. Switch to Multi-View -- verify backgrounds at all sizes

- [ ] **Step 4: Test wide banner layout**

Switch to 728x90 (Leaderboard). Verify:
- Hook text collapsed to single line
- Font small enough to fit
- CTA visible or gracefully hidden

Repeat for 320x50 and 320x100.

- [ ] **Step 5: Export Campaign**

Click "Export Campaign" in top bar. Verify:
- Progress modal appears
- Export completes without console errors
- ZIP downloads
- Open ZIP: 8 hook folders x 18 PNGs each = 144 files
- Spot-check white and black text variants
- Spot-check wide banners have collapsed text
- Spot-check CTA appears on all variants

- [ ] **Step 6: Commit final working state**

```bash
git add -A
git commit -m "feat: complete generative marketer platform -- DentalCancun campaign ready"
```

---

## Task Summary

| Task | What | Files | Est. |
|------|------|-------|------|
| 1 | Extend types | types.ts | 5 min |
| 2 | DentalCancun preset + brand voice | campaignPresets.ts, brand-voice/dentalcancun.json | 15 min |
| 3 | Refactor geminiService | geminiService.ts | 3 min |
| 4 | CampaignContext provider | CampaignContext.tsx | 20 min |
| 5 | Extract AdCanvas + constants | components/AdCanvas.tsx, constants.ts | 10 min |
| 6 | Extract Sidebar components | components/HookPanel.tsx, BlockEditor.tsx, Sidebar.tsx | 15 min |
| 7 | CampaignBar + ExportModal | components/CampaignBar.tsx, ExportModal.tsx | 10 min |
| 8 | Campaign exporter | campaignExporter.ts | 20 min |
| 9 | Rewire App.tsx + BrandHub | App.tsx, components/BrandHub.tsx | 15 min |
| 10 | Integration test | Manual | 15 min |
