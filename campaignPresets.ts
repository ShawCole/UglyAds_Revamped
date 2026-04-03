import { AspectRatio, CampaignPreset, HookPreset, TextBlock, SizeCategory } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getSizeCategory(ratio: AspectRatio): SizeCategory {
  const wideRatios: AspectRatio[] = ['728x90', '320x100', '320x50'];
  const squareRatios: AspectRatio[] = ['1:1', '300x250'];
  if (wideRatios.includes(ratio)) return 'wide';
  if (squareRatios.includes(ratio)) return 'square';
  return 'tall';
}

export function applyLayoutForRatio(hook: HookPreset, ratio: AspectRatio): TextBlock[] {
  const category = getSizeCategory(ratio);
  if (category === 'tall') {
    return hook.blocks;
  }
  const overrides = hook.layoutOverrides[category];
  if (!overrides || overrides.length === 0) {
    return hook.blocks;
  }
  if (category === 'wide' && overrides.length < hook.blocks.length) {
    // Collapse: map overrides using first block as base
    return overrides.map((override, i) => ({
      ...hook.blocks[0],
      id: `${hook.blocks[0].id}-wide-${i}`,
      ...override,
    } as TextBlock));
  }
  // Merge overrides onto blocks
  return hook.blocks.map((block, i) => {
    const override = overrides[i];
    if (!override) return block;
    return { ...block, ...override } as TextBlock;
  });
}

// ─── Word builder helpers ───────────────────────────────────────────────────

function w(text: string, highlighted = false) {
  return {
    text,
    isBold: true,
    isItalic: false,
    isUnderlined: false,
    isHighlighted: highlighted,
    isCircled: false,
  };
}

const TEAL = '#0d9488';
const TEAL_OPACITY = 0.9;

// ─── Hook 1: Fly In Friday ──────────────────────────────────────────────────

