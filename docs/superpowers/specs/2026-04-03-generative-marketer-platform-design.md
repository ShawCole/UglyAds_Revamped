# UglyAds Revamped: Generative Marketer Platform

**Date:** 2026-04-03
**Status:** Approved
**First Client:** DentalCancun (veneers campaign)
**User:** Shaw Cole (power-user, not client-facing)

---

## 1. Purpose

Transform UglyAds Revamped from a single-ad composer into a campaign-level generative marketer that can produce all DSP + Meta ad creatives for a client in one session. First target: DentalCancun veneer ads across 9 sizes with 8 hook variations.

**Output target for DentalCancun:** 8 hooks x 9 sizes x 2 text variants (black/white) = **144 banner images** exported as a single ZIP.

---

## 2. Current State (what exists)

| Feature | Status |
|---------|--------|
| React 19 + Vite + TypeScript + Tailwind | Working |
| Gemini 2.5 Flash background generation | Working |
| 9 ad sizes (6 DSP + 3 Meta) | Working |
| Per-word text styling (bold/italic/underline/highlight/circle) | Working |
| Draggable/rotatable text blocks | Working |
| Single PNG export (html-to-image, 3x resolution) | Working |
| ZIP batch export (JSZip, all selected sizes) | Working |
| Brand Hub (bucket creation, activation) | Partial (no asset upload UI) |
| localStorage persistence | Working |
| Solid color backgrounds (black/white toggle) | Working |

**733 lines in App.tsx, 92 lines in geminiService.ts, 68 lines in types.ts.**

---

## 3. What We're Building (NOW)

### 3.1 Campaign Preset System

**New file: `campaignPresets.ts`**

A campaign preset bundles everything needed for one client's ad run:

```typescript
interface CampaignPreset {
  id: string;
  name: string;                    // "DentalCancun Veneers"
  hooks: HookPreset[];             // 8 hooks with text block configs
  backgroundPrompt: string;        // Base prompt for AI backgrounds
  backgroundStyle: string;         // "cancun-luxury-clinical"
  cta: CTAConfig;                  // "Book Free Consultation" button
  logo?: {                         // DentalCancun logo overlay (uses AssetBlock internally)
    assetUrl: string;              // Base64 or file URL
    corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    scale: number;
    opacity: number;
  };
  brandVoice?: BrandVoiceConfig;   // Writing rules, banned words
  targetSizes: AspectRatio[];      // Which sizes to generate
}

interface HookPreset {
  id: string;
  name: string;                    // "Fly In Friday"
  blocks: TextBlock[];             // Pre-configured text blocks
  backgroundPromptOverride?: string; // Hook-specific bg tweak
}

interface CTAConfig {
  text: string;                    // "Book Free Consultation"
  style: 'pill' | 'rect' | 'underline';
  color: string;
  position: 'bottom-center' | 'bottom-right';
}

interface LogoConfig {
  url: string;                     // Base64 or file URL
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  scale: number;
  opacity: number;
}

interface BrandVoiceConfig {
  bannedWords: string[];           // ["Grand Hyatt", "cheap", "discount"]
  requiredTone: string;            // "premium, boutique, specialist"
  product: string;                 // "Veneer smile design, Puerto Cancun"
}
```

**DentalCancun preset ships as the first built-in campaign.**

### 3.2 Background Generation Service (Refactored)

**Modify existing `geminiService.ts`** — add a `model` parameter instead of creating a separate service file.

```typescript
export const generateAdBackground = async (
  prompt: string,
  ratio: AspectRatio,
  referenceImage?: { data: string; mimeType: string },
  model: string = 'gemini-2.5-flash-image'  // NEW: parameterized model
): Promise<string>
```

- Nano Banana Pro uses the same `@google/genai` SDK with a different model ID
- UI source selector remains: `'ai' | 'upload' | 'solid'` (no rename — avoids breaking localStorage migration)
- A model picker dropdown within the `'ai'` source mode selects between available models
- Background prompt for DentalCancun: "Luxury dental clinic in Puerto Cancun Mexico, turquoise Caribbean water visible through floor-to-ceiling windows, modern minimalist clinical interior, soft natural lighting, premium medical equipment, clean white and teal color palette. NO TEXT NO WORDS NO LETTERS NO NUMBERS NO LOGOS."
- Per-hook prompt overrides where needed (e.g., airport proximity hook → add aerial Cancun view)

### 3.3 Auto Black + White Text Variants

