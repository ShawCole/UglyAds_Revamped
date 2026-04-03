
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AspectRatio, TextBlock, AssetBlock, Block, CTABlock, WordStyle, UploadedAsset, BrandBucket, CampaignPreset, HookPreset } from './types';
import { useLocalStorage } from './useLocalStorage';
import { CAMPAIGN_PRESETS, applyLayoutForRatio } from './campaignPresets';
import { generateAdBackground } from './geminiService';
import { getRatioValue, RatioConfig, RATIO_CONFIGS } from './constants';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';

// ─── Context Interface ───────────────────────────────────────────────────────

interface CampaignContextType {
  // Campaign state
  activeCampaign: CampaignPreset | null;
  setActiveCampaignId: (id: string) => void;
  activeHook: HookPreset | null;
  activeHookId: string;
  loadHook: (hookId: string) => void;
  getBlocksForRatio: (hook: HookPreset, ratio: AspectRatio) => TextBlock[];

  // Block state
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  updateTextBlock: (id: string, updates: Partial<TextBlock>) => void;
  updateWordInBlock: (blockId: string, wordIndex: number, updates: Partial<WordStyle>) => void;
  addWordToBlock: (blockId: string) => void;
  removeWordFromBlock: (blockId: string, wordIndex: number) => void;
  removeBlock: (id: string) => void;

  // Background / source
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

  // Ratio / size state
  activeRatio: AspectRatio;
  setActiveRatio: (r: AspectRatio) => void;
  selectedSizes: AspectRatio[];
  setSelectedSizes: React.Dispatch<React.SetStateAction<AspectRatio[]>>;
  workspaceMode: 'single' | 'multi';
  setWorkspaceMode: (m: 'single' | 'multi') => void;

  // Gap / layout controls
  topGap: number;
  bottomGap: number;
  isLinked: boolean;
  handleTopGapChange: (val: number) => void;
  handleBottomGapChange: (val: number) => void;
  setIsLinked: (v: boolean) => void;
  handleMagicResize: () => void;

  // Drag state
  isDragging: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (e: React.MouseEvent | React.TouchEvent, id: string) => void;

  // Upload / assets
  uploadedAssets: UploadedAsset[];
  activeAssetId: string | null;
  setActiveAssetId: (id: string | null) => void;

  // Brand Hub
  brands: BrandBucket[];
  setBrands: React.Dispatch<React.SetStateAction<BrandBucket[]>>;
  selectedBrandId: string | null;
  setSelectedBrandId: (id: string | null) => void;
  newBrandName: string;
  setNewBrandName: (name: string) => void;

  // Export
  isExporting: boolean;
  isBatchExporting: boolean;
  setIsBatchExporting: (v: boolean) => void;
  exportAsPng: () => Promise<void>;
  exportCanvasRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  exportAllAsZip: () => Promise<void>;

  // View
  currentView: 'editor' | 'brandHub';
  setCurrentView: (v: 'editor' | 'brandHub') => void;

  // Tooltip
  hoveredRatio: RatioConfig | null;
  tooltipPos: { x: number; y: number } | null;
  handleRatioHover: (e: React.MouseEvent, r: RatioConfig) => void;
  setHoveredRatio: (r: RatioConfig | null) => void;
}

// ─── Default context ─────────────────────────────────────────────────────────

const CampaignContext = createContext<CampaignContextType | null>(null);

// ─── Initial blocks ──────────────────────────────────────────────────────────

const INITIAL_BLOCKS: Block[] = [
  {
    id: 'block-1',
    type: 'text',
    words: [{ text: 'STOP', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: true, isCircled: false }],
    x: 50,
    y: 30,
    fontSize: 100,
    color: 'white',
    rotation: -2,
    highlightColor: '#4f46e5',
    highlightOpacity: 1,
  },
  {
    id: 'block-2',
    type: 'text',
    words: [{ text: 'THE', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false }],
    x: 50,
    y: 50,
    fontSize: 50,
    color: 'white',
    rotation: 0,
  },
  {
    id: 'block-3',
    type: 'text',
    words: [{ text: 'SCROLL', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: true, isCircled: false }],
    x: 50,
    y: 70,
    fontSize: 100,
    color: 'white',
    rotation: 2,
    highlightColor: '#4f46e5',
    highlightOpacity: 1,
  },
];