const hook1: HookPreset = {
  id: 'hook-1',
  name: 'Fly In Friday',
  blocks: [
    {
      id: 'hook-1-block-1',
      type: 'text',
      words: [w('FLY', true), w('IN', true), w('FRIDAY.', true)],
      x: 50,
      y: 25,
      fontSize: 90,
      color: 'white',
      rotation: 0,
      highlightColor: TEAL,
      highlightOpacity: TEAL_OPACITY,
    },
    {
      id: 'hook-1-block-2',
      type: 'text',
      words: [w('GET'), w('YOUR'), w('DREAM'), w('SMILE.')],
      x: 50,
      y: 50,
      fontSize: 60,
      color: 'white',
      rotation: 0,
    },
    {
      id: 'hook-1-block-3',
      type: 'text',
      words: [w('FLY', true), w('HOME', true), w('MONDAY.', true)],
      x: 50,
      y: 75,
      fontSize: 90,
      color: 'white',
      rotation: 0,
      highlightColor: TEAL,
      highlightOpacity: TEAL_OPACITY,
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'hook-1-block-1-wide-0',
        type: 'text',
        words: [w('FLY IN FRIDAY.', true), w('GET YOUR DREAM SMILE.'), w('FLY HOME MONDAY.', true)],
        x: 50,
        y: 50,
        fontSize: 35,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
    square: [
      {
        id: 'hook-1-block-1-sq',
        type: 'text',
        words: [w('FLY', true), w('IN', true), w('FRIDAY.', true)],
        x: 50,
        y: 25,
        fontSize: 72,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
      {
        id: 'hook-1-block-2-sq',
        type: 'text',
        words: [w('GET'), w('YOUR'), w('DREAM'), w('SMILE.')],
        x: 50,
        y: 50,
        fontSize: 48,
        color: 'white',
        rotation: 0,
      } as TextBlock,
      {
        id: 'hook-1-block-3-sq',
        type: 'text',
        words: [w('FLY', true), w('HOME', true), w('MONDAY.', true)],
        x: 50,
        y: 75,
        fontSize: 72,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
  },
};

// ─── Hook 2: One Weekend ────────────────────────────────────────────────────

const hook2: HookPreset = {
  id: 'hook-2',
  name: 'One Weekend',
  blocks: [
    {
      id: 'hook-2-block-1',
      type: 'text',
      words: [w('ONE', true), w('WEEKEND', true), w('IN'), w('CANCUN.')],
      x: 50,
      y: 40,
      fontSize: 80,
      color: 'white',
      rotation: 0,
      highlightColor: TEAL,
      highlightOpacity: TEAL_OPACITY,
    },
    {
      id: 'hook-2-block-2',
      type: 'text',
      words: [w('A'), w('LIFETIME'), w('OF'), w('CONFIDENCE.')],
      x: 50,
      y: 65,
      fontSize: 60,
      color: 'white',
      rotation: 0,
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'hook-2-block-1-wide-0',
        type: 'text',
        words: [w('ONE WEEKEND IN CANCUN.', true), w('A LIFETIME OF CONFIDENCE.')],
        x: 50,
        y: 50,
        fontSize: 35,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
    square: [
      {
        id: 'hook-2-block-1-sq',
        type: 'text',
        words: [w('ONE', true), w('WEEKEND', true), w('IN'), w('CANCUN.')],
        x: 50,
        y: 40,
        fontSize: 64,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
      {
        id: 'hook-2-block-2-sq',
        type: 'text',
        words: [w('A'), w('LIFETIME'), w('OF'), w('CONFIDENCE.')],
        x: 50,
        y: 65,
        fontSize: 48,
        color: 'white',
        rotation: 0,
      } as TextBlock,
    ],
  },
};

// ─── Hook 3: 3 Hours ────────────────────────────────────────────────────────

const hook3: HookPreset = {
  id: 'hook-3',
  name: '3 Hours',
  blocks: [
    {
      id: 'hook-3-block-1',
      type: 'text',
      words: [w('YOUR'), w('SMILE'), w('REDESIGNED')],
      x: 50,
      y: 40,
      fontSize: 80,
      color: 'white',
      rotation: 0,
    },
    {
      id: 'hook-3-block-2',
      type: 'text',
      words: [w('IN', true), w('3', true), w('HOURS.', true)],
      x: 50,
      y: 65,
      fontSize: 60,
      color: 'white',
      rotation: 0,
      highlightColor: TEAL,
      highlightOpacity: TEAL_OPACITY,
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'hook-3-block-1-wide-0',
        type: 'text',
        words: [w('YOUR SMILE REDESIGNED'), w('IN 3 HOURS.', true)],
        x: 50,
        y: 50,
        fontSize: 35,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
    square: [
      {
        id: 'hook-3-block-1-sq',
        type: 'text',
        words: [w('YOUR'), w('SMILE'), w('REDESIGNED')],
        x: 50,
        y: 40,
        fontSize: 64,
        color: 'white',
        rotation: 0,
      } as TextBlock,
      {
        id: 'hook-3-block-2-sq',
        type: 'text',
        words: [w('IN', true), w('3', true), w('HOURS.', true)],
        x: 50,
        y: 65,
        fontSize: 48,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
  },
};

// ─── Hook 4: 15 Minutes ─────────────────────────────────────────────────────

const hook4: HookPreset = {
  id: 'hook-4',
  name: '15 Minutes',
  blocks: [
    {
      id: 'hook-4-block-1',
      type: 'text',
      words: [w('15'), w('MINUTES'), w('FROM'), w('THE'), w('AIRPORT.')],
      x: 50,
      y: 40,
      fontSize: 80,
      color: 'white',
      rotation: 0,
    },
    {
      id: 'hook-4-block-2',
      type: 'text',
      words: [w('ONE', true), w('APPOINTMENT.', true), w('DONE.', true)],
      x: 50,
      y: 65,
      fontSize: 60,
      color: 'white',
      rotation: 0,
      highlightColor: TEAL,
      highlightOpacity: TEAL_OPACITY,
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'hook-4-block-1-wide-0',
        type: 'text',
        words: [w('15 MINUTES FROM THE AIRPORT.'), w('ONE APPOINTMENT. DONE.', true)],
        x: 50,
        y: 50,
        fontSize: 35,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
    square: [
      {
        id: 'hook-4-block-1-sq',
        type: 'text',
        words: [w('15'), w('MINUTES'), w('FROM'), w('THE'), w('AIRPORT.')],
        x: 50,
        y: 40,
        fontSize: 64,
        color: 'white',
        rotation: 0,
      } as TextBlock,
      {
        id: 'hook-4-block-2-sq',
        type: 'text',
        words: [w('ONE', true), w('APPOINTMENT.', true), w('DONE.', true)],
        x: 50,
        y: 65,
        fontSize: 48,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
  },
};

// ─── Hook 5: Full Timeline ──────────────────────────────────────────────────

const hook5: HookPreset = {
  id: 'hook-5',
  name: 'Full Timeline',
  blocks: [
    {
      id: 'hook-5-block-1',
      type: 'text',
      words: [w('FRIDAY:'), w('CANCUN.')],
      x: 50,
      y: 25,
      fontSize: 90,
      color: 'white',
      rotation: 0,
    },
    {
      id: 'hook-5-block-2',
      type: 'text',
      words: [w('SATURDAY:'), w('NEW'), w('SMILE.')],
      x: 50,
      y: 50,
      fontSize: 60,
      color: 'white',
      rotation: 0,
    },
    {
      id: 'hook-5-block-3',
      type: 'text',
      words: [w('SUNDAY:'), w('BITE'), w('CHECK.'), w('MONDAY:'), w('HOME.')],
      x: 50,
      y: 75,
      fontSize: 90,
      color: 'white',
      rotation: 0,
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'hook-5-block-1-wide-0',
        type: 'text',
        words: [w('FRIDAY: CANCUN.'), w('SATURDAY: NEW SMILE.'), w('SUNDAY: BITE CHECK. MONDAY: HOME.')],
        x: 50,
        y: 50,
        fontSize: 35,
        color: 'white',
        rotation: 0,
      } as TextBlock,
    ],
    square: [
      {
        id: 'hook-5-block-1-sq',
        type: 'text',
        words: [w('FRIDAY:'), w('CANCUN.')],
        x: 50,
        y: 25,
        fontSize: 72,
        color: 'white',
        rotation: 0,
      } as TextBlock,
      {
        id: 'hook-5-block-2-sq',
        type: 'text',
        words: [w('SATURDAY:'), w('NEW'), w('SMILE.')],
        x: 50,
        y: 50,
        fontSize: 48,
        color: 'white',
        rotation: 0,
      } as TextBlock,
      {
        id: 'hook-5-block-3-sq',
        type: 'text',
        words: [w('SUNDAY:'), w('BITE'), w('CHECK.'), w('MONDAY:'), w('HOME.')],
        x: 50,
        y: 75,
        fontSize: 72,
        color: 'white',
        rotation: 0,
      } as TextBlock,
    ],
  },
};

// ─── Hook 6: Too Busy ────────────────────────────────────────────────────────

const hook6: HookPreset = {
  id: 'hook-6',
  name: 'Too Busy',
  blocks: [
    {
      id: 'hook-6-block-1',
      type: 'text',
      words: [w('TOO'), w('BUSY'), w('FOR'), w('A'), w('NEW'), w('SMILE?')],
      x: 50,
      y: 40,
      fontSize: 80,
      color: 'white',
      rotation: 0,
    },
    {
      id: 'hook-6-block-2',
      type: 'text',
      words: [w('YOU', true), w('HAVE', true), w('A', true), w('WEEKEND.', true)],
      x: 50,
      y: 65,
      fontSize: 60,
      color: 'white',
      rotation: 0,
      highlightColor: TEAL,
      highlightOpacity: TEAL_OPACITY,
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'hook-6-block-1-wide-0',
        type: 'text',
        words: [w('TOO BUSY FOR A NEW SMILE?'), w('YOU HAVE A WEEKEND.', true)],
        x: 50,
        y: 50,
        fontSize: 35,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
    square: [
      {
        id: 'hook-6-block-1-sq',
        type: 'text',
        words: [w('TOO'), w('BUSY'), w('FOR'), w('A'), w('NEW'), w('SMILE?')],
        x: 50,
        y: 40,
        fontSize: 64,
        color: 'white',
        rotation: 0,
      } as TextBlock,
      {
        id: 'hook-6-block-2-sq',
        type: 'text',
        words: [w('YOU', true), w('HAVE', true), w('A', true), w('WEEKEND.', true)],
        x: 50,
        y: 65,
        fontSize: 48,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
  },
};

// ─── Hook 7: One Visit ──────────────────────────────────────────────────────

const hook7: HookPreset = {
  id: 'hook-7',
  name: 'One Visit',
  blocks: [
    {
      id: 'hook-7-block-1',
      type: 'text',
      words: [w('SMILE', true), w('DESIGN', true)],
      x: 50,
      y: 40,
      fontSize: 80,
      color: 'white',
      rotation: 0,
      highlightColor: TEAL,
      highlightOpacity: TEAL_OPACITY,
    },
    {
      id: 'hook-7-block-2',
      type: 'text',
      words: [w('IN'), w('ONE'), w('VISIT.')],
      x: 50,
      y: 65,
      fontSize: 60,
      color: 'white',
      rotation: 0,
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'hook-7-block-1-wide-0',
        type: 'text',
        words: [w('SMILE DESIGN', true), w('IN ONE VISIT.')],
        x: 50,
        y: 50,
        fontSize: 35,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
    square: [
      {
        id: 'hook-7-block-1-sq',
        type: 'text',
        words: [w('SMILE', true), w('DESIGN', true)],
        x: 50,
        y: 40,
        fontSize: 64,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
      {
        id: 'hook-7-block-2-sq',
        type: 'text',
        words: [w('IN'), w('ONE'), w('VISIT.')],
        x: 50,
        y: 65,
        fontSize: 48,
        color: 'white',
        rotation: 0,
      } as TextBlock,
    ],
  },
};

// ─── Hook 8: Fly Home Smiling ───────────────────────────────────────────────

const hook8: HookPreset = {
  id: 'hook-8',
  name: 'Fly Home Smiling',
  blocks: [
    {
      id: 'hook-8-block-1',
      type: 'text',
      words: [w('FLY'), w('IN'), w('FRIDAY.'), w('3'), w('HOURS.'), w('NO'), w('PAIN.')],
      x: 50,
      y: 40,
      fontSize: 80,
      color: 'white',
      rotation: 0,
    },
    {
      id: 'hook-8-block-2',
      type: 'text',
      words: [w('FLY', true), w('HOME', true), w('SMILING.', true)],
      x: 50,
      y: 65,
      fontSize: 60,
      color: 'white',
      rotation: 0,
      highlightColor: TEAL,
      highlightOpacity: TEAL_OPACITY,
    },
  ],
  layoutOverrides: {
    wide: [
      {
        id: 'hook-8-block-1-wide-0',
        type: 'text',
        words: [w('FLY IN FRIDAY. 3 HOURS. NO PAIN.'), w('FLY HOME SMILING.', true)],
        x: 50,
        y: 50,
        fontSize: 35,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
    square: [
      {
        id: 'hook-8-block-1-sq',
        type: 'text',
        words: [w('FLY'), w('IN'), w('FRIDAY.'), w('3'), w('HOURS.'), w('NO'), w('PAIN.')],
        x: 50,
        y: 40,
        fontSize: 64,
        color: 'white',
        rotation: 0,
      } as TextBlock,
      {
        id: 'hook-8-block-2-sq',
        type: 'text',
        words: [w('FLY', true), w('HOME', true), w('SMILING.', true)],
        x: 50,
        y: 65,
        fontSize: 48,
        color: 'white',
        rotation: 0,
        highlightColor: TEAL,
        highlightOpacity: TEAL_OPACITY,
      } as TextBlock,
    ],
  },
};

// ─── Campaign Preset ────────────────────────────────────────────────────────

export const DENTAL_CANCUN_PRESET: CampaignPreset = {
  id: 'dentalcancun-veneers',
  name: 'DentalCancun Veneers',
  hooks: [hook1, hook2, hook3, hook4, hook5, hook6, hook7, hook8],
  backgroundPrompt:
    'Luxury dental clinic in Puerto Cancun Mexico, turquoise Caribbean water visible through floor-to-ceiling windows, modern minimalist clinical interior, soft natural lighting, premium medical equipment, clean white and teal color palette. NO TEXT NO WORDS NO LETTERS NO NUMBERS NO LOGOS.',
  cta: {
    id: 'cta-1',
    type: 'cta',
    text: 'Book Free Consultation',
    style: 'pill',
    bgColor: '#ffffff',
    textColor: '#111827',
    position: 'bottom-center',
    fontSize: 16,
  },
  logo: undefined,
  brandVoice: undefined,
  targetSizes: ['300x250', '728x90', '320x50', '160x600', '300x600', '320x100', '1:1', '4:5', '9:16'],
};

export const CAMPAIGN_PRESETS: CampaignPreset[] = [DENTAL_CANCUN_PRESET];
