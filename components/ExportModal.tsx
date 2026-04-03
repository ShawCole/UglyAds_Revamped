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
          Hook {currentHook}/{totalHooks} &middot; Size {currentSize}/{totalSizes}
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