// ─── Provider ────────────────────────────────────────────────────────────────

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── View ──
  const [currentView, setCurrentView] = useState<'editor' | 'brandHub'>('editor');

  // ── Workspace ──
  const [workspaceMode, setWorkspaceMode] = useLocalStorage<'single' | 'multi'>('uglyads_workspaceMode', 'single');

  // ── Blocks ──
  const [blocks, setBlocks] = useLocalStorage<Block[]>('uglyads_blocks', INITIAL_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // ── Background ──
  const [sourceMode, setSourceMode] = useLocalStorage<'ai' | 'upload' | 'solid'>('uglyads_sourceMode', 'ai');
  const [solidColor, setSolidColor] = useLocalStorage<'black' | 'white'>('uglyads_solidColor', 'black');
  const [backgrounds, setBackgrounds] = useState<Partial<Record<AspectRatio, string>>>({});
  const [uploadedAssets] = useState<UploadedAsset[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  // ── Ratio / sizes ──
  const [activeRatio, setActiveRatio] = useLocalStorage<AspectRatio>('uglyads_activeRatio', '1:1');
  const [selectedSizes, setSelectedSizes] = useLocalStorage<AspectRatio[]>('uglyads_selectedSizes', ['1:1', '4:5', '9:16', '300x250']);

  // ── AI / prompt ──
  const [prompt, setPrompt] = useLocalStorage<string>('uglyads_prompt', '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiModel, setAiModel] = useLocalStorage<string>('uglyads_aiModel', 'gemini-2.5-flash-image');

  // ── Export ──
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isBatchExporting, setIsBatchExporting] = useState<boolean>(false);

  // ── Brand Hub ──
  const [brands, setBrands] = useLocalStorage<BrandBucket[]>('uglyads_brands', []);
  const [selectedBrandId, setSelectedBrandId] = useLocalStorage<string | null>('uglyads_selectedBrandId', null);
  const [newBrandName, setNewBrandName] = useState('');

  // ── Tooltip ──
  const [hoveredRatio, setHoveredRatio] = useState<RatioConfig | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // ── Gap / layout ──
  const [topGap, setTopGap] = useLocalStorage<number>('uglyads_topGap', 20);
  const [bottomGap, setBottomGap] = useLocalStorage<number>('uglyads_bottomGap', 20);
  const [isLinked, setIsLinked] = useLocalStorage<boolean>('uglyads_isLinked', true);

  // ── Drag ──
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // ── Refs ──
  const canvasRef = useRef<HTMLDivElement>(null);
  const exportCanvasRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Campaign state ──
  const [activeCampaignId, setActiveCampaignId] = useLocalStorage<string>('uglyads_campaign', 'dentalcancun-veneers');
  const [activeHookId, setActiveHookIdState] = useLocalStorage<string>('uglyads_hook', 'hook-1');

  const activeCampaign = CAMPAIGN_PRESETS.find(c => c.id === activeCampaignId) || null;
  const activeHook = activeCampaign?.hooks.find(h => h.id === activeHookId) || null;

  // ── Effect: when campaign changes, update prompt/sizes/hook ──
  useEffect(() => {
    if (!activeCampaign) return;
    setPrompt(activeCampaign.backgroundPrompt);
    setSelectedSizes(activeCampaign.targetSizes);
    // Load first hook
    const firstHook = activeCampaign.hooks[0];
    if (firstHook) {
      const adapted = applyLayoutForRatio(firstHook, activeRatio);
      const withCta: Block[] = activeCampaign.cta
        ? [...adapted, activeCampaign.cta]
        : [...adapted];
      setBlocks(withCta);
      setActiveHookIdState(firstHook.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCampaignId]);

  // ── Gap helpers ──

  const updateVerticalPositions = (newTopGap: number, newBottomGap: number) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === 'block-1') return { ...b, y: 50 - newTopGap };
      if (b.id === 'block-2') return { ...b, y: 50 };
      if (b.id === 'block-3') return { ...b, y: 50 + newBottomGap };
      return b;
    }));
  };

  const handleTopGapChange = (newVal: number) => {
    setTopGap(newVal);
    let finalBottom = bottomGap;
    if (isLinked) {
      setBottomGap(newVal);
      finalBottom = newVal;
    }
    updateVerticalPositions(newVal, finalBottom);
  };

  const handleBottomGapChange = (newVal: number) => {
    setBottomGap(newVal);
    setIsLinked(false);
    updateVerticalPositions(topGap, newVal);
  };

  // ── Drag handlers ──

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    setSelectedBlockId(id);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !selectedBlockId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

    const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
    const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 0), 100);

    setBlocks(prev => {
      const newBlocks = prev.map(b => b.id === selectedBlockId ? { ...b, x, y } : b);
      if (selectedBlockId === 'block-1') {
        const gap = Math.max(0, 50 - y);
        setTopGap(gap);
        if (isLinked) setBottomGap(gap);
      } else if (selectedBlockId === 'block-3') {
        const gap = Math.max(0, y - 50);
        setBottomGap(gap);
        setIsLinked(false);
      }
      return newBlocks;
    });
  }, [isDragging, selectedBlockId, isLinked]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ── Tooltip handler ──

  const handleRatioHover = (e: React.MouseEvent, r: RatioConfig) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredRatio(r);
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  // ── Block handlers ──

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const updateTextBlock = (id: string, updates: Partial<TextBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateWordInBlock = (blockId: string, wordIndex: number, updates: Partial<WordStyle>) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId || block.type !== 'text') return block;
      const newWords = [...block.words];
      newWords[wordIndex] = { ...newWords[wordIndex], ...updates };
      return { ...block, words: newWords };
    }));
  };

  const addWordToBlock = (blockId: string) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId || block.type !== 'text') return block;
      const newWord: WordStyle = { text: 'WORD', isBold: false, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false };
      return { ...block, words: [...block.words, newWord] };
    }));
  };

  const removeWordFromBlock = (blockId: string, wordIndex: number) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId || block.type !== 'text') return block;
      if (block.words.length <= 1) return block;
      return { ...block, words: block.words.filter((_, i) => i !== wordIndex) };
    }));
  };

  // ── Magic resize ──

  const handleMagicResize = () => {
    const ratioVal = getRatioValue(activeRatio);
    let fontScale = 1;
    let gapScale = 1;

    if (ratioVal < 0.8) { fontScale = 1.2; gapScale = 1.4; }
    else if (ratioVal > 1.3) { fontScale = 0.8; gapScale = 0.7; }

    setBlocks(prev => prev.map(b => {
      if (b.type === 'text') {
        const baseSize = b.id === 'block-2' ? 50 : 100;
        return { ...b, fontSize: baseSize * fontScale };
      }
      return b;
    }));

    const newGap = 20 * gapScale;
    setTopGap(newGap);
    setBottomGap(newGap);
    setIsLinked(true);
    updateVerticalPositions(newGap, newGap);
  };

  // ── Image generation ──

  const generateImagesForSelected = async () => {
    if (!prompt) return;
    const targetSizes = selectedSizes.length > 0 ? selectedSizes : [activeRatio];
    setIsGenerating(true);
    setSourceMode('ai');

    const activeBrand = brands.find(b => b.id === selectedBrandId);
    let referenceImage: { data: string; mimeType: string } | undefined = undefined;
    if (activeBrand && activeBrand.assets.length > 0) {
      const mainAsset = activeBrand.assets[0];
      if (mainAsset.type.includes('image') || mainAsset.type.includes('pdf')) {
        referenceImage = { data: mainAsset.url, mimeType: mainAsset.type.includes('pdf') ? 'application/pdf' : mainAsset.type };
      }
    }

    try {
      const newBackgrounds = { ...backgrounds };
      for (const ratio of targetSizes) {
        const url = await generateAdBackground(prompt, ratio, referenceImage, aiModel);
        newBackgrounds[ratio] = url;
        setBackgrounds({ ...newBackgrounds });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Export ──

  const exportAsPng = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const dataUrl = await htmlToImage.toPng(canvasRef.current, { cacheBust: true, quality: 1, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `ugly-ad-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const exportAllAsZip = async () => {
    if (selectedSizes.length === 0) return;
    setIsBatchExporting(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const zip = new JSZip();
      for (const ratio of selectedSizes) {
        const el = exportCanvasRefs.current.get(ratio);
        if (!el) continue;
        const config = RATIO_CONFIGS.find(r => r.value === ratio);
        const dataUrl = await htmlToImage.toPng(el, { cacheBust: true, quality: 1, pixelRatio: 3 });
        const base64 = dataUrl.split(',')[1];
        const filename = `${config?.label.replace(/[^a-zA-Z0-9]/g, '_') || ratio}_${config?.dimensions.replace(/\s/g, '')}.png`;
        zip.file(filename, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `ugly-ads-bundle-${Date.now()}.zip`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setIsBatchExporting(false);
    }
  };

  // ── Campaign functions ──

  const loadHook = (hookId: string) => {
    if (!activeCampaign) return;
    const hook = activeCampaign.hooks.find(h => h.id === hookId);
    if (!hook) return;
    const adapted = applyLayoutForRatio(hook, activeRatio);
    const withCta: Block[] = activeCampaign.cta
      ? [...adapted, activeCampaign.cta]
      : [...adapted];
    setBlocks(withCta);
    setActiveHookIdState(hookId);
  };

  const getBlocksForRatio = (hook: HookPreset, ratio: AspectRatio): TextBlock[] => {
    return applyLayoutForRatio(hook, ratio);
  };

  // ── Context value ──

  const value: CampaignContextType = {
    // Campaign
    activeCampaign,
    setActiveCampaignId,
    activeHook,
    activeHookId,
    loadHook,
    getBlocksForRatio,

    // Blocks
    blocks,
    setBlocks,
    selectedBlockId,
    setSelectedBlockId,
    updateTextBlock,
    updateWordInBlock,
    addWordToBlock,
    removeWordFromBlock,
    removeBlock,

    // Background / source
    sourceMode,
    setSourceMode,
    solidColor,
    setSolidColor,
    backgrounds,
    setBackgrounds,
    aiModel,
    setAiModel,
    prompt,
    setPrompt,
    isGenerating,
    generateImagesForSelected,

    // Ratio / sizes
    activeRatio,
    setActiveRatio,
    selectedSizes,
    setSelectedSizes,
    workspaceMode,
    setWorkspaceMode,

    // Gap / layout
    topGap,
    bottomGap,
    isLinked,
    handleTopGapChange,
    handleBottomGapChange,
    setIsLinked,
    handleMagicResize,

    // Drag
    isDragging,
    canvasRef,
    handleDragStart,

    // Upload / assets
    uploadedAssets,
    activeAssetId,
    setActiveAssetId,

    // Brand Hub
    brands,
    setBrands,
    selectedBrandId,
    setSelectedBrandId,
    newBrandName,
    setNewBrandName,

    // Export
    isExporting,
    isBatchExporting,
    setIsBatchExporting,
    exportAsPng,
    exportCanvasRefs,
    exportAllAsZip,

    // View
    currentView,
    setCurrentView,

    // Tooltip
    hoveredRatio,
    tooltipPos,
    handleRatioHover,
    setHoveredRatio,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useCampaign = (): CampaignContextType => {
  const ctx = useContext(CampaignContext);
  if (!ctx) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return ctx;
};
