import React, { useEffect, useState } from 'react';
import { X, Shield, Swords, Zap, Loader2 } from 'lucide-react';

export default function CardDetailModal({ card, onClose }) {
  const [richData, setRichData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!card) return;
    setRichData(null);
    const fetchRichData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.riftcodex.com/cards/name?exact=${encodeURIComponent(card.name)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            setRichData(data.items[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch rich data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRichData();
  }, [card]);

  if (!card) return null;

  const displayCard = { ...card };
  if (richData) {
    displayCard.text_rich = richData.text?.rich || displayCard.text_rich;
    displayCard.text_plain = richData.text?.plain || displayCard.text_plain || displayCard.ability_text;
    
    if (richData.attributes) {
      if (richData.attributes.attack !== undefined) displayCard.attack = richData.attributes.attack;
      else if (richData.attributes.power !== undefined) displayCard.attack = richData.attributes.power;
      
      if (richData.attributes.health !== undefined) displayCard.health = richData.attributes.health;
      else if (richData.attributes.might !== undefined) displayCard.health = richData.attributes.might;

      if (richData.attributes.energy !== undefined) displayCard.energy_cost = richData.attributes.energy;
    }
  } else {
    displayCard.text_plain = displayCard.ability_text || displayCard.text_plain;
  }

  const isBattlefield = displayCard.card_type?.toLowerCase() === 'battlefield';

  const getPowerColorClasses = (domainStr) => {
    if (!domainStr) return { bg: 'bg-red-500/10', border: 'border-red-500/20', textLight: 'text-red-500/70', textBold: 'text-red-400', icons: [] };
    
    const domains = domainStr.split(',').map(d => d.trim()).filter(Boolean);
    const icons = domains.map(d => {
      const dNorm = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
      return `https://cdn.piltoverarchive.com/colors/${dNorm}.webp`;
    });

    const getColors = (d) => {
      switch (d.toLowerCase()) {
        case 'mind': return { from: 'from-blue-500/20', to: 'to-blue-500/20', bg: 'bg-blue-500/10', border: 'border-blue-500/20', light: 'text-blue-500/70', bold: 'text-blue-400' };
        case 'order': return { from: 'from-yellow-500/20', to: 'to-yellow-500/20', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', light: 'text-yellow-500/70', bold: 'text-yellow-400' };
        case 'body': return { from: 'from-orange-500/20', to: 'to-orange-500/20', bg: 'bg-orange-500/10', border: 'border-orange-500/20', light: 'text-orange-500/70', bold: 'text-orange-400' };
        case 'chaos': return { from: 'from-purple-500/20', to: 'to-purple-500/20', bg: 'bg-purple-500/10', border: 'border-purple-500/20', light: 'text-purple-500/70', bold: 'text-purple-400' };
        case 'fury': return { from: 'from-red-500/20', to: 'to-red-500/20', bg: 'bg-red-500/10', border: 'border-red-500/20', light: 'text-red-500/70', bold: 'text-red-400' };
        case 'calm': return { from: 'from-green-500/20', to: 'to-green-500/20', bg: 'bg-green-500/10', border: 'border-green-500/20', light: 'text-green-500/70', bold: 'text-green-400' };
        case 'life': return { from: 'from-green-500/20', to: 'to-green-500/20', bg: 'bg-green-500/10', border: 'border-green-500/20', light: 'text-green-500/70', bold: 'text-green-400' };
        case 'death': return { from: 'from-purple-500/20', to: 'to-purple-500/20', bg: 'bg-purple-500/10', border: 'border-purple-500/20', light: 'text-purple-500/70', bold: 'text-purple-400' };
        case 'elemental': return { from: 'from-orange-500/20', to: 'to-orange-500/20', bg: 'bg-orange-500/10', border: 'border-orange-500/20', light: 'text-orange-500/70', bold: 'text-orange-400' };
        default: return { from: 'from-red-500/20', to: 'to-red-500/20', bg: 'bg-red-500/10', border: 'border-red-500/20', light: 'text-red-500/70', bold: 'text-red-400' };
      }
    };

    if (domains.length <= 1) {
      const c = getColors(domains[0] || '');
      return { bg: c.bg, border: c.border, textLight: c.light, textBold: c.bold, icons };
    } else {
      const c1 = getColors(domains[0]);
      const c2 = getColors(domains[1]);
      return {
        bg: `bg-gradient-to-br ${c1.from} ${c2.to}`,
        border: `border-white/10`,
        textLight: `text-white/70`,
        textBold: `text-white`,
        icons
      };
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-12 animate-[fade-in_0.2s_ease-out]">
      <div 
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-5xl bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-dark-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-2 rounded-full backdrop-blur transition-colors"
        >
          <X size={24} />
        </button>

        {/* Left side: Image */}
        <div className="w-full md:w-1/2 lg:w-5/12 bg-dark-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-dark-700/50 relative overflow-y-auto hidden-scrollbar">
           <div className={`relative w-full max-w-sm rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] ${isBattlefield ? 'aspect-[88/63]' : 'aspect-[63/88]'}`}>
             {displayCard.image_url ? (
               <img src={displayCard.image_url} alt={displayCard.name} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full bg-dark-800 flex items-center justify-center text-slate-500">No Image Available</div>
             )}
           </div>
        </div>

        {/* Right side: Info */}
        <div className="w-full md:w-1/2 lg:w-7/12 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-3xl font-black text-white">{displayCard.name}</h2>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {displayCard.card_type && (
                <span className="px-3 py-1 rounded bg-dark-800 border border-dark-700 text-xs font-bold uppercase tracking-wider text-slate-300">
                  {displayCard.card_type}
                </span>
              )}
              {displayCard.element && displayCard.element.split(',').map(d => {
                const domain = d.trim();
                const dNorm = domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase();
                const colors = getPowerColorClasses(domain);
                return (
                  <span key={domain} className={`flex items-center gap-1.5 px-3 py-1 rounded ${colors.bg} border ${colors.border} text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                    <img src={`https://cdn.piltoverarchive.com/colors/${dNorm}.webp`} alt={domain} className="w-4 h-4 object-contain" onError={(e) => e.target.style.display = 'none'} />
                    {domain}
                  </span>
                );
              })}
              {displayCard.rarity && (
                <span className="px-3 py-1 rounded bg-purple-500/20 border border-purple-500/30 text-xs font-bold uppercase tracking-wider text-purple-400">
                  {displayCard.rarity}
                </span>
              )}
              {displayCard.set_name && (
                <span className="px-3 py-1 rounded bg-dark-800 border border-dark-700 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {displayCard.set_name}
                </span>
              )}
            </div>
          </div>

          <div className="h-px bg-dark-800 w-full my-1"></div>

          {/* Attributes */}
          {(displayCard.energy_cost !== undefined && displayCard.energy_cost !== null) || (displayCard.attack !== undefined && displayCard.attack !== null) || (displayCard.health !== undefined && displayCard.health !== null) ? (
            <div className="flex flex-wrap gap-4">
              {displayCard.energy_cost !== undefined && displayCard.energy_cost !== null && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
                  <Zap className="text-amber-500" size={24} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase text-amber-500/70">Energy</span>
                    <span className="text-2xl font-black text-amber-400 leading-none">{displayCard.energy_cost}</span>
                  </div>
                </div>
              )}
              {displayCard.attack !== undefined && displayCard.attack !== null && (() => {
                const colors = getPowerColorClasses(displayCard.element);
                return (
                  <div className={`flex items-center gap-3 ${colors.bg} border ${colors.border} px-4 py-2 rounded-xl`}>
                    <div className="flex -space-x-2">
                      {colors.icons.length > 0 ? colors.icons.map((icon, idx) => (
                        <img key={idx} src={icon} alt="Domain Rune" className="w-6 h-6 object-contain drop-shadow-md relative" style={{ zIndex: colors.icons.length - idx }} onError={(e) => e.target.style.display = 'none'} />
                      )) : (
                        <Swords className="text-red-500" size={24} />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold uppercase ${colors.textLight}`}>Power</span>
                      <span className={`text-2xl font-black ${colors.textBold} leading-none`}>{displayCard.attack}</span>
                    </div>
                  </div>
                );
              })()}
              {displayCard.health !== undefined && displayCard.health !== null && (
                <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl">
                  <Shield className="text-yellow-500" size={24} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase text-yellow-500/70">Might</span>
                    <span className="text-2xl font-black text-yellow-400 leading-none">{displayCard.health}</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Text Content */}
          <div className="flex-1 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center p-8 bg-dark-950/30 rounded-xl border border-dark-800 border-dashed">
                <Loader2 className="animate-spin text-primary-500" size={24} />
                <span className="ml-3 text-slate-400 text-sm">Loading card details...</span>
              </div>
            ) : displayCard.text_rich || displayCard.text_plain ? (
              <div className="bg-dark-950/50 border border-dark-800/50 rounded-xl p-5 shadow-inner">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Card Effect</h4>
                {displayCard.text_rich ? (
                  <div className="text-slate-200 text-sm md:text-base leading-relaxed prose prose-invert prose-p:my-2" dangerouslySetInnerHTML={{ __html: displayCard.text_rich }}></div>
                ) : (
                  <div className="text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap">{displayCard.text_plain}</div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-dark-950/30 rounded-xl border border-dark-800 border-dashed">
                <span className="text-slate-500 italic text-sm">No card text available</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