Port from UglyAds Original. For every ad canvas:
- Render with **white text** (+ dark text shadow for readability on AI backgrounds)
- Render with **black text** (+ light text shadow)
- Both variants included in batch export automatically

**Implementation:** During export, for each size, render the canvas twice — once with all text blocks forced to `color: 'white'`, once forced to `color: 'black'`. This overrides individual block colors uniformly. The CTA block text color also inverts (white text on dark bg / dark text on white bg). No UI change needed; both variants go into the ZIP.

### 3.4 Hook Preset Panel

Replace the hardcoded "STOP / THE / SCROLL" initial blocks. New sidebar section:

**"Hooks" panel** — list of 8 hooks for the active campaign. Click a hook → text blocks update to that hook's content. Cycle through hooks to preview each one on the current background.

Locked hooks for DentalCancun Veneers:

| # | Hook | Text Blocks |
|---|------|------------|
| 1 | Fly In Friday | "FLY IN FRIDAY." / "GET YOUR DREAM SMILE." / "FLY HOME MONDAY." |
| 2 | One Weekend | "ONE WEEKEND IN CANCUN." / "A LIFETIME OF CONFIDENCE." |
| 3 | 3 Hours | "YOUR SMILE REDESIGNED" / "IN 3 HOURS." |
| 4 | 15 Minutes | "15 MINUTES FROM THE AIRPORT." / "ONE APPOINTMENT. DONE." |
| 5 | Full Timeline | "FRIDAY: CANCUN." / "SATURDAY: NEW SMILE." / "SUNDAY: BITE CHECK. MONDAY: HOME." |
| 6 | Too Busy | "TOO BUSY FOR A NEW SMILE?" / "YOU HAVE A WEEKEND." |
| 7 | One Visit | "SMILE DESIGN" / "IN ONE VISIT." |
| 8 | Fly Home Smiling | "FLY IN FRIDAY. 3 HOURS. NO PAIN." / "FLY HOME SMILING." |

Each hook also stores font sizes, positions, and rotation per-block so they're pre-tuned for readability.

**Per-Size Layout Adaptation (CRITICAL):**

A hook designed for 1080x1080 will not render legibly on 320x50. Three layout categories handle this:

| Category | Sizes | Strategy |
|----------|-------|----------|
| **Tall** | 9:16, 4:5, 300x600, 160x600 | Full layout — all text blocks at designed positions |
| **Square** | 1:1, 300x250 | Condensed — reduce font scale ~0.8x, tighten gaps |
| **Wide** | 728x90, 320x100, 320x50 | Single-line — collapse multi-block hooks into 1-2 blocks, reduce font dramatically |

Each `HookPreset` stores a `layoutOverrides` map:

```typescript
interface HookPreset {
  id: string;
  name: string;
  blocks: TextBlock[];                          // Default layout (for tall/square)
  layoutOverrides: {
    wide?: Partial<TextBlock>[];                // Collapsed layout for 728x90, 320x100, 320x50
    square?: Partial<TextBlock>[];              // Optional tweaks for 1:1, 300x250
  };
  backgroundPromptOverride?: string;
}
```

For wide banners, multi-line hooks collapse:
- "FLY IN FRIDAY. / GET YOUR DREAM SMILE. / FLY HOME MONDAY." → single block: "FLY IN FRIDAY. GET YOUR DREAM SMILE. FLY HOME MONDAY." at fontSize 24
- CTA shrinks to text-only (no pill button) at the right edge

An `applyLayoutForRatio(hook, ratio)` function selects the correct layout variant at render time.

### 3.5 CTA Button Overlay

A new block type: `CTABlock`. Renders as a styled button pinned to the bottom of the canvas.

```typescript
interface CTABlock {
  id: string;
  type: 'cta';
  text: string;           // "Book Free Consultation"
  style: 'pill' | 'rect';
  bgColor: string;        // "#4f46e5" or white
  textColor: string;
  x: number;
  y: number;
  fontSize: number;
}
```

For DentalCancun: "Book Free Consultation" pill button, white bg with dark text, positioned bottom-center at ~85% y.

**Block union update:** The existing `(TextBlock | AssetBlock)[]` union becomes `(TextBlock | AssetBlock | CTABlock)[]`. All block-handling code (rendering, dragging, export, serialization in localStorage) must handle the `'cta'` discriminant. CTA position uses the `position` enum field, not `x`/`y` — the `x`/`y` fields on CTABlock are removed in favor of the enum-based positioning from `CTAConfig`.

