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
