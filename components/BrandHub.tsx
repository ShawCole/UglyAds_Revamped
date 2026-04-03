
import React from 'react';
import { useCampaign } from '../CampaignContext';

export const BrandHub: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    brands,
    setBrands,
    selectedBrandId,
    setSelectedBrandId,
    newBrandName,
    setNewBrandName,
  } = useCampaign();

  if (currentView !== 'brandHub') return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-screen bg-neutral-900 text-white font-sans overflow-hidden">
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
            <form
              onSubmit={e => {
                e.preventDefault();
                if (newBrandName.trim()) {
                  setBrands(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: newBrandName.trim(), description: '', assets: [] }]);
                  setNewBrandName('');
                }
              }}
              className="flex gap-4 w-full md:w-auto bg-white/5 p-2 rounded-3xl border border-white/10"
            >
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
                  <button onClick={e => { e.stopPropagation(); if (confirm('Wipe bucket?')) setBrands(p => p.filter(b => b.id !== brand.id)); }} className="text-white/10 hover:text-red-500 transition-all p-3">
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
};
