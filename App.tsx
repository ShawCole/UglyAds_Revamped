
import React, { useState } from 'react';
import { CampaignProvider, useCampaign } from './CampaignContext';
import { Sidebar } from './components/Sidebar';
import { AdCanvas } from './components/AdCanvas';
import { CampaignBar } from './components/CampaignBar';
import { ExportModal } from './components/ExportModal';
import { BrandHub } from './components/BrandHub';
import { exportCampaign } from './campaignExporter';
import { RATIO_CONFIGS } from './constants';

// ─── Export progress state ──────────────────────────────────────────────────

interface ExportProgress {
  hookIndex: number;
  sizeIndex: number;
  totalHooks: number;
  totalSizes: number;
  totalImages: number;
  completedImages: number;
}

// ─── AppInner (consumes CampaignContext) ─────────────────────────────────────

const AppInner: React.FC = () => {
  const ctx = useCampaign();
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // ── Campaign export handler ──
  const handleExportCampaign = async () => {
    if (!ctx.activeCampaign) return;

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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-50 font-sans">
      <CampaignBar onExportCampaign={handleExportCampaign} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 relative flex flex-col overflow-hidden bg-neutral-200/50">
          {/* Workspace mode toggle bar */}
          <div className="h-20 bg-white flex items-center justify-center border-b border-neutral-100 shrink-0 z-10 px-10 relative">
            <div className="bg-neutral-100 p-1.5 rounded-full flex gap-1 shadow-inner relative z-10">
              <button
                onClick={() => ctx.setWorkspaceMode('single')}
                className={`px-10 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${ctx.workspaceMode === 'single' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                Single Ad
              </button>
              <button
                onClick={() => ctx.setWorkspaceMode('multi')}
                className={`px-10 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${ctx.workspaceMode === 'multi' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                Multi-View
              </button>
            </div>
          </div>

          {/* Single mode: ratio nav bar */}
          {ctx.workspaceMode === 'single' && (
            <nav className="h-20 bg-white border-b border-neutral-100 flex items-center justify-start gap-4 px-12 shrink-0 z-20 relative">
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 h-full">
                {RATIO_CONFIGS.map(r => (
                  <div key={r.value} className="shrink-0 relative">
                    <button
                      onClick={() => ctx.setActiveRatio(r.value)}
                      onMouseEnter={e => ctx.handleRatioHover(e, r)}
                      onMouseLeave={() => ctx.setHoveredRatio(null)}
                      className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${ctx.activeRatio === r.value ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
                    >
                      {r.label.split(' ')[0]}
                    </button>
                  </div>
                ))}
              </div>
            </nav>
          )}

          {/* Canvas area */}
          <div className={`flex-1 relative ${ctx.workspaceMode === 'single' ? 'overflow-hidden' : 'overflow-y-auto'} p-6 lg:p-12 bg-neutral-200/30 no-scrollbar z-0`}>
            {ctx.workspaceMode === 'single' ? (
              <div className="h-full w-full flex items-center justify-center">
                <AdCanvas ratio={ctx.activeRatio} containerRef={ctx.canvasRef} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-20 max-w-[1400px] mx-auto pb-64 items-start">
                {ctx.selectedSizes.map(ratio => {
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
      </div>

      {/* Export modal overlay */}
      <ExportModal
        isOpen={exportProgress !== null}
        currentHook={(exportProgress?.hookIndex ?? 0) + 1}
        totalHooks={exportProgress?.totalHooks ?? 0}
        currentSize={(exportProgress?.sizeIndex ?? 0) + 1}
        totalSizes={exportProgress?.totalSizes ?? 0}
        totalImages={exportProgress?.totalImages ?? 0}
        completedImages={exportProgress?.completedImages ?? 0}
      />

      {/* Brand Hub overlay */}
      <BrandHub />

      {/* Global Fixed Tooltip System */}
      {ctx.hoveredRatio && ctx.tooltipPos && (
        <div
          className="fixed pointer-events-none z-[99999] transform -translate-x-1/2 -translate-y-[calc(100%+12px)] animate-tooltip-pop"
          style={{ left: ctx.tooltipPos.x, top: ctx.tooltipPos.y }}
        >
          <div className="bg-black/95 backdrop-blur-3xl text-white px-6 py-4 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/20 flex flex-col items-center gap-1.5 min-w-[180px]">
            <span className="text-[11px] font-black uppercase tracking-widest leading-tight text-center text-white">{ctx.hoveredRatio.label}</span>
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none text-center">{ctx.hoveredRatio.description}</span>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em]">{ctx.hoveredRatio.dimensions}</span>
          </div>
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
        .ad-canvas-container { transition: width 0.4s ease, height 0.4s ease; }
      `}</style>
    </div>
  );
};

// ─── Root App ───────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <CampaignProvider>
    <AppInner />
  </CampaignProvider>
);

export default App;
