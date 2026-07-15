import React, { useState } from 'react';
import { Plus, Minus, Sparkles } from 'lucide-react';

export default function Card({ card, collection, onUpdate, onClickCard }) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const normalCount = collection?.normal_count || 0;
  const foilCount = collection?.foil_count || 0;

  const handleUpdate = async (type, delta) => {
    if (isUpdating) return;
    
    let newNormal = normalCount;
    let newFoil = foilCount;
    
    if (type === 'normal') {
      newNormal = Math.max(0, normalCount + delta);
    } else {
      newFoil = Math.max(0, foilCount + delta);
    }

    if (newNormal === normalCount && newFoil === foilCount) return;

    setIsUpdating(true);
    await onUpdate(card.id, newNormal, newFoil);
    setIsUpdating(false);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden flex flex-col transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-500/10 group">
      <div 
        className={`relative aspect-[2.5/3.5] w-full bg-dark-900 overflow-hidden ${onClickCard ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        onClick={() => onClickCard && onClickCard(card)}
      >
        {card.image_url ? (
          <img 
            src={card.image_url} 
            alt={card.name} 
            className={`w-full h-full transition-transform origin-center ${card.card_type?.toLowerCase() === 'battlefield' ? 'object-contain -rotate-90 scale-[1.35]' : 'object-cover'}`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            No Image
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-1 truncate" title={card.name}>{card.name}</h3>
        <p className="text-xs text-slate-400 mb-4">{card.set_name} • {card.card_type}</p>
        
        <div className="mt-auto space-y-3">
          {/* Normal Tracker */}
          <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-2 border border-dark-700">
            <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
              Normal
            </span>
            <div className="flex items-center gap-3">
              <button onClick={() => handleUpdate('normal', -1)} disabled={isUpdating} className="btn-icon w-7 h-7">
                <Minus size={14} />
              </button>
              <span className="font-bold w-4 text-center">{normalCount}</span>
              <button onClick={() => handleUpdate('normal', 1)} disabled={isUpdating} className="btn-icon w-7 h-7">
                <Plus size={14} />
              </button>
            </div>
          </div>
          
          {/* Foil Tracker */}
          <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-2 border border-dark-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
            <span className="text-sm font-medium text-amber-200/90 flex items-center gap-2 relative z-10">
              <Sparkles size={14} className="text-amber-400" />
              Foil
            </span>
            <div className="flex items-center gap-3 relative z-10">
              <button onClick={() => handleUpdate('foil', -1)} disabled={isUpdating} className="btn-icon w-7 h-7 text-amber-200/70 hover:text-amber-400 hover:bg-amber-500/20">
                <Minus size={14} />
              </button>
              <span className="font-bold w-4 text-center text-amber-100">{foilCount}</span>
              <button onClick={() => handleUpdate('foil', 1)} disabled={isUpdating} className="btn-icon w-7 h-7 text-amber-200/70 hover:text-amber-400 hover:bg-amber-500/20">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
