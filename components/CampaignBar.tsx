import React from 'react';
import { useCampaign } from '../CampaignContext';
import { AVAILABLE_MODELS } from '../geminiService';

export const CampaignBar: React.FC<{ onExportCampaign: () => void }> = ({ onExportCampaign }) => {
  const { activeCampaign, aiModel, setAiModel, isBatchExporting } = useCampaign();

  return (
    <div className="h-14 bg-black flex items-center justify-between px-8 shrink-0 z-30">
      <span className="text-white font-black text-sm uppercase tracking-widest">
        {activeCampaign?.name || 'No Campaign'}
      </span>
      <div className="flex items-center gap-4">
        <select
          value={aiModel}
          onChange={e => setAiModel(e.target.value)}
          className="bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl border border-white/20 outline-none"
        >
          {AVAILABLE_MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <button
          onClick={onExportCampaign}
          disabled={isBatchExporting}
          className="bg-teal-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-teal-500 transition-all"
        >
          {isBatchExporting ? 'Exporting...' : 'Export Campaign'}
        </button>
      </div>
    </div>
  );
};
