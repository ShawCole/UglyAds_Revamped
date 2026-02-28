
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AspectRatio, TextBlock, AssetBlock, WordStyle, UploadedAsset, BrandBucket, BrandAsset } from './types';
import { generateAdBackground } from './geminiService';
import * as htmlToImage from 'html-to-image';

interface RatioConfig {
  value: AspectRatio;
  label: string;
  description: string;
  dimensions: string;
}

const RATIO_CONFIGS: RatioConfig[] = [
  // Meta / Social Sizes
  { value: '1:1', label: 'Square (Feed) 1:1', description: 'Meta Feed', dimensions: '1080 x 1080' },
  { value: '4:5', label: 'Portrait (4:5)', description: 'Meta Post', dimensions: '1080 x 1350' },
  { value: '9:16', label: 'Story / Reel (9:16)', description: 'Meta Stories', dimensions: '800 x 1422' },
  // Web Banner Sizes
  { value: '300x250', label: 'Medium Rectangle', description: 'Web Banner', dimensions: '300 x 250' },
  { value: '728x90', label: 'Leaderboard', description: 'Web Banner', dimensions: '728 x 90' },
  { value: '320x100', label: 'Large Mobile', description: 'Web Banner', dimensions: '320 x 100' },
  { value: '320x50', label: 'Small Mobile', description: 'Web Banner', dimensions: '320 x 50' },
  { value: '300x600', label: 'Half Page', description: 'Web Banner', dimensions: '300 x 600' },
  { value: '160x600', label: 'Skyscraper', description: 'Web Banner', dimensions: '160 x 600' },
];

const INITIAL_BLOCKS: (TextBlock | AssetBlock)[] = [
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
    highlightOpacity: 1
  },
  {
    id: 'block-2',
    type: 'text',
    words: [{ text: 'THE', isBold: true, isItalic: false, isUnderlined: false, isHighlighted: false, isCircled: false }],
    x: 50,
    y: 50,
    fontSize: 50,
    color: 'white',
    rotation: 0
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
    highlightOpacity: 1
  }
];

