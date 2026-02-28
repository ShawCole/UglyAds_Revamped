
export type AspectRatio = '1:1' | '4:5' | '9:16' | '300x250' | '728x90' | '320x100' | '320x50' | '300x600' | '160x600' | '3:4' | '4:3' | '16:9' | '1.91:1' | '2:3' | '1:2' | '21:9' | '3:2' | '5:4' | '2:1';

export interface WordStyle {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderlined: boolean;
  isHighlighted: boolean;
  isCircled: boolean;
}

export interface TextBlock {
  id: string;
  type: 'text';
  words: WordStyle[];
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  fontSize: number;
  color: 'white' | 'black';
  rotation: number;
  highlightColor?: string;
  highlightOpacity?: number;
}

export interface AssetBlock {
  id: string;
  type: 'asset';
  url: string;
  mimeType: string;
  name: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface UploadedAsset {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface BrandAsset {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface BrandBucket {
  id: string;
  name: string;
  description: string;
  assets: BrandAsset[];
}

export interface AdState {
  backgrounds: Partial<Record<AspectRatio, string>>;
  uploadedAssets: UploadedAsset[];
  activeRatio: AspectRatio;
  blocks: (TextBlock | AssetBlock)[];
  selectedSizes: AspectRatio[];
  sourceMode: 'ai' | 'upload' | 'solid';
}
