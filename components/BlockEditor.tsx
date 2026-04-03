
import React from 'react';
import { useCampaign } from '../CampaignContext';

export const BlockEditor: React.FC = () => {
  const {
    blocks,
    selectedBlockId,
    updateTextBlock,
    updateWordInBlock,
    addWordToBlock,
    removeWordFromBlock,
  } = useCampaign();

  const currentBlock = blocks.find(b => b.id === selectedBlockId);

  if (!currentBlock || currentBlock.type !== 'text') return null;

  return (
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
                <button onClick={() => removeWordFromBlock(currentBlock.id, idx)} className="text-neutral-300 hover:text-red-500">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="flex gap-2">
                {[
                  { key: 'isBold', icon: 'fa-bold' },
                  { key: 'isItalic', icon: 'fa-italic' },
                  { key: 'isUnderlined', icon: 'fa-underline' },
                  { key: 'isHighlighted', icon: 'fa-highlighter' },
                  { key: 'isCircled', icon: 'fa-circle' },
                ].map(style => (
                  <button
                    key={style.key}
                    onClick={() => updateWordInBlock(currentBlock.id, idx, { [style.key]: !(word as any)[style.key] })}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      (word as any)[style.key] ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-neutral-400 hover:text-indigo-600'
                    }`}
                  >
                    <i className={`fas ${style.icon} text-xs`}></i>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => addWordToBlock(currentBlock.id)}
            className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-2xl text-[10px] font-black uppercase text-neutral-400 hover:border-indigo-400 hover:text-indigo-600 transition-all"
          >
            <i className="fas fa-plus mr-2"></i> Add Word
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-black text-[10px] uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Block Properties</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between font-black text-[9px] text-neutral-400 uppercase">
              <span>Size Factor</span>
              <span>{currentBlock.fontSize}</span>
            </div>
            <input
              type="range"
              min="10"
              max="600"
              value={currentBlock.fontSize}
              onChange={e => updateTextBlock(currentBlock.id, { fontSize: parseInt(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between font-black text-[9px] text-neutral-400 uppercase">
              <span>Rotation</span>
              <span>{currentBlock.rotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={currentBlock.rotation}
              onChange={e => updateTextBlock(currentBlock.id, { rotation: parseInt(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