const hexToRgba = (hex: string, opacity: number) => {
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

const getRatioValue = (ratio: AspectRatio): number => {
  const cfg = RATIO_CONFIGS.find(r => r.value === ratio);
  if (!cfg) return 1;
  const [w, h] = cfg.dimensions.split(' x ').map(Number);
  return w / h;
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'editor' | 'brandHub'>('editor');
  const [workspaceMode, setWorkspaceMode] = useState<'single' | 'multi'>('single');
  const [blocks, setBlocks] = useState<(TextBlock | AssetBlock)[]>(INITIAL_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<'ai' | 'upload' | 'solid'>('ai');
  const [solidColor, setSolidColor] = useState<'black' | 'white'>('black');
  const [backgrounds, setBackgrounds] = useState<Partial<Record<AspectRatio, string>>>({});
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [activeRatio, setActiveRatio] = useState<AspectRatio>('1:1');
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedSizes, setSelectedSizes] = useState<AspectRatio[]>(['1:1', '4:5', '9:16', '300x250']);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [brands, setBrands] = useState<BrandBucket[]>(() => {
    const saved = localStorage.getItem('uglyads_brands');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState('');

  // Global Tooltip State for Fixed Positioning
  const [hoveredRatio, setHoveredRatio] = useState<RatioConfig | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);

  const [topGap, setTopGap] = useState<number>(20);
  const [bottomGap, setBottomGap] = useState<number>(20);
  const [isLinked, setIsLinked] = useState<boolean>(true);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('uglyads_brands', JSON.stringify(brands));
  }, [brands]);

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

  const handleRatioHover = (e: React.MouseEvent, r: RatioConfig) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredRatio(r);
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top // Anchor to the top of the button
    });
  };

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

  const generateImagesForSelected = async () => {
    if (!prompt) return;
    const targetSizes = selectedSizes.length > 0 ? selectedSizes : [activeRatio];
    setIsGenerating(true);
    setSourceMode('ai');
    
    const activeBrand = brands.find(b => b.id === selectedBrandId);
    let referenceImage = undefined;
    if (activeBrand && activeBrand.assets.length > 0) {
      const mainAsset = activeBrand.assets[0];
      if (mainAsset.type.includes('image') || mainAsset.type.includes('pdf')) {
        referenceImage = { data: mainAsset.url, mimeType: mainAsset.type.includes('pdf') ? 'application/pdf' : mainAsset.type };
      }
    }

    try {
      const newBackgrounds = { ...backgrounds };
      for (const ratio of targetSizes) {
        const url = await generateAdBackground(prompt, ratio, referenceImage);
        newBackgrounds[ratio] = url;
        setBackgrounds({ ...newBackgrounds });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

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

  const AdCanvas = ({ ratio, isThumbnail = false, containerRef }: { ratio: AspectRatio, isThumbnail?: boolean, containerRef?: React.RefObject<HTMLDivElement> }) => {
    const activeAsset = uploadedAssets.find(a => a.id === activeAssetId);
    const bgUrl = sourceMode === 'ai' ? backgrounds[ratio] : (sourceMode === 'upload' ? activeAsset?.url : '');
    const ratioVal = getRatioValue(ratio);
    
    return (
      <div 
        ref={containerRef}
        className={`bg-white relative grid-background-subtle shadow-xl overflow-hidden ad-canvas-container ${isThumbnail ? 'rounded-2xl border border-neutral-200' : 'rounded-sm'}`}
        style={{
          backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
          backgroundColor: solidColor,
          aspectRatio: `${ratioVal}`,
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: isThumbnail ? '650px' : '100%', 
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          containerType: 'size', 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          margin: 'auto'
        }}
      >
        {blocks.map(block => (
          <div 
            key={block.id} 
            onMouseDown={!isThumbnail ? e => handleDragStart(e, block.id) : undefined}
            onTouchStart={!isThumbnail ? e => handleDragStart(e, block.id) : undefined}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${!isThumbnail ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`} 
            style={{ 
              left: `${block.x}%`, 
              top: `${block.y}%`, 
              zIndex: selectedBlockId === block.id ? 50 : 10,
              transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
            }}
          >
            <div style={{ transform: `rotate(${block.rotation}deg)`, opacity: block.type === 'asset' ? block.opacity : 1 }}>
              {block.type === 'text' ? (
                <div 
                  className={`${!isThumbnail && selectedBlockId === block.id ? 'ring-2 ring-indigo-500 rounded-sm' : ''}`}
                  style={{ 
                    fontSize: `calc(${block.fontSize} * 0.12cqmin)`, 
                    color: block.color, 
                    whiteSpace: 'nowrap', 
                    fontWeight: 900, 
                    textShadow: block.color === 'white' ? '0 10px 40px rgba(0,0,0,0.4)' : 'none', 
                    padding: '0.1em' 
                  }}
                >
                  {block.words.map((w, i) => (
                    <span key={i} style={{
                      display: 'inline-block',
                      marginRight: i === block.words.length - 1 ? '0' : '0.2em',
                      fontWeight: w.isBold ? 900 : 400,
                      fontStyle: w.isItalic ? 'italic' : 'normal',
                      textDecoration: w.isUnderlined ? 'underline' : 'none',
                      padding: w.isHighlighted ? '0.05em 0.15em' : '0',
                      backgroundColor: w.isHighlighted ? hexToRgba(block.highlightColor || '#4f46e5', block.highlightOpacity ?? 1) : 'transparent',
                      border: w.isCircled ? `0.05em solid ${block.color}` : 'none',
                      borderRadius: w.isCircled ? '50%' : (w.isHighlighted ? '0.1em' : '0'),
                    }}>
                      {w.text}
                    </span>
                  ))}
                </div>
              ) : (
                <img 
                  src={block.url} 
                  alt={block.name} 
                  className="max-w-[80cqmin] h-auto drop-shadow-2xl pointer-events-none" 
                  style={{ transform: `scale(${block.scale})` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const currentBlock = blocks.find(b => b.id === selectedBlockId);

  if (currentView === 'brandHub') {
    return (
      <div className="flex flex-col h-screen bg-neutral-900 text-white font-sans overflow-hidden">
        <header className="h-20 bg-black/50 border-b border-white/10 flex items-center justify-between px-10 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView('editor')} className="text-white/40 hover:text-indigo-400 transition-all scale-125">
              <i className="fas fa-chevron-left"></i>
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Brand Hub</h1>
          </div>
          <button onClick={() => setCurrentView('editor')} className="bg-white text-black px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-indigo-400 transition-all">
            Enter Workspace
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-12 bg-gradient-to-b from-neutral-900 to-black">
          <div className="max-w-7xl mx-auto">
             <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-8">
              <div>
                <h2 className="text-6xl font-black text-white mb-4 tracking-tighter">Buckets</h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">AI Ingestion & Asset Strategy</p>
              </div>
              <form onSubmit={e => { e.preventDefault(); if(newBrandName.trim()){ setBrands(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: newBrandName.trim(), description: '', assets: [] }]); setNewBrandName(''); } }} className="flex gap-4 w-full md:w-auto bg-white/5 p-2 rounded-3xl border border-white/10">
                <input type="text" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Bucket Name..." className="px-6 py-4 bg-transparent outline-none text-sm font-bold w-64 text-white" />
                <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-indigo-500 transition-all">New Bucket</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {brands.map(brand => (
                <div key={brand.id} className={`group bg-neutral-800/50 rounded-[3rem] border-4 p-10 transition-all hover:bg-neutral-800 ${selectedBrandId === brand.id ? 'border-indigo-600 shadow-2xl shadow-indigo-500/20' : 'border-transparent'}`}>
                  <div className="flex justify-between items-start mb-8">
                    <div onClick={() => setSelectedBrandId(brand.id)} className="w-20 h-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-3xl shadow-xl cursor-pointer hover:rotate-6 transition-transform">
                      <i className="fas fa-fingerprint"></i>
                    </div>
                    <button onClick={e => { e.stopPropagation(); if(confirm('Wipe bucket?')) setBrands(p => p.filter(b => b.id !== brand.id)); }} className="text-white/10 hover:text-red-500 transition-all p-3">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                  <h3 className="text-3xl font-black mb-1">{brand.name}</h3>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-8">{brand.assets.length} Elements</p>
                  <button onClick={() => { setSelectedBrandId(brand.id); setCurrentView('editor'); }} className="w-full bg-white text-black py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-400 transition-all">Activate</button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-neutral-50 font-sans">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-[480px] bg-white shadow-2xl relative flex flex-col z-30 border-r border-neutral-200">
        <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-40 scroll-smooth">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-indigo-600">UGLYADS.</h1>
              <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">Premium Ad Suite</p>
            </div>
            <button onClick={() => setCurrentView('brandHub')} className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-400 hover:bg-indigo-600 hover:text-white transition-all">
              <i className="fas fa-briefcase"></i>
            </button>
          </header>

          <div className="flex p-1 bg-neutral-100 rounded-2xl">
            {['ai', 'upload', 'solid'].map(m => (
              <button key={m} onClick={() => setSourceMode(m as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sourceMode === m ? 'bg-white shadow-lg text-indigo-600' : 'text-neutral-400'}`}>
                {m}
              </button>
            ))}
          </div>

          <section className="bg-neutral-50 p-6 rounded-[2.5rem] space-y-6">
            <h2 className="font-black text-neutral-800 text-xs uppercase tracking-widest">Variation Strategy</h2>
            {sourceMode === 'ai' && (
              <textarea className="w-full p-5 rounded-2xl bg-white border border-neutral-100 focus:border-indigo-500 outline-none text-sm h-32 resize-none shadow-sm font-bold" placeholder="Product theme, vibe, or detailed description..." value={prompt} onChange={e => setPrompt(e.target.value)} />
            )}
            <div className="flex flex-wrap gap-3">
              {RATIO_CONFIGS.map(r => (
                <div key={r.value} className="relative">
                  <button 
                    onClick={() => setSelectedSizes(p => p.includes(r.value) ? p.filter(x => x !== r.value) : [...p, r.value])} 
                    onMouseEnter={(e) => handleRatioHover(e, r)}
                    onMouseLeave={() => setHoveredRatio(null)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black border-2 transition-all ${selectedSizes.includes(r.value) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-neutral-100 text-neutral-400 hover:border-indigo-200'}`}
                  >
                    {r.label.split(' ')[0]}
                  </button>
                </div>
              ))}
            </div>
            {sourceMode === 'ai' && (
              <button onClick={generateImagesForSelected} disabled={isGenerating || !prompt} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all transform active:scale-95 shadow-xl ${isGenerating ? 'bg-neutral-200' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {isGenerating ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-sparkles mr-2"></i>}
                Generate Variations
              </button>
            )}
          </section>

          <section className="bg-neutral-50 p-6 rounded-[2.5rem] space-y-6 border border-neutral-100 shadow-sm">
            <div className="flex items-center justify-between">
               <h2 className="font-black text-neutral-800 text-xs uppercase tracking-widest">Vertical Layout</h2>
               <button onClick={handleMagicResize} className="bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">
                 <i className="fas fa-wand-magic-sparkles mr-1"></i> Magic Resize
               </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between font-black text-[9px] text-neutral-400 uppercase">
                  <span>Top Spacing (Center to Header)</span>
                  <span>{Math.round(topGap)}%</span>
                </div>
                <input type="range" min="0" max="45" step="0.5" value={topGap} onChange={e => handleTopGapChange(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between font-black text-[9px] text-neutral-400 uppercase"><span>Bottom Spacing</span><span>{Math.round(bottomGap)}%</span></div>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="45" step="0.5" value={bottomGap} onChange={e => handleBottomGapChange(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
                  <button onClick={() => setIsLinked(!isLinked)} className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isLinked ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-300 hover:text-neutral-500'}`}>
                    <i className={`fas ${isLinked ? 'fa-link' : 'fa-link-slash'}`}></i>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="font-black text-neutral-800 text-xs uppercase tracking-widest">Composition</h2>
               <button onClick={() => { setBlocks(INITIAL_BLOCKS); setTopGap(20); setBottomGap(20); setIsLinked(true); }} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Reset All</button>
            </div>
            <div className="space-y-3">
              {blocks.map((block) => (
                <div key={block.id} onClick={() => setSelectedBlockId(block.id)} className={`p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer flex items-center justify-between ${selectedBlockId === block.id ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-neutral-50 border-neutral-100 hover:bg-neutral-100'}`}>
                  <div className="flex items-center gap-4">
                    <i className={`fas ${block.type === 'text' ? 'fa-font' : 'fa-image'} text-indigo-500`}></i>
                    <span className="text-sm font-black truncate max-w-[140px]">
                      {block.type === 'text' ? block.words.map(w => w.text).join(' ') : block.name}
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="text-neutral-300 hover:text-red-500"><i className="fas fa-trash-alt text-xs"></i></button>
                </div>
              ))}
            </div>

            {currentBlock && currentBlock.type === 'text' && (
              <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-8 animate-fade-in">
                <div className="space-y-6">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Word-by-Word Styling</h3>
                  <div className="space-y-4">
                    {currentBlock.words.map((word, idx) => (
                      <div key={idx} className="bg-neutral-50 p-4 rounded-2xl space-y-3 border border-neutral-100">
                        <div className="flex items-center justify-between gap-3">
                          <input 
                            type="text" 
                            value={word.text} 
                            onChange={e => updateWordInBlock(currentBlock.id, idx, { text: e.target.value })} 
                            className="bg-white border-none outline-none font-black text-sm p-2 rounded-lg flex-1 shadow-sm"
                          />
                          <button onClick={() => removeWordFromBlock(currentBlock.id, idx)} className="text-neutral-300 hover:text-red-500"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="flex gap-2">
                          {[
                            { key: 'isBold', icon: 'fa-bold' },
                            { key: 'isItalic', icon: 'fa-italic' },
                            { key: 'isUnderlined', icon: 'fa-underline' },
                            { key: 'isHighlighted', icon: 'fa-highlighter' },
                            { key: 'isCircled', icon: 'fa-circle' }
                          ].map(style => (
                            <button 
                              key={style.key}
                              onClick={() => updateWordInBlock(currentBlock.id, idx, { [style.key]: !(word as any)[style.key] })}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ (word as any)[style.key] ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-neutral-400 hover:text-indigo-600' }`}
                            >
                              <i className={`fas ${style.icon} text-xs`}></i>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addWordToBlock(currentBlock.id)} className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-2xl text-[10px] font-black uppercase text-neutral-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                      <i className="fas fa-plus mr-2"></i> Add Word
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                   <h3 className="font-black text-[10px] uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Block Properties</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between font-black text-[9px] text-neutral-400 uppercase"><span>Size Factor</span><span>{currentBlock.fontSize}</span></div>
                        <input type="range" min="10" max="600" value={currentBlock.fontSize} onChange={e => updateTextBlock(currentBlock.id, { fontSize: parseInt(e.target.value) })} className="w-full accent-indigo-600" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between font-black text-[9px] text-neutral-400 uppercase"><span>Rotation</span><span>{currentBlock.rotation}°</span></div>
                        <input type="range" min="-180" max="180" value={currentBlock.rotation} onChange={e => updateTextBlock(currentBlock.id, { rotation: parseInt(e.target.value) })} className="w-full accent-indigo-600" />
                      </div>
                    </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8 bg-white border-t border-neutral-100 z-40">
          <button onClick={exportAsPng} disabled={isExporting} className="w-full py-6 bg-black text-white font-black uppercase tracking-widest rounded-3xl transition-all shadow-xl hover:bg-neutral-800">
            {isExporting ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-rocket mr-3"></i>}
            Export Master Bundle
          </button>
        </div>
      </div>

      <main className="flex-1 relative flex flex-col overflow-hidden bg-neutral-200/50">
        <div className="h-20 bg-white flex items-center justify-center border-b border-neutral-100 shrink-0 z-10 px-10 relative">
          <div className="bg-neutral-100 p-1.5 rounded-full flex gap-1 shadow-inner relative z-10">
            <button onClick={() => setWorkspaceMode('single')} className={`px-10 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${workspaceMode === 'single' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Single Ad</button>
            <button onClick={() => setWorkspaceMode('multi')} className={`px-10 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${workspaceMode === 'multi' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Multi-View</button>
          </div>
        </div>

        {workspaceMode === 'single' && (
          <nav className="h-20 bg-white border-b border-neutral-100 flex items-center justify-start gap-4 px-12 shrink-0 z-20 relative">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 h-full">
              {RATIO_CONFIGS.map(r => (
                <div key={r.value} className="shrink-0 relative">
                  <button 
                    onClick={() => setActiveRatio(r.value)} 
                    onMouseEnter={(e) => handleRatioHover(e, r)}
                    onMouseLeave={() => setHoveredRatio(null)}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeRatio === r.value ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
                  >
                    {r.label.split(' ')[0]}
                  </button>
                </div>
              ))}
            </div>
          </nav>
        )}

        <div className={`flex-1 relative ${workspaceMode === 'single' ? 'overflow-hidden' : 'overflow-y-auto'} p-6 lg:p-12 bg-neutral-200/30 no-scrollbar z-0`}>
           {workspaceMode === 'single' ? (
             <div className="h-full w-full flex items-center justify-center">
               <AdCanvas ratio={activeRatio} containerRef={canvasRef} />
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-20 max-w-[1400px] mx-auto pb-64 items-start">
               {selectedSizes.map(ratio => {
                 const config = RATIO_CONFIGS.find(r => r.value === ratio);
                 return (
                   <div key={ratio} className="flex flex-col gap-6 animate-fade-in group">
                     <div className="flex flex-col gap-1.5 px-4">
                       <div className="flex items-center justify-between">
                         <span className="text-[12px] font-black uppercase tracking-widest text-indigo-600">{config?.label}</span>
                         <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{config?.dimensions}</span>
                       </div>
                       <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest truncate">{config?.description}</span>
                     </div>
                     <div className="w-full flex items-center justify-center bg-white/40 rounded-[3rem] p-10 border-2 border-dashed border-neutral-300/40 hover:bg-white transition-all duration-500 shadow-sm hover:shadow-2xl overflow-visible">
                       <div className="w-full flex items-center justify-center">
                         <AdCanvas ratio={ratio} isThumbnail />
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      </main>

      {/* Global Fixed Tooltip System */}
      {hoveredRatio && tooltipPos && (
        <div 
          className="fixed pointer-events-none z-[99999] transform -translate-x-1/2 -translate-y-[calc(100%+12px)] animate-tooltip-pop"
          style={{ 
            left: tooltipPos.x, 
            top: tooltipPos.y 
          }}
        >
          <div className="bg-black/95 backdrop-blur-3xl text-white px-6 py-4 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/20 flex flex-col items-center gap-1.5 min-w-[180px]">
            <span className="text-[11px] font-black uppercase tracking-widest leading-tight text-center text-white">{hoveredRatio.label}</span>
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none text-center">{hoveredRatio.description}</span>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em]">{hoveredRatio.dimensions}</span>
          </div>
          {/* Tooltip Notch */}
          <div className="absolute top-[100%] left-1/2 -translate-x-1/2 -mt-0.5 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black/95"></div>
        </div>
      )}

      <style>{`
        .grid-background-subtle {
          background-image: 
            linear-gradient(45deg, #fafafa 25%, transparent 25%), 
            linear-gradient(-45deg, #fafafa 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #fafafa 75%), 
            linear-gradient(-45deg, transparent 75%, #fafafa 75%);
          background-size: 40px 40px;
          background-position: 0 0, 0 20px, 20px -20px, -20px 0px;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tooltip-pop {
          from { opacity: 0; transform: translate(-50%, -90%); }
          to { opacity: 1; transform: translate(-50%, calc(-100% - 12px)); }
        }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.23, 1, 0.32, 1) both; }
        .animate-tooltip-pop { animation: tooltip-pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .ad-canvas-container * { max-width: 100%; }
        
        .ad-canvas-container {
          transition: width 0.4s ease, height 0.4s ease;
        }
      `}</style>
    </div>
  );
};

export default App;