```typescript
interface CTABlock {
  id: string;
  type: 'cta';
  text: string;
  style: 'pill' | 'rect';
  bgColor: string;
  textColor: string;
  position: 'bottom-center' | 'bottom-right';
  fontSize: number;
}
```

### 3.6 Logo Overlay Layer

A new block type leveraging the existing `AssetBlock`:
- Upload DentalCancun logo once (into Brand Hub or directly)
- Pin to corner (default: top-right or bottom-left)
- Adjustable scale + opacity
- Since Nano Banana Pro blocks logos in generation, this overlay is the only way to get brand identity on the ad
- Uses the existing `AssetBlock` type with a `pinned` flag to lock position to a corner enum rather than free x/y dragging. No separate `LogoConfig` interface needed — the campaign preset stores the logo asset ID + corner + scale + opacity.

### 3.7 Campaign-Level Batch Export

The current ZIP export renders all selected sizes for ONE composition. We need:

**"Export Campaign" button** — for the active campaign, export:
1. All selected sizes (9)
2. All hooks (8)
3. Both text color variants (black + white)

Total: 9 x 8 x 2 = **144 PNGs** in one ZIP.

**ZIP structure:**
```
dentalcancun-veneers-2026-04-03/
  hook-1-fly-in-friday/
    Medium_Rectangle_300x250_white.png
    Medium_Rectangle_300x250_black.png
    Leaderboard_728x90_white.png
    Leaderboard_728x90_black.png
    ...
  hook-2-one-weekend/
    ...
  hook-8-fly-home-smiling/
    ...
```

**Implementation:**

The export uses an **offscreen rendering approach** to avoid fighting React's render cycle:

1. Create a detached DOM container (not in the React tree)
2. For each hook × size × color variant:
   - Apply layout via `applyLayoutForRatio(hook, ratio)`
   - Set background image + text color on the detached DOM
   - Render via `htmlToImage.toPng()` at appropriate pixelRatio (3x for DSP, 2x for Meta tall sizes to manage memory)
   - Add to JSZip
   - Discard the rendered canvas
3. Generate final ZIP blob and trigger download

