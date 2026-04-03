
import React from 'react';
import { useCampaign } from '../CampaignContext';

export const HookPanel: React.FC = () => {
  const { activeCampaign, activeHookId, loadHook } = useCampaign();
  if (!activeCampaign) return null;

  return (
    <section className="bg-neutral-50 p-6 rounded-[2.5rem] space-y-4 border border-neutral-100 shadow-sm">
      <h2 className="font-black text-neutral-800 text-xs uppercase tracking-widest">Hooks</h2>
      <div className="space-y-2">
        {activeCampaign.hooks.map(hook => (
          <button
            key={hook.id}
            onClick={() => loadHook(hook.id)}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all text-sm font-bold truncate ${
              activeHookId === hook.id
                ? 'bg-teal-50 border-teal-500 text-teal-700'
                : 'bg-white border-neutral-100 text-neutral-500 hover:border-teal-200'
            }`}
          >
            {hook.name}
          </button>
        ))}
      </div>
    </section>
  );
};
