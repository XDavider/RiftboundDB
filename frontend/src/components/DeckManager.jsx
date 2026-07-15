import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Plus, Trash2, ChevronLeft, AlertCircle, CheckCircle2, Edit2, X, Download, Upload } from 'lucide-react';
import Card from './Card';
import ImportExportModal from './ImportExportModal';

export default function DeckManager({ cards, collection, API_URL, columns, setColumns, setType, setDomain, setSearch }) {
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null); // id of deck being edited, or 'new'
  const [previewDeck, setPreviewDeck] = useState(null); // id of deck being previewed
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Deck builder state
  const [deckCards, setDeckCards] = useState([]); // { card, section, quantity }
  const [deckName, setDeckName] = useState('New Deck');
  const [targetSection, setTargetSection] = useState(null); // Explicit target selection
  const [sidebarTab, setSidebarTab] = useState('deck'); // 'deck' or 'stats'
  const [previewSidebarTab, setPreviewSidebarTab] = useState('deck'); // 'deck' or 'stats'
  const [showImportExport, setShowImportExport] = useState(false);
  const [importExportInitialMode, setImportExportInitialMode] = useState('import');

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/decks`);
      const data = await res.json();
      setDecks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeckForEdit = async (id, data = null) => {
    try {
      setPreviewDeck(null);
      setPreviewData(null);
      
      let deckData = data;
      if (!deckData) {
        const res = await fetch(`${API_URL}/decks/${id}`);
        deckData = await res.json();
      }
      
      setCurrentDeck(deckData.id);
      setDeckName(deckData.name);
      setDeckCards(deckData.cards.map(c => ({
        card: { ...c, id: c.card_id }, // map db joined fields
        section: c.section,
        quantity: c.quantity
      })));
    } catch (err) {
      console.error(err);
    }
  };

  const openPreview = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/decks/${id}`);
      const data = await res.json();
      setPreviewDeck(id);
      setPreviewData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveDeck = async () => {
    try {
      const legend = deckCards.find(c => c.section === 'legend')?.card;
      const champion = deckCards.find(c => c.section === 'champion')?.card;
      
      const payload = {
        id: currentDeck === 'new' ? undefined : currentDeck,
        name: deckName,
        legend_id: legend?.id || null,
        champion_id: champion?.id || null,
        cards: deckCards.map(c => ({
          card_id: c.card.id,
          section: c.section,
          quantity: c.quantity
        }))
      };

      const res = await fetch(`${API_URL}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCurrentDeck(null); // Exit edit mode
        openPreview(data.id); // Go directly to preview
        fetchDecks(); // refresh list in background
      }
    } catch (err) {
      console.error(err);
      alert('Error saving deck');
    }
  };

  const deleteDeck = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deck?')) return;
    try {
      await fetch(`${API_URL}/decks/${id}`, { method: 'DELETE' });
      if (previewDeck === id) setPreviewDeck(null);
      fetchDecks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportDeck = async (id) => {
    try {
      const res = await fetch(`${API_URL}/decks/${id}`);
      const data = await res.json();
      setDeckCards(data.cards);
      setDeckName(data.name);
      setImportExportInitialMode('export');
      setShowImportExport(true);
    } catch (err) {
      console.error(err);
    }
  };

  const startNewDeck = () => {
    setPreviewDeck(null);
    setCurrentDeck('new');
    setDeckName('New Deck');
    setDeckCards([]);
    setTargetSection(null);
  };

  // --- Deck Builder Logic ---
  const addCardToDeck = (card) => {
    let section = targetSection;
    if (!section) {
      const type = card.card_type?.toLowerCase();
      if (type === 'legend') section = 'legend';
      else if (type === 'rune') section = 'rune';
      else if (type === 'battlefield') section = 'battlefield';
      else section = 'main'; // Default to main
    }

    setDeckCards(prev => {
      const existing = prev.find(c => c.card.id === card.id && c.section === section);
      const totalCopiesInDeck = prev.filter(c => c.card.id === card.id).reduce((sum, c) => sum + c.quantity, 0);
      const isBattlefield = card.card_type?.toLowerCase() === 'battlefield';
      const isRune = card.card_type?.toLowerCase() === 'rune';

      if (section === 'legend') return prev.filter(c => c.section !== 'legend').concat({ card, section, quantity: 1 });
      if (section === 'champion') {
        if (card.card_type?.toLowerCase() !== 'unit') {
          alert('Champion must be a Unit.');
          return prev;
        }
        if (totalCopiesInDeck >= 3 && !existing) {
          alert('Max 3 copies of this unit across the whole deck.');
          return prev;
        }
        return prev.filter(c => c.section !== 'champion').concat({ card, section, quantity: 1 });
      }
      
      let maxCopies = 3;
      if (isRune) maxCopies = 12;
      if (isBattlefield) maxCopies = 1; 
      
      const sectionTotal = prev.filter(c => c.section === section).reduce((sum, c) => sum + c.quantity, 0);
      
      if (existing) {
        if (totalCopiesInDeck >= maxCopies) return prev;
        if (section === 'main' && sectionTotal >= 39) return prev;
        if (section === 'rune' && sectionTotal >= 12) return prev;
        if (section === 'battlefield' && sectionTotal >= 3) return prev;
        if (section === 'sideboard' && sectionTotal >= 8) return prev;
        
        return prev.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c);
      } else {
        if (totalCopiesInDeck >= maxCopies) return prev;
        if (section === 'main' && sectionTotal >= 39) return prev;
        if (section === 'rune' && sectionTotal >= 12) return prev;
        if (section === 'battlefield' && sectionTotal >= 3) return prev;
        if (section === 'sideboard' && sectionTotal >= 8) return prev;
      }
      
      return [...prev, { card, section, quantity: 1 }];
    });
  };

  const removeCardFromDeck = (cardId, section) => {
    setDeckCards(prev => {
      const existing = prev.find(c => c.card.id === cardId && c.section === section);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map(c => c === existing ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c !== existing);
    });
  };

  const validation = useMemo(() => {
    const v = { errors: [], warnings: [] };
    const legend = deckCards.find(c => c.section === 'legend');
    if (!legend) v.errors.push('Missing Legend');

    const runes = deckCards.filter(c => c.section === 'rune');
    const totalRunes = runes.reduce((sum, c) => sum + c.quantity, 0);
    if (totalRunes !== 12) v.errors.push(`Runes: ${totalRunes}/12`);
    
    const runeDomains = new Set(runes.map(r => r.card.element).filter(Boolean));
    if (runeDomains.size > 2) v.errors.push(`Max 2 domains for Runes`);

    const battlefields = deckCards.filter(c => c.section === 'battlefield');
    const totalBF = battlefields.reduce((sum, c) => sum + c.quantity, 0);
    if (totalBF !== 3) v.errors.push(`Battlefields: ${totalBF}/3`);

    const main = deckCards.filter(c => c.section === 'main');
    const champion = deckCards.find(c => c.section === 'champion');
    let totalMain = main.reduce((sum, c) => sum + c.quantity, 0);
    if (champion) totalMain += 1;
    
    if (totalMain !== 40) v.errors.push(`Main Deck: ${totalMain}/40`);
    if (!champion) v.errors.push('Missing Champion');
    
    if (legend && champion) {
      const legName = legend.card.name.split('-')[0].trim().toLowerCase();
      const champName = champion.card.name.split('-')[0].trim().toLowerCase();
      if (legName !== champName) v.errors.push(`Champion doesn't match Legend`);
    }

    const sb = deckCards.filter(c => c.section === 'sideboard');
    const totalSb = sb.reduce((sum, c) => sum + c.quantity, 0);
    if (totalSb > 8) v.errors.push(`Sideboard: ${totalSb}/8`);

    return v;
  }, [deckCards]);

  const renderCardRow = (c) => {
    const owned = (collection[c.card.id]?.normal_count || 0) + (collection[c.card.id]?.foil_count || 0);
    const missing = Math.max(0, c.quantity - owned);
    
    return (
      <div 
        key={c.card.id + c.section} 
        className="relative group h-14 rounded-xl border border-dark-700 hover:border-primary-500 overflow-hidden cursor-pointer shadow-md mb-1.5 bg-dark-800" 
        onClick={() => removeCardFromDeck(c.card.id, c.section)}
      >
        <div className="absolute inset-0">
           {c.card.image_url && <img src={c.card.image_url} alt="" className="w-full h-full object-cover object-[center_30%] opacity-40 mix-blend-screen group-hover:scale-105 transition-transform" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/80 to-transparent flex items-center justify-between p-2 pointer-events-none">
          <div className="flex items-center gap-3">
             <div className="w-7 h-7 rounded border border-dark-600 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm text-primary-400 font-bold text-xs shadow-inner">
               x{c.quantity}
             </div>
             <span className="text-sm font-bold text-white drop-shadow-md truncate max-w-[160px]">{c.card.name}</span>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto pr-1">
            {missing > 0 && <span className="text-[10px] uppercase font-bold text-red-400 bg-red-950 px-1.5 py-0.5 rounded flex-shrink-0" title={`Missing ${missing}`}>-{missing}</span>}
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600/0 group-hover:bg-red-600 text-transparent group-hover:text-white transition-all shadow-sm">
              <Trash2 size={14} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ id, label, max, count, currentTarget, setTarget }) => (
    <h4 
      className={`text-xs uppercase font-bold mb-2 flex justify-between p-1 -mx-1 rounded cursor-pointer transition-colors ${currentTarget === id ? 'bg-primary-500/20 text-primary-400' : 'text-slate-500 hover:text-slate-300'}`}
      onClick={() => {
        const newTarget = currentTarget === id ? null : id;
        setTarget(newTarget);
        if (setType) {
          const legend = deckCards.find(c => c.section === 'legend');
          const legendDomains = legend ? legend.card.element.split(',').map(e => e.trim()) : [];
          
          if (newTarget === 'legend') { 
            setType(['Legend']); 
            if (setDomain) setDomain([]);
            if (setSearch) setSearch(''); 
          }
          else if (newTarget === 'rune') { 
            setType(['Rune']); 
            if (setDomain) setDomain(legendDomains);
            if (setSearch) setSearch(''); 
          }
          else if (newTarget === 'battlefield') { 
            setType(['Battlefield']); 
            if (setDomain) setDomain([]);
            if (setSearch) setSearch(''); 
          }
          else if (newTarget === 'champion') { 
            setType(['Unit']); 
            if (setDomain) setDomain([]);
            if (setSearch) {
              if (legend) {
                const legName = legend.card.name.split('-')[0].trim();
                setSearch(legName);
              } else {
                setSearch('');
              }
            }
          }
          else if (newTarget === 'main' || newTarget === 'sideboard') {
            setType(['Unit', 'Spell', 'Gear']);
            if (setDomain) setDomain(legendDomains);
            if (setSearch) setSearch('');
          }
          else { 
            setType([]); 
            if (setDomain) setDomain([]);
            if (setSearch) setSearch(''); 
          }
        }
      }}
      title="Click to force add cards to this section"
    >
      <span className="flex items-center gap-2">
        {label}
        {currentTarget === id && <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>}
      </span>
      <span className={`${count > max ? 'text-red-400' : ''}`}>{count}/{max}</span>
    </h4>
  );

  const getDomainGradients = (domains) => {
    const dList = (domains || []).filter(Boolean);
    if (dList.length === 0) return 'from-dark-800 to-dark-900';
    
    const colorMapFrom = {
      'chaos': 'from-red-900/90', 'order': 'from-blue-900/90', 'life': 'from-green-900/90',
      'death': 'from-purple-900/90', 'elemental': 'from-orange-900/90',
    };
    const colorMapTo = {
      'chaos': 'to-red-950/90', 'order': 'to-blue-950/90', 'life': 'to-green-950/90',
      'death': 'to-purple-950/90', 'elemental': 'to-orange-950/90',
    };
    
    const d1 = dList[0]?.toLowerCase();
    const d2 = dList[1]?.toLowerCase();
    
    if (dList.length === 1) return `${colorMapFrom[d1] || 'from-dark-800'} to-dark-950`;
    return `${colorMapFrom[d1] || 'from-dark-800'} ${colorMapTo[d2] || 'to-dark-950'}`;
  };

  const getDomainTextColor = (domain) => {
    const d = (domain || '').toLowerCase();
    if (d === 'mind') return 'text-blue-400';
    if (d === 'order') return 'text-yellow-400';
    if (d === 'body') return 'text-orange-500';
    if (d === 'chaos') return 'text-purple-500';
    if (d === 'fury') return 'text-red-500';
    if (d === 'calm') return 'text-green-500';
    return 'text-primary-400';
  };

  // --- View: Deck Preview ---
  if (previewDeck && previewData) {
    const pLegend = previewData.cards.find(c => c.section === 'legend');
    const pChampion = previewData.cards.find(c => c.section === 'champion');
    const pRunes = previewData.cards.filter(c => c.section === 'rune');
    const pBattlefields = previewData.cards.filter(c => c.section === 'battlefield');
    
    const pMainUnits = previewData.cards.filter(c => c.section === 'main' && c.card_type.toLowerCase() === 'unit');
    const pMainSpells = previewData.cards.filter(c => c.section === 'main' && c.card_type.toLowerCase() === 'spell');
    const pMainGears = previewData.cards.filter(c => c.section === 'main' && c.card_type.toLowerCase() === 'gear');
    const pSideboard = previewData.cards.filter(c => c.section === 'sideboard');

    const renderPreviewCard = (c, i) => (
      <div key={i} className="relative group aspect-[63/88] rounded-xl overflow-hidden border border-dark-700 shadow-md">
         <img src={c.image_url} alt={c.name} className="w-full h-full object-cover object-top" />
         <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black to-transparent text-center">
            {c.quantity > 1 && <span className="font-bold text-primary-400 bg-black/60 px-2 rounded-full text-xs">x{c.quantity}</span>}
         </div>
      </div>
    );

    const renderBattlefieldCard = (c, i) => (
      <div key={i} className="relative group aspect-[88/63] rounded-xl overflow-hidden border border-dark-700 shadow-md">
         <img src={c.image_url} alt={c.name} className="w-full h-full object-cover object-center" />
         <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black to-transparent text-center">
            {c.quantity > 1 && <span className="font-bold text-primary-400 bg-black/60 px-2 rounded-full text-xs">x{c.quantity}</span>}
         </div>
      </div>
    );

    const renderCardRowReadOnly = (c) => {
      return (
        <div 
          key={c.card_id + c.section} 
          className="relative group h-12 rounded-xl border border-dark-700 overflow-hidden shadow-md mb-1.5 bg-dark-800" 
        >
          <div className="absolute inset-0">
             {c.image_url && <img src={c.image_url} alt="" className="w-full h-full object-cover object-[center_30%] opacity-40 mix-blend-screen" />}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/80 to-transparent flex items-center justify-between p-2 pointer-events-none">
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded border border-dark-600 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm text-primary-400 font-bold text-xs shadow-inner">
                 x{c.quantity}
               </div>
               <span className="text-sm font-bold text-white drop-shadow-md truncate max-w-[180px]">{c.name}</span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="flex-1 flex h-screen overflow-hidden bg-dark-900">
        <div className="flex-1 flex flex-col h-full bg-dark-950 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-50 glass-panel border-b border-dark-700/50 p-3 flex justify-between items-center bg-dark-900/90 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-4">
              <button onClick={() => setPreviewDeck(null)} className="p-2 hover:bg-dark-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div>
                <h2 className="text-2xl font-black text-white drop-shadow-sm">{previewData.name}</h2>
                <p className="text-xs text-slate-400">Created: {new Date(previewData.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                setDeckCards(previewData.cards);
                setDeckName(previewData.name);
                setImportExportInitialMode('export');
                setShowImportExport(true);
              }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 text-sm">
                <Download size={16} /> Export Deck
              </button>
              <button onClick={() => loadDeckForEdit(previewData.id, previewData)} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-primary-500/20 text-sm">
                <Edit2 size={16} /> Edit Deck
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="p-4 w-full space-y-4 pb-8">
          
          {/* Commander Zone */}
          <section>
            <h3 className="text-sm font-black text-primary-400 uppercase tracking-widest mb-2 border-b border-dark-700 pb-1">Commander Zone</h3>
            <div className="flex flex-wrap items-end gap-6">
              {pLegend && (
                <div className="w-48 space-y-2">
                  <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Legend</div>
                  {renderPreviewCard(pLegend, 'leg')}
                </div>
              )}
              {pChampion && (
                <div className="w-48 space-y-2">
                  <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Champion</div>
                  {renderPreviewCard(pChampion, 'champ')}
                </div>
              )}
              {pBattlefields.length > 0 && (
                <div className="flex-1 space-y-2 min-w-[320px]">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Battlefields ({pBattlefields.reduce((a,c)=>a+c.quantity,0)})</div>
                  <div className="flex flex-wrap gap-4">
                     {pBattlefields.map((c, i) => (
                        <div key={i} className="w-64">
                          {renderBattlefieldCard(c, i)}
                        </div>
                     ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Runes */}
          {pRunes.length > 0 && (
            <section>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2 border-b border-dark-700 pb-1 flex gap-2 items-center">
                Runes <span className="text-[10px] font-bold text-slate-500 bg-dark-800 px-1.5 py-0.5 rounded-full">{pRunes.reduce((a,c)=>a+c.quantity,0)}/12</span>
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {pRunes.map((c, i) => renderPreviewCard(c, i))}
              </div>
            </section>
          )}

          {/* Main Deck */}
          <section>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2 border-b border-dark-700 pb-1 flex gap-2 items-center">
              Main Deck 
            </h3>
            
            <div className="space-y-4">
              {pMainUnits.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Units</h4>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                    {pMainUnits.map((c, i) => renderPreviewCard(c, i))}
                  </div>
                </div>
              )}
              {pMainSpells.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Spells</h4>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                    {pMainSpells.map((c, i) => renderPreviewCard(c, i))}
                  </div>
                </div>
              )}
              {pMainGears.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gears</h4>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                    {pMainGears.map((c, i) => renderPreviewCard(c, i))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {pSideboard.length > 0 && (
            <section>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-dark-700 pb-1 flex gap-2 items-center mt-6">
                Sideboard <span className="text-[10px] font-bold text-slate-600 bg-dark-800 px-1.5 py-0.5 rounded-full">{pSideboard.reduce((a,c)=>a+c.quantity,0)}/8</span>
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {pSideboard.map((c, i) => renderPreviewCard(c, i))}
              </div>
            </section>
          )}

        </div>
      </div>
      
      {/* Preview Sidebar */}
      <div className="w-[26rem] flex flex-col bg-dark-950 border-l border-dark-700/50 relative z-20 shadow-2xl">
        <div className="p-4 border-b border-dark-700 flex flex-col gap-3 bg-dark-900">
          <div className="flex gap-1 bg-dark-950 border border-dark-800 p-1 rounded-xl">
            <button 
              onClick={() => setPreviewSidebarTab('deck')} 
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${previewSidebarTab === 'deck' ? 'bg-dark-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >Decklist</button>
            <button 
              onClick={() => setPreviewSidebarTab('stats')} 
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${previewSidebarTab === 'stats' ? 'bg-dark-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >Statistics</button>
          </div>
        </div>
        
        {previewSidebarTab === 'deck' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {['legend', 'champion', 'rune', 'battlefield', 'main', 'sideboard'].map(sec => {
              const secCards = previewData.cards.filter(c => c.section === sec);
              if (secCards.length === 0 && sec !== 'main' && sec !== 'legend' && sec !== 'champion') return null;
              return (
                <div key={sec} className="bg-dark-900/50 p-2 rounded-xl border border-dark-800/50">
                  <h4 className="text-[10px] uppercase font-bold mb-2 flex justify-between p-1 -mx-1 text-slate-500">
                    <span className="flex items-center gap-2">
                      {sec === 'main' ? 'Main Deck' : sec.charAt(0).toUpperCase() + sec.slice(1)}
                    </span>
                    <span>{secCards.reduce((acc, c) => acc + c.quantity, 0)}/{sec === 'legend' || sec === 'champion' ? 1 : sec === 'rune' ? 12 : sec === 'battlefield' ? 3 : sec === 'main' ? 39 : 8}</span>
                  </h4>
                  <div className="space-y-0.5">{secCards.map(renderCardRowReadOnly)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const mainDeck = previewData.cards.filter(c => c.section === 'main' || c.section === 'champion');
              const totalCards = mainDeck.reduce((acc, c) => acc + c.quantity, 0);
              
              let totalEnergy = 0;
              let energyCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }; 
              let domainCounts = {};
              let typeCounts = { Unit:0, Spell:0, Gear:0 };

              mainDeck.forEach(c => {
                 const q = c.quantity;
                 if (c.energy_cost !== undefined && c.energy_cost !== null) {
                    totalEnergy += c.energy_cost * q;
                    const eCost = Math.min(7, c.energy_cost);
                    energyCounts[eCost] = (energyCounts[eCost] || 0) + q;
                 }
                 
                 const cType = c.card_type ? c.card_type.split(' - ')[0].trim() : 'Unknown';
                 if (typeCounts[cType] !== undefined) typeCounts[cType] += q;

                 const doms = c.element ? c.element.split(',').map(d => d.trim()) : ['Neutral'];
                 doms.forEach(d => {
                    domainCounts[d] = (domainCounts[d] || 0) + q;
                 });
              });

              const avgEnergy = totalCards > 0 ? (totalEnergy / totalCards).toFixed(1) : '0.0';
              const maxE = Math.max(...Object.values(energyCounts), 1);

              return (
                <div className="p-4 space-y-4">
                   {/* Top Stats */}
                   <div className="grid grid-cols-2 gap-2">
                      <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{totalCards}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-500">Cards</span>
                      </div>
                      <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-amber-400">{avgEnergy}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-500">Avg Energy</span>
                      </div>
                   </div>

                   {/* Energy Curve */}
                   <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                     <h4 className="text-xs uppercase font-bold text-slate-400 mb-4 flex items-center justify-between">
                        <span>Energy Curve</span>
                        <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Avg {avgEnergy}</span>
                     </h4>
                     <div className="flex items-end justify-between h-24 gap-1">
                       {[0,1,2,3,4,5,6,7].map(cost => {
                         const count = energyCounts[cost] || 0;
                         const height = (count / maxE) * 100;
                         return (
                           <div key={cost} className="flex flex-col items-center flex-1 h-full gap-1 group">
                             <div className="w-full bg-dark-900 rounded-t-sm h-full flex items-end justify-center">
                                <div className="w-full bg-amber-500 rounded-t-sm transition-all relative" style={{ height: `${height}%` }}>
                                   {count > 0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100">{count}</span>}
                                </div>
                             </div>
                             <span className="text-[10px] font-bold text-slate-500">{cost}{cost===7?'+':''}</span>
                           </div>
                         )
                       })}
                     </div>
                   </div>

                   {/* Types */}
                   <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                     <h4 className="text-xs uppercase font-bold text-slate-400 mb-3">Card Types</h4>
                     <div className="flex gap-2">
                       {Object.entries(typeCounts).filter(([k,v]) => v > 0).map(([type, count]) => (
                         <div key={type} className="flex items-center gap-1.5 bg-dark-900 px-2 py-1.5 rounded border border-dark-700 flex-1 justify-center shadow-inner">
                           <span className="text-sm font-black text-white">{count}</span>
                           <span className="text-[10px] uppercase text-slate-500">{type}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                   
                   {/* Domains */}
                   <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                     <h4 className="text-xs uppercase font-bold text-slate-400 mb-3">Domains</h4>
                     <div className="flex flex-wrap gap-2">
                       {Object.entries(domainCounts).map(([domain, count]) => (
                         <div key={domain} className="flex items-center gap-1.5 bg-dark-900 px-3 py-1.5 rounded border border-dark-700 shadow-inner">
                           <span className={`w-2 h-2 rounded-full ${getDomainTextColor(domain).replace('text-', 'bg-')}`}></span>
                           <span className="text-sm font-black text-white">{count}</span>
                           <span className="text-[10px] uppercase text-slate-500">{domain}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
    );
  }

  // --- View: List Decks ---
  if (currentDeck === null) {
    return (
      <div className="flex-1 flex flex-col h-screen bg-dark-900 overflow-y-auto">
        <header className="glass-panel border-b border-dark-700/50 p-6 flex justify-between items-center sticky top-0 z-50 shadow-md">
          <div>
            <h2 className="text-2xl font-black text-white">Your Decks</h2>
            <p className="text-sm text-slate-400">Manage and preview your custom decks</p>
          </div>
        </header>
        
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* New Deck Card */}
          <div 
            onClick={startNewDeck}
            className="relative glass-panel rounded-2xl border-2 border-dashed border-dark-600 hover:border-primary-500 hover:bg-primary-500/5 cursor-pointer flex flex-col items-center justify-center min-h-[320px] aspect-[63/88] transition-all duration-300 group overflow-hidden shadow-lg hover:shadow-primary-500/10"
          >
            <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 mb-4 shadow-inner">
              <Plus size={40} className="text-primary-500" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">Create New Deck</h3>
          </div>

          {/* Import Deck Card */}
          <div 
            onClick={() => { setImportExportInitialMode('import'); setShowImportExport(true); }}
            className="relative glass-panel rounded-2xl border-2 border-dashed border-dark-600 hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer flex flex-col items-center justify-center min-h-[320px] aspect-[63/88] transition-all duration-300 group overflow-hidden shadow-lg hover:shadow-blue-500/10"
          >
            <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 mb-4 shadow-inner">
              <Upload size={40} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">Import Deck</h3>
          </div>

          {loading ? (
             <div className="col-span-full flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500"></div></div>
          ) : (
            decks.map(deck => (
              <div 
                key={deck.id} 
                className="relative bg-dark-800 rounded-2xl border border-dark-700 hover:border-primary-500/70 transition-all duration-300 flex flex-col group overflow-hidden min-h-[320px] aspect-[63/88] cursor-pointer shadow-lg hover:shadow-primary-500/20"
                onClick={() => openPreview(deck.id)}
              >
                {/* Background Legend Image */}
                {deck.legend_image && (
                   <div className="absolute inset-0 z-0">
                     <img src={deck.legend_image} alt="Legend" className="w-full h-full object-cover object-[center_20%] opacity-40 group-hover:scale-110 transition-transform duration-700" />
                   </div>
                )}
                
                {/* Domain Gradient Overlay */}
                <div className={`absolute inset-0 z-10 bg-gradient-to-br ${getDomainGradients(deck.rune_domains)} opacity-10 group-hover:opacity-50 mix-blend-multiply transition-opacity duration-500`}></div>
                <div className={`absolute inset-0 z-10 bg-gradient-to-t from-dark-950/20 group-hover:from-dark-950/60 via-transparent to-transparent transition-colors duration-500`}></div>

                {/* Random Card Accents in background */}
                {deck.random_cards && deck.random_cards.length > 0 && (
                  <div className="absolute inset-x-0 bottom-8 h-48 opacity-0 group-hover:opacity-100 transition-all duration-500 z-30 flex justify-center items-end pointer-events-none">
                     {deck.random_cards.slice(0, 5).map((img, idx, arr) => {
                       const offset = idx - (arr.length - 1) / 2;
                       const rotation = offset * 12;
                       const translateX = offset * 35;
                       const translateY = Math.abs(offset) * Math.abs(offset) * 8;
                       return (
                         <div 
                           key={idx} 
                           className="absolute bottom-0 transition-all duration-300"
                           style={{ transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`, zIndex: 10 + idx }}
                         >
                           <div className="w-24 sm:w-28 aspect-[63/88] rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-dark-500 overflow-hidden transition-all duration-300 hover:scale-[1.6] hover:-translate-y-16 pointer-events-auto origin-bottom cursor-pointer hover:z-50 hover:rotate-0">
                             <img src={img} alt="Accent" className="w-full h-full object-cover" />
                           </div>
                         </div>
                       );
                     })}
                  </div>
                )}

                {/* Content */}
                <div className="relative z-20 p-6 flex flex-col h-full">
                  
                  {/* Delete Button - Top Right */}
                  <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExportDeck(deck.id); }} className="bg-blue-600/90 hover:bg-blue-500 text-white p-2.5 rounded-full shadow-lg backdrop-blur" title="Export Deck">
                      <Download size={18} />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteDeck(deck.id); }} className="bg-red-600/90 hover:bg-red-500 text-white p-2.5 rounded-full shadow-lg backdrop-blur" title="Delete Deck">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <h3 className="text-3xl font-black text-white drop-shadow-lg tracking-wide mb-1 leading-tight pr-10">{deck.name}</h3>
                  <p className="text-xs text-slate-300/80 font-medium mb-auto drop-shadow-md">Created: {new Date(deck.created_at).toLocaleDateString()}</p>
                  
                  {deck.champion_image && (
                     <div className="flex items-end justify-between mt-auto relative z-20 pointer-events-none">
                       <div className="w-32 sm:w-40 aspect-[63/88] rounded-xl border-2 border-primary-400 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8)] bg-dark-900 flex-shrink-0 -ml-4 -mb-4 transition-all duration-300 hover:scale-[2.2] hover:translate-x-12 hover:-translate-y-16 origin-bottom-left pointer-events-auto cursor-pointer z-50">
                         <img src={deck.champion_image} alt="Champion" className="w-full h-full object-cover object-top" />
                       </div>
                       
                       {deck.rune_counts && (
                         <div className="flex flex-col gap-1.5 items-end -mr-4 -mb-4 bg-dark-950/80 p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto">
                           {Object.entries(deck.rune_counts).map(([domain, count]) => (
                             <div key={domain} className="flex items-center gap-2 text-base font-black text-white drop-shadow-md">
                               {count} <span className={getDomainTextColor(domain)}>{domain}</span>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <ImportExportModal 
          isOpen={showImportExport}
          onClose={() => setShowImportExport(false)}
          deckCards={deckCards}
          deckName={deckName}
          setDeckCards={setDeckCards}
          setDeckName={setDeckName}
          API_URL={API_URL}
          initialMode={importExportInitialMode}
          onImportSuccess={() => setCurrentDeck('new')}
        />
      </div>
    );
  }

  // --- View: Deck Builder (Edit) ---
  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-dark-900">
      {/* Left: Card Catalog */}
      <div className="flex-1 flex flex-col border-r border-dark-700/50 overflow-hidden">
        <header className="glass-panel border-b border-dark-700/50 p-4 flex justify-between items-center bg-dark-800 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => {
              setCurrentDeck(null);
              if (setType) setType('');
              if (setDomain) setDomain([]);
            }} className="p-2 hover:bg-dark-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-white">Catalog</h2>
              <p className="text-xs text-slate-400">Click a card to add to deck {targetSection ? `(Adding to ${targetSection})` : '(Auto-assigned)'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-dark-900 border border-dark-700 rounded-xl px-3 py-1.5 hidden sm:flex">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Size</span>
            <input 
              type="number" min="2" max="15" value={columns} 
              onChange={e => setColumns && setColumns(Number(e.target.value))} 
              className="w-16 bg-dark-800 text-white border border-dark-700 rounded px-2 py-1 focus:outline-none focus:border-primary-500 text-sm" 
            />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(2, columns - 1)}, minmax(0, 1fr))` }}>
            {cards.map(card => (
              <div key={card.id} className="relative group cursor-pointer" onClick={() => addCardToDeck(card)}>
                <div className="pointer-events-none">
                  <Card card={card} collection={collection[card.id]} onUpdate={() => {}} />
                </div>
                <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/20 rounded-xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                   <Plus className="text-white drop-shadow-md" size={32} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Decklist */}
      <div className="w-[26rem] flex flex-col bg-dark-950 border-l border-dark-700/50 relative z-20 shadow-2xl">
        <div className="p-4 border-b border-dark-700 flex flex-col gap-3 bg-dark-900">
          <input 
            type="text" value={deckName} onChange={e => setDeckName(e.target.value)}
            className="bg-transparent text-xl font-bold text-white focus:outline-none focus:border-b focus:border-primary-500 px-1"
          />
          <div className="flex gap-2">
            <button onClick={saveDeck} className="flex-1 bg-primary-600 hover:bg-primary-500 text-white py-1.5 rounded font-bold text-sm transition-colors shadow-sm">
              Save Deck
            </button>
          </div>
          {validation.errors.length > 0 ? (
            <div className="bg-red-500/10 border border-red-500/30 p-2 rounded">
              <div className="flex items-center gap-1 text-red-400 text-xs font-bold mb-1"><AlertCircle size={12} /> Invalid Deck (Draft)</div>
              <ul className="text-[10px] text-red-300/80 list-disc pl-4">{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 p-2 rounded flex items-center gap-2 text-green-400 text-xs font-bold"><CheckCircle2 size={14} /> Legal Deck</div>
          )}
          
          <div className="flex gap-1 bg-dark-950 border border-dark-800 p-1 rounded-xl mt-2">
            <button 
              onClick={() => setSidebarTab('deck')} 
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${sidebarTab === 'deck' ? 'bg-dark-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >Decklist</button>
            <button 
              onClick={() => setSidebarTab('stats')} 
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${sidebarTab === 'stats' ? 'bg-dark-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >Statistics</button>
          </div>
        </div>
        
        {sidebarTab === 'deck' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {['legend', 'champion', 'rune', 'battlefield', 'main', 'sideboard'].map(sec => {
              const secCards = deckCards.filter(c => c.section === sec);
              return (
                <div key={sec} className="bg-dark-900/50 p-2 rounded-xl border border-dark-800/50">
                  <SectionHeader 
                    id={sec} 
                    label={sec === 'main' ? 'Main Deck' : sec.charAt(0).toUpperCase() + sec.slice(1)} 
                    max={sec === 'legend' || sec === 'champion' ? 1 : sec === 'rune' ? 12 : sec === 'battlefield' ? 3 : sec === 'main' ? 39 : 8} 
                    count={secCards.reduce((acc, c) => acc + c.quantity, 0)} 
                    currentTarget={targetSection} setTarget={setTargetSection} 
                  />
                  <div className="space-y-0.5">{secCards.map(renderCardRow)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const mainDeck = deckCards.filter(c => c.section === 'main' || c.section === 'champion');
              const totalCards = mainDeck.reduce((acc, c) => acc + c.quantity, 0);
              
              let totalEnergy = 0;
              let totalPower = 0;
              let energyCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }; 
              let powerCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0 }; 
              let domainCounts = {};
              let typeCounts = { Unit:0, Spell:0, Gear:0 };

              mainDeck.forEach(c => {
                 const q = c.quantity;
                 if (c.card.energy_cost !== undefined && c.card.energy_cost !== null) {
                    totalEnergy += c.card.energy_cost * q;
                    const eCost = Math.min(7, c.card.energy_cost);
                    energyCounts[eCost] = (energyCounts[eCost] || 0) + q;
                 }
                 if (c.card.power !== undefined && c.card.power !== null) {
                    totalPower += c.card.power * q;
                    const pCost = Math.min(5, c.card.power);
                    powerCounts[pCost] = (powerCounts[pCost] || 0) + q;
                 }
                 
                 const cType = c.card.card_type ? c.card.card_type.split(' - ')[0].trim() : 'Unknown';
                 if (typeCounts[cType] !== undefined) typeCounts[cType] += q;

                 const doms = c.card.element ? c.card.element.split(',').map(d => d.trim()) : ['Neutral'];
                 doms.forEach(d => {
                    domainCounts[d] = (domainCounts[d] || 0) + q;
                 });
              });

              const avgEnergy = totalCards > 0 ? (totalEnergy / totalCards).toFixed(1) : '0.0';
              const avgPower = totalCards > 0 ? (totalPower / totalCards).toFixed(1) : '0.0';

              const maxE = Math.max(...Object.values(energyCounts), 1);
              const maxP = Math.max(...Object.values(powerCounts), 1);

              return (
                <div className="p-4 space-y-4">
                   {/* Top Stats */}
                   <div className="grid grid-cols-2 gap-2">
                      <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{totalCards}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-500">Cards</span>
                      </div>
                      <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-amber-400">{avgEnergy}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-500">Avg Energy</span>
                      </div>
                   </div>

                   {/* Energy Curve */}
                   <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                     <h4 className="text-xs uppercase font-bold text-slate-400 mb-4 flex items-center justify-between">
                        <span>Energy Curve</span>
                        <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Avg {avgEnergy}</span>
                     </h4>
                     <div className="flex items-end justify-between h-24 gap-1">
                       {[0,1,2,3,4,5,6,7].map(cost => {
                         const count = energyCounts[cost] || 0;
                         const height = (count / maxE) * 100;
                         return (
                           <div key={cost} className="flex flex-col items-center flex-1 h-full gap-1 group">
                             <div className="w-full bg-dark-900 rounded-t-sm h-full flex items-end justify-center">
                                <div className="w-full bg-amber-500 rounded-t-sm transition-all relative" style={{ height: `${height}%` }}>
                                   {count > 0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100">{count}</span>}
                                </div>
                             </div>
                             <span className="text-[10px] font-bold text-slate-500">{cost}{cost===7?'+':''}</span>
                           </div>
                         )
                       })}
                     </div>
                   </div>

                   {/* Types */}
                   <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                     <h4 className="text-xs uppercase font-bold text-slate-400 mb-3">Card Types</h4>
                     <div className="flex gap-2">
                       {Object.entries(typeCounts).filter(([k,v]) => v > 0).map(([type, count]) => (
                         <div key={type} className="flex items-center gap-1.5 bg-dark-900 px-2 py-1.5 rounded border border-dark-700 flex-1 justify-center shadow-inner">
                           <span className="text-sm font-black text-white">{count}</span>
                           <span className="text-[10px] uppercase text-slate-500">{type}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                   
                   {/* Domains */}
                   <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                     <h4 className="text-xs uppercase font-bold text-slate-400 mb-3">Domains</h4>
                     <div className="flex flex-wrap gap-2">
                       {Object.entries(domainCounts).map(([domain, count]) => (
                         <div key={domain} className="flex items-center gap-1.5 bg-dark-900 px-3 py-1.5 rounded border border-dark-700 shadow-inner">
                           <span className={`w-2 h-2 rounded-full ${getDomainTextColor(domain).replace('text-', 'bg-')}`}></span>
                           <span className="text-sm font-black text-white">{count}</span>
                           <span className="text-[10px] uppercase text-slate-500">{domain}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      
      <ImportExportModal 
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        deckCards={deckCards}
        deckName={deckName}
        setDeckCards={setDeckCards}
        setDeckName={setDeckName}
        API_URL={API_URL}
        initialMode={importExportInitialMode}
        onImportSuccess={() => setCurrentDeck('new')}
      />
    </div>
  );
}