**Progress UI:** A modal shows "Exporting hook 3/8, size 5/9..." with a progress bar. If a single render fails, log it and continue (don't abort the whole export).

**Memory management:** At pixelRatio 3, a 1080x1920 image consumes ~75MB as a canvas. Flush each image to JSZip immediately after capture, don't accumulate canvases. For the 3 Meta tall sizes, use pixelRatio 2 to stay under browser memory limits.

**Background generation count:** Backgrounds are generated **once per size** (9 API calls), then reused across all 8 hooks. The same Cancun luxury background works for every hook since the text is the differentiator.

### 3.8 Brand Voice Config (from Eddie pattern)

**New file: `brand-voice/dentalcancun.json`**

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

The `BrandVoiceConfig` interface matches this JSON schema:

```typescript
interface BrandVoiceConfig {
  name: string;
  product: string;
  positioning: string;
  bannedWords: string[];
  requiredTone: string;
  cta: string;
  whatsapp: string;
  keyProofPoints: string[];
}
```

This config is loaded when the DentalCancun campaign preset is active. It gates what can appear in ads and provides context for any future AI hook generation.

---

## 4. Architecture Changes

### File Structure (new/modified)

```
UglyAds_Revamped/
  App.tsx                    # MODIFY: Add campaign panel, hook cycling, CTA block, logo block, campaign export
  types.ts                   # MODIFY: Add CampaignPreset, HookPreset, CTABlock, LogoConfig, BrandVoiceConfig
  geminiService.ts           # MODIFY: Add model parameter for Nano Banana Pro support
  campaignPresets.ts          # NEW: Campaign preset definitions + DentalCancun preset
  campaignExporter.ts         # NEW: Campaign-level batch export (offscreen rendering, all hooks x sizes x variants)
  useLocalStorage.ts          # KEEP
  index.tsx                   # KEEP
  brand-voice/
    dentalcancun.json         # NEW: DentalCancun brand voice config
```

### Component Extraction from App.tsx

App.tsx is currently 733 lines doing everything. Extract into focused components:

```
components/
  Sidebar.tsx               # Left panel: source mode, sizes, composition, hooks
  AdCanvas.tsx              # The canvas renderer (already a nested component, extract)
  HookPanel.tsx             # Hook list + click-to-load
  BlockEditor.tsx           # Word-by-word styling, block properties
  CampaignBar.tsx           # Top bar: campaign selector, export campaign button
  BrandHub.tsx              # Brand Hub view (already a separate view, extract)
```

### State Changes

New state fields:
```typescript
const [activeCampaign, setActiveCampaign] = useLocalStorage<string>('uglyads_campaign', 'dentalcancun-veneers');
const [activeHookId, setActiveHookId] = useLocalStorage<string>('uglyads_hook', 'hook-1');
const [aiModel, setAiModel] = useLocalStorage<string>('uglyads_aiModel', 'gemini-2.5-flash-image');
// sourceMode stays as 'ai' | 'upload' | 'solid' — no breaking change
```

**State management for extracted components:** Introduce a `CampaignContext` provider to avoid prop-drilling the 15+ state variables through the new component tree. The context holds campaign state, active hook, blocks, backgrounds, and export functions. Individual components consume only what they need.

**`campaignExporter.ts` API surface:**
```typescript
export async function exportCampaign(
  preset: CampaignPreset,
  backgrounds: Partial<Record<AspectRatio, string>>,
  onProgress: (hook: number, size: number, total: number) => void
): Promise<Blob>  // Returns the ZIP blob
```

---

## 5. What We're NOT Building (LATER)

These patterns from Eddie Vibe Marketer are deferred:

| Feature | Why Later |
|---------|-----------|
| Titan copywriter DNA injection | Need hooks NOW, can add AI generation layer after |
| AI hook generation (Claude API) | Hooks already locked for DentalCancun; add for future clients |
| ICP multiplier | Single avatar for now; system is preset-ready for expansion |
| Quality gate (auto-QA) | Brand voice config handles banned words; automated QA is a polish feature |
| Performance feedback loop | Need ads running first; add after 2-week campaign data |
| Competitor ad research (Apify) | Not needed for first campaign |
| Browser Use auto-publishing | Manual upload to DSP + Meta is fine for now |
| Video production (HeyGen/Argil) | Display + static first |

---

## 6. DentalCancun Campaign Config

### Hooks (8 locked)
1. "Fly In Friday. Get Your Dream Smile. Fly Home Monday."
2. "One Weekend in Cancun. A Lifetime of Confidence."
3. "Your Smile Redesigned in 3 Hours."
4. "15 Minutes From the Airport. One Appointment. Done."
5. "Friday: Cancun. Saturday: New Smile. Sunday: Bite Check. Monday: Home."
6. "Too Busy for a New Smile? You Have a Weekend."
7. "Smile Design in One Visit."
8. "Fly In Friday. 3 Hours. No Pain. Fly Home Smiling."

### Target Sizes
**DSP Tier 1:** 300x250, 728x90, 320x50
**DSP Tier 2:** 160x600, 300x600, 320x100
**Meta:** 1080x1080 (1:1), 1080x1350 (4:5), 1080x1920 (9:16)

### Background Direction
"Cancun luxury with clinical precision" — turquoise Caribbean, modern clinic interior, premium medical aesthetic, soft natural lighting, clean white/teal palette. NO text/logos in generated backgrounds.

### CTA
"Book Free Consultation" — white pill button, bottom-center

### Brand Constraints
- NEVER reference Grand Hyatt
- NEVER use "cheap", "discount", "budget", "Tijuana"
- Positioning: boutique, specialist, premium-accessible
- Consultation-first (no pricing in ads)

---

## 7. Export Deliverable

One ZIP file containing:

```
dentalcancun-veneers-YYYY-MM-DD/
  hook-1-fly-in-friday/
    300x250_white.png, 300x250_black.png
    728x90_white.png, 728x90_black.png
    320x50_white.png, 320x50_black.png
    160x600_white.png, 160x600_black.png
    300x600_white.png, 300x600_black.png
    320x100_white.png, 320x100_black.png
    1080x1080_white.png, 1080x1080_black.png
    1080x1350_white.png, 1080x1350_black.png
    1080x1920_white.png, 1080x1920_black.png
  hook-2-one-weekend/
    ... (same 18 files)
  ...
  hook-8-fly-home-smiling/
    ... (same 18 files)
```

**Total: 144 PNGs in organized folders.**

---

## 8. Success Criteria

1. Shaw can open UglyAds Revamped, select DentalCancun campaign, and see all 8 hooks ready
2. One click generates Nano Banana Pro backgrounds for all selected sizes
3. Cycling through hooks updates the canvas instantly
4. "Export Campaign" produces a ZIP with 144 organized PNGs
5. Each PNG has: AI background + hook text (white or black) + CTA button + logo
6. Total time from open to ZIP: under 10 minutes (mostly waiting on AI background generation)
