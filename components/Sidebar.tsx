
import React from 'react';
import { useCampaign } from '../CampaignContext';
import { RATIO_CONFIGS } from '../constants';
import { Block, TextBlock } from '../types';
import { HookPanel } from './HookPanel';
import { BlockEditor } from './BlockEditor';

// Default blocks for "Reset All"
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
  } as TextBlock,
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

export const Sidebar: React.FC = () => {
  const {
    // View
    setCurrentView,

    // Source mode
    sourceMode,
    setSourceMode,

    // AI / prompt
    prompt,
    setPrompt,
    isGenerating,
    generateImagesForSelected,

    // Ratio / sizes
    selectedSizes,
    setSelectedSizes,

    // Hooks handled by HookPanel

    // Gap / layout
    topGap,
    bottomGap,
    isLinked,
    handleTopGapChange,
    handleBottomGapChange,
    setIsLinked,
    handleMagicResize,

    // Blocks / composition
    blocks,
    setBlocks,
    selectedBlockId,
    setSelectedBlockId,
    removeBlock,

    // Export
    isExporting,
    exportAsPng,

    // Tooltip
    handleRatioHover,
    setHoveredRatio,
  } = useCampaign();

  return (
    <div className="w-full lg:w-[480px] bg-white shadow-2xl relative flex flex-col z-30 border-r border-neutral-200">
      <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-40 scroll-smooth">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-indigo-600">UGLYADS.</h1>
            <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">Premium Ad Suite</p>
          </div>
          <button
            onClick={() => setCurrentView('brandHub')}
            className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-400 hover:bg-indigo-600 hover:text-white transition-all"
          >
            <i className="fas fa-briefcase"></i>
          </button>
        </header>

        {/* Source mode tabs */}
        <div className="flex p-1 bg-neutral-100 rounded-2xl">
          {(['ai', 'upload', 'solid'] as const).map(m => (
            <button
              key={m}
              onClick={() => setSourceMode(m)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                sourceMode === m ? 'bg-white shadow-lg text-indigo-600' : 'text-neutral-400'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Variation Strategy */}
        <section className="bg-neutral-50 p-6 rounded-[2.5rem] space-y-6">
          <h2 className="font-black text-neutral-800 text-xs uppercase tracking-widest">Variation Strategy</h2>
          {sourceMode === 'ai' && (
            <textarea
              className="w-full p-5 rounded-2xl bg-white border border-neutral-100 focus:border-indigo-500 outline-none text-sm h-32 resize-none shadow-sm font-bold"
              placeholder="Product theme, vibe, or detailed description..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-3">
            {RATIO_CONFIGS.map(r => (
              <div key={r.value} className="relative">
                <button
                  onClick={() =>
                    setSelectedSizes(p =>
                      p.includes(r.value) ? p.filter(x => x !== r.value) : [...p, r.value]
                    )
                  }
                  onMouseEnter={e => handleRatioHover(e, r)}
                  onMouseLeave={() => setHoveredRatio(null)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black border-2 transition-all ${
                    selectedSizes.includes(r.value)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-neutral-100 text-neutral-400 hover:border-indigo-200'
                  }`}
                >
                  {r.label.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>
          {sourceMode === 'ai' && (
            <button
              onClick={generateImagesForSelected}
              disabled={isGenerating || !prompt}
              className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all transform active:scale-95 shadow-xl ${
                isGenerating ? 'bg-neutral-200' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isGenerating ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-sparkles mr-2"></i>
              )}
              Generate Variations
            </button>
          )}
        </section>

        {/* Hook Panel */}
        <HookPanel />

        {/* Vertical Layout */}
        <section className="bg-neutral-50 p-6 rounded-[2.5rem] space-y-6 border border-neutral-100 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-neutral-800 text-xs uppercase tracking-widest">Vertical Layout</h2>
            <button
              onClick={handleMagicResize}
              className="bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all"
            >
              <i className="fas fa-wand-magic-sparkles mr-1"></i> Magic Resize
            </button>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between font-black text-[9px] text-neutral-400 uppercase">
                <span>Top Spacing (Center to Header)</span>
                <span>{Math.round(topGap)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="0.5"
                value={topGap}
                onChange={e => handleTopGapChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between font-black text-[9px] text-neutral-400 uppercase">
                <span>Bottom Spacing</span>
                <span>{Math.round(bottomGap)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="45"
                  step="0.5"
                  value={bottomGap}
                  onChange={e => handleBottomGapChange(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <button
                  onClick={() => setIsLinked(!isLinked)}
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isLinked ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-300 hover:text-neutral-500'
                  }`}
                >
                  <i className={`fas ${isLinked ? 'fa-link' : 'fa-link-slash'}`}></i>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Composition */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-neutral-800 text-xs uppercase tracking-widest">Composition</h2>
            <button
              onClick={() => {
                setBlocks(INITIAL_BLOCKS);
                setIsLinked(true);
                handleTopGapChange(20);
              }}
              className="text-[9px] font-black text-indigo-600 uppercase hover:underline"
            >
              Reset All
            </button>
          </div>
          <div className="space-y-3">
            {blocks.map(block => (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer flex items-center justify-between ${
                  selectedBlockId === block.id
                    ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                    : 'bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <i className={`fas ${block.type === 'text' ? 'fa-font' : 'fa-image'} text-indigo-500`}></i>
                  <span className="text-sm font-black truncate max-w-[140px]">
                    {block.type === 'text'
                      ? block.words.map(w => w.text).join(' ')
                      : (block as any).name}
                  </span>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    removeBlock(block.id);
                  }}
                  className="text-neutral-300 hover:text-red-500"
                >
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            ))}
          </div>

          {/* Block Editor — renders when a text block is selected */}
          <BlockEditor />
        </section>
      </div>

      {/* Bottom export bar */}
      <div className="absolute bottom-0 left-0 w-full p-8 bg-white border-t border-neutral-100 z-40">
        <button
          onClick={exportAsPng}
          disabled={isExporting}
          className="w-full py-6 bg-black text-white font-black uppercase tracking-widest rounded-3xl transition-all shadow-xl hover:bg-neutral-800"
        >
          {isExporting ? (
            <i className="fas fa-spinner fa-spin mr-3"></i>
          ) : (
            <i className="fas fa-rocket mr-3"></i>
          )}
          Export Master Bundle
        </button>
      </div>
    </div>
  );
};
