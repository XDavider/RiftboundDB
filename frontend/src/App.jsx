import React, { useState, useEffect, useRef } from 'react';
import Card from './components/Card';
import DeckManager from './components/DeckManager';
import CardDetailModal from './components/CardDetailModal';
import { Search, Filter, Layers, Database, Upload, Menu, X } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [allCards, setAllCards] = useState([]);
  const [collection, setCollection] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState('');
  const [cost, setCost] = useState('');
  const [type, setType] = useState([]);
  const [domain, setDomain] = useState([]);
  const [sortBy, setSortBy] = useState('Name');
  const [groupBy, setGroupBy] = useState('None');
  
  // UI State
  const [columns, setColumns] = useState(6);

  const [viewMode, setViewMode] = useState('all'); // 'all' or 'collection'
  const [mainTab, setMainTab] = useState('cards'); // 'cards' or 'decks'
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedCardForModal, setSelectedCardForModal] = useState(null);

  const fetchCards = async () => {
    try {
      const res = await fetch(`${API_URL}/cards`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      setAllCards(data);
    } catch (error) {
      console.error("Error fetching cards:", error);
    }
  };

  const cards = React.useMemo(() => {
    return allCards.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (rarity && c.rarity?.toLowerCase() !== rarity.toLowerCase()) return false;
      if (cost && c.energy_cost !== parseInt(cost)) return false;
      if (type.length > 0 && !type.some(t => c.card_type?.includes(t))) return false;
      if (domain.length > 0 && !domain.some(d => c.element?.includes(d))) return false;
      return true;
    });
  }, [allCards, search, rarity, cost, type, domain]);

  const fetchCollection = async () => {
    try {
      const res = await fetch(`${API_URL}/collection`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      
      const colMap = {};
      data.forEach(item => {
        colMap[item.id] = { normal_count: item.normal_count, foil_count: item.foil_count };
      });
      setCollection(colMap);
    } catch (error) {
      console.error("Error fetching collection:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCards(), fetchCollection()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleUpdateCollection = async (cardId, normalCount, foilCount) => {
    try {
      // Optimistic UI update
      setCollection(prev => ({
        ...prev,
        [cardId]: { normal_count: normalCount, foil_count: foilCount }
      }));

      const res = await fetch(`${API_URL}/collection/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, normal_count: normalCount, foil_count: foilCount })
      });
      
      if (!res.ok) throw new Error('Update failed');
      
      // Refresh to ensure sync
      await fetchCollection();
    } catch (error) {
      console.error("Error updating collection:", error);
      // Revert optimistic update by refetching
      fetchCollection();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      // Skip header if it exists (CardId,Normal,Foil...)
      if (lines[0].toLowerCase().includes('cardid')) {
        lines.shift();
      }

      const batchItems = [];
      lines.forEach(line => {
        // Parse CSV line properly handling quotes
        const match = line.match(/(?:"([^"]*)"|([^,]*))(?:,|$)/g);
        if (!match) return;
        const cols = match.map(m => m.replace(/,$/, '').replace(/^"|"$/g, '').trim());
        
        if (cols.length >= 3) {
           const cardCode = cols[0];
           const normalCount = parseInt(cols[1]) || 0;
           const foilCount = parseInt(cols[2]) || 0;
           
           let card = allCards.find(c => c.card_code && c.card_code.toLowerCase() === cardCode.toLowerCase());
           
           if (!card) {
             const baseCodeMatch = cardCode.match(/^([A-Z]+)-0*(\d+)/i);
             const baseCode = baseCodeMatch ? `${baseCodeMatch[1].toUpperCase()}-${baseCodeMatch[2]}` : cardCode.toUpperCase();
             card = allCards.find(c => {
               if (!c.card_code) return false;
               const dbCodeMatch = c.card_code.match(/^([A-Z]+)-0*(\d+)/i);
               const dbBaseCode = dbCodeMatch ? `${dbCodeMatch[1].toUpperCase()}-${dbCodeMatch[2]}` : c.card_code.toUpperCase();
               return dbBaseCode === baseCode;
             });
           }
           
           if (card) {
             batchItems.push({
                card_id: card.id,
                normal_count: normalCount,
                foil_count: foilCount
             });
           }
        }
      });

      if (batchItems.length > 0) {
        try {
          const res = await fetch(`${API_URL}/collection/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: batchItems })
          });
          if (res.ok) {
            await fetchCollection();
            alert(`Collection imported successfully! (${batchItems.length} entries updated)`);
          } else {
            alert('Failed to import collection.');
          }
        } catch (err) {
          console.error(err);
          alert('Error importing collection.');
        }
      } else {
        alert('No valid cards found in CSV.');
      }
      setUploading(false);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const totalCardsInCollection = Object.values(collection).reduce(
    (acc, val) => acc + (val.normal_count || 0) + (val.foil_count || 0), 0
  );
  
  const uniqueCardsOwned = Object.keys(collection).filter(id => {
      const c = collection[id];
      return (c.normal_count > 0 || c.foil_count > 0);
  }).length;
  
  const completionPercentage = allCards.length > 0 ? Math.round((uniqueCardsOwned / allCards.length) * 100) : 0;

  const displayedCards = [...(viewMode === 'collection' 
    ? cards.filter(c => collection[c.id]?.normal_count > 0 || collection[c.id]?.foil_count > 0)
    : cards)].sort((a, b) => {
      if (sortBy === 'Name') return a.name.localeCompare(b.name);
      if (sortBy === 'Cost') return (a.energy_cost || 0) - (b.energy_cost || 0) || a.name.localeCompare(b.name);
      return 0;
    });

  const getGroupedCards = () => {
    if (groupBy === 'None') return { 'All Cards': displayedCards };
    const groups = {};
    displayedCards.forEach(c => {
      let key = 'Other';
      if (groupBy === 'Type') key = c.card_type ? c.card_type.split(' - ')[0].trim() : 'Unknown';
      if (groupBy === 'Domain') key = c.element || 'Neutral';
      if (groupBy === 'Cost') key = c.energy_cost !== undefined && c.energy_cost !== null ? `Cost ${c.energy_cost}` : 'No Cost';
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    
    // Sort groups if needed
    if (groupBy === 'Cost') {
       return Object.keys(groups).sort((a, b) => {
         if (a === 'No Cost') return -1;
         if (b === 'No Cost') return 1;
         return parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]);
       }).reduce((acc, key) => ({...acc, [key]: groups[key]}), {});
    }
    
    return Object.keys(groups).sort().reduce((acc, key) => ({...acc, [key]: groups[key]}), {});
  };

  return (
    <div className="min-h-screen flex bg-dark-900 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar / Filters */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 glass-panel border-r border-dark-700/50 flex flex-col transition-transform duration-300 md:static md:translate-x-0 bg-dark-900/95 backdrop-blur-xl ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-dark-700/50 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent flex items-center gap-3">
                <img src="./favicon.ico" alt="Riftbound Logo" className="w-8 h-8" />
                Riftbound
              </h1>
              <p className="text-sm text-slate-400 mt-1">Collection Tracker</p>
            </div>
            <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setShowSidebar(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="flex gap-1 bg-dark-900 border border-dark-700 p-1 rounded-xl">
            <button 
              onClick={() => setMainTab('cards')} 
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mainTab === 'cards' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >Cards</button>
            <button 
              onClick={() => setMainTab('decks')} 
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mainTab === 'decks' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >Decks</button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Search size={16} /> Search
            </label>
            <input 
              type="text" 
              placeholder="Card name..." 
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Filter size={16} /> Rarity
            </label>
            <select 
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary-500 appearance-none"
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
            >
              <option value="">All Rarities</option>
              <option value="Common">Common</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Rare">Rare</option>
              <option value="Legendary">Legendary</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Database size={16} /> Energy Cost
            </label>
            <input 
              type="number" 
              min="0"
              placeholder="Any cost" 
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary-500"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2"><Layers size={16} /> Type</span>
              {type.length > 0 && <button onClick={() => setType([])} className="text-xs text-primary-400 hover:text-primary-300">Clear</button>}
            </label>
            <div className="flex flex-wrap gap-2">
              {['Unit', 'Spell', 'Battlefield', 'Gear', 'Legend', 'Rune'].map(t => (
                <button 
                  key={t}
                  onClick={() => setType(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${type.includes(t) ? 'bg-primary-600 text-white border-primary-500' : 'bg-dark-800 text-slate-400 hover:bg-dark-700 border border-dark-700'}`}
                >
                  <img src={`https://cdn.piltoverarchive.com/types/${t.toLowerCase()}.webp`} alt={t} className="w-4 h-4 object-contain" onError={(e) => e.target.style.display='none'} />
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2"><Database size={16} /> Domain</span>
              {domain.length > 0 && <button onClick={() => setDomain([])} className="text-xs text-primary-400 hover:text-primary-300">Clear</button>}
            </label>
            <div className="flex flex-wrap gap-2">
              {['Mind', 'Order', 'Body', 'Chaos', 'Fury', 'Calm'].map(d => (
                <button 
                  key={d}
                  onClick={() => setDomain(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${domain.includes(d) ? 'bg-primary-600 text-white border-primary-500' : 'bg-dark-800 text-slate-400 hover:bg-dark-700 border border-dark-700'}`}
                >
                  <img src={`https://cdn.piltoverarchive.com/colors/${d}.webp`} alt={d} className="w-4 h-4 object-contain" onError={(e) => e.target.style.display='none'} />
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Layers size={16} /> Sort By
            </label>
            <select 
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary-500 appearance-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="Name">Name</option>
              <option value="Cost">Energy Cost</option>
            </select>
          </div>

          <div className="space-y-2 pb-6">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Filter size={16} /> Group By
            </label>
            <select 
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary-500 appearance-none"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="None">None</option>
              <option value="Type">Card Type</option>
              <option value="Domain">Domain</option>
              <option value="Cost">Energy Cost</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      {mainTab === 'cards' ? (
        <main className="flex-1 flex flex-col h-screen overflow-hidden w-full relative z-10">
          {/* Topbar Stats */}
          <header className="glass-panel border-b border-dark-700/50 p-4 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between sticky top-0 z-10 gap-4 overflow-x-auto">
            <div className="flex flex-col gap-3 min-w-max">
              <div className="flex items-center gap-3">
                <button className="md:hidden p-2 bg-dark-800 rounded-lg text-slate-300 hover:text-white transition-colors" onClick={() => setShowSidebar(true)}>
                  <Menu size={20} />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">Your Collection</h2>
                  <p className="text-sm text-slate-400 hidden sm:block">Track and manage your physical cards</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 bg-dark-900 border border-dark-700 p-1 rounded-xl w-max">
                <button 
                  onClick={() => setViewMode('all')} 
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${viewMode === 'all' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'}`}
                >All Cards</button>
                <button 
                  onClick={() => setViewMode('collection')} 
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'collection' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'}`}
                >My Collection</button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploading}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed text-slate-500' : 'text-primary-400 hover:text-white hover:bg-dark-800'}`}
                >
                  <Upload size={16} /> {uploading ? 'Importing...' : 'Import CSV'}
                </button>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
            
            <div className="flex gap-4 items-center self-start sm:self-center">
              <div className="flex items-center gap-3 mr-2 bg-dark-900 border border-dark-700 rounded-xl px-4 py-2 hidden sm:flex">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Size</span>
                <input 
                  type="number" 
                  min="2" max="15" 
                  value={columns} 
                  onChange={e => setColumns(Number(e.target.value))} 
                  className="w-16 bg-dark-800 text-white border border-dark-700 rounded px-2 py-1 focus:outline-none focus:border-primary-500 text-sm" 
                />
              </div>
            
              <div className="bg-dark-900 border border-dark-700 rounded-xl px-4 py-2 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-primary-400">
                  {uniqueCardsOwned}<span className="text-sm text-slate-500 ml-1">/ {allCards.length}</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Cards</span>
              </div>
              <div className="bg-dark-900 border border-dark-700 rounded-xl px-4 py-2 flex flex-col items-center justify-center min-w-[90px]">
                <span className="text-2xl font-black text-amber-400">{completionPercentage}%</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Completion</span>
              </div>
            </div>
          </header>

          {/* Card Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {Object.entries(getGroupedCards()).map(([groupName, groupCards]) => (
                  <div key={groupName}>
                    {groupBy !== 'None' && (
                      <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-xl font-bold text-white tracking-wide">{groupName}</h3>
                        <div className="h-px bg-dark-700 flex-1"></div>
                        <span className="text-sm text-slate-500 font-medium">{groupCards.length} cards</span>
                      </div>
                    )}
                    <div className="grid gap-3 sm:gap-4 md:gap-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                      {groupCards.map(card => (
                        <Card 
                          key={card.id} 
                          card={card} 
                          collection={collection[card.id]} 
                          onUpdate={handleUpdateCollection} 
                          onClickCard={setSelectedCardForModal}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!loading && displayedCards.length === 0 && (
              <div className="w-full py-20 flex flex-col items-center justify-center text-slate-500">
                <Layers size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No cards found matching your filters.</p>
              </div>
            )}
          </div>
        </main>
      ) : (
        <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative z-10">
          <div className="md:hidden p-3 bg-dark-900 border-b border-dark-700 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
               <button className="p-2 bg-dark-800 rounded-lg text-slate-300 hover:text-white" onClick={() => setShowSidebar(true)}>
                 <Menu size={20} />
               </button>
               <h2 className="text-lg font-bold text-white">Decks</h2>
             </div>
          </div>
          <DeckManager 
            cards={cards} 
            collection={collection} 
            API_URL={API_URL} 
            columns={columns}
            setColumns={setColumns}
            setType={setType}
            setDomain={setDomain}
            setSearch={setSearch}
            onClickCard={setSelectedCardForModal}
          />
        </div>
      )}
      
      {/* Required for shimmer animation in tailwind */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />

      {/* Card Detail Modal */}
      <CardDetailModal 
        card={selectedCardForModal} 
        onClose={() => setSelectedCardForModal(null)} 
      />
    </div>
  );
}

export default App;
