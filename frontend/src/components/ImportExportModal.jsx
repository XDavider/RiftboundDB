import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Upload, Check } from 'lucide-react';
import { getDeckFromCode, getCodeFromDeck } from '@piltoverarchive/riftbound-deck-codes';

export default function ImportExportModal({ isOpen, onClose, deckCards, deckName, setDeckCards, setDeckName, API_URL, onImportSuccess, initialMode = 'export' }) {
  const [mode, setMode] = useState(initialMode); // 'export' | 'import'
  const [format, setFormat] = useState('code'); // 'text' | 'code'
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialMode === 'export') {
        generateExport();
      }
    }
  }, [isOpen, initialMode, format, deckCards, deckName]);

  const generateExport = () => {
    const flat = {};
    deckCards.forEach(c => {
      const id = c.card ? c.card.id : c.card_id;
      flat[id] = (flat[id] || 0) + c.quantity;
    });

    if (format === 'text') {
      const sections = { legend: [], champion: [], main: [], battlefield: [], rune: [], sideboard: [] };
      deckCards.forEach(c => {
         const cardName = c.card ? c.card.name : c.name;
         if (sections[c.section]) {
           sections[c.section].push(`${c.quantity} ${cardName}`);
         }
      });
      let textLines = [];
      if (sections.legend.length) textLines.push(`Legend: ${sections.legend.join(' ')}`);
      if (sections.champion.length) textLines.push(`Champion: ${sections.champion.join(' ')}`);
      if (sections.main.length) textLines.push(`MainDeck: ${sections.main.join(' ')}`);
      if (sections.battlefield.length) textLines.push(`Battlefields: ${sections.battlefield.join(' ')}`);
      if (sections.rune.length) textLines.push(`Runes: ${sections.rune.join(' ')}`);
      if (sections.sideboard.length) textLines.push(`Sideboard: ${sections.sideboard.join(' ')}`);
      setExportText(textLines.join('\n'));
    } else if (format === 'code') {
      try {
        let mainDeckArr = [];
        let sideboardArr = [];
        let chosenChampion = undefined;

        deckCards.forEach(c => {
          // Priority to card_code, fallback to id
          let cardObj = c.card || c;
          let id = cardObj.card_code || cardObj.id || cardObj.card_id;
          
          if (c.section === 'sideboard') {
            sideboardArr.push({ cardCode: id, count: c.quantity });
          } else {
            mainDeckArr.push({ cardCode: id, count: c.quantity });
            if (c.section === 'champion') {
              chosenChampion = id;
            }
          }
        });
        const code = getCodeFromDeck(mainDeckArr, sideboardArr, chosenChampion);
        setExportText(code);
      } catch (e) {
        console.error(e);
        setExportText('Error generating code');
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    try {
      setError(null);
      setLoading(true);
      const text = importText.trim();
      if (!text) throw new Error("Input is empty.");

      let parsedCards = []; // { id, qty }
      let newName = "Imported Deck";

      // 1. Detect format
      if (text.startsWith('C') && !text.includes(' ') && !text.includes('\n')) {
        // CODE format
        const deckData = getDeckFromCode(text);
        deckData.mainDeck.forEach(c => {
           let targetSec = 'main';
           if (c.cardCode === deckData.chosenChampion) targetSec = 'champion';
           parsedCards.push({ id: c.cardCode, qty: c.count, targetSection: targetSec });
        });
        deckData.sideboard.forEach(c => {
           parsedCards.push({ id: c.cardCode, qty: c.count, targetSection: 'sideboard' });
        });
      } else {
        // Text format
        const sections = ['Legend:', 'Champion:', 'MainDeck:', 'Battlefields:', 'Runes:', 'Sideboard:'];
        let safeText = text;
        sections.forEach(s => {
          safeText = safeText.replace(new RegExp(s, 'gi'), ` |||${s}||| `);
        });
        
        const blocks = safeText.split('|||').map(b => b.trim()).filter(b => b);
        let currentSection = 'main';
        
        for (const block of blocks) {
           const lower = block.toLowerCase();
           if (lower === 'legend:') { currentSection = 'legend'; continue; }
           if (lower === 'champion:') { currentSection = 'champion'; continue; }
           if (lower === 'maindeck:') { currentSection = 'main'; continue; }
           if (lower === 'battlefields:') { currentSection = 'battlefield'; continue; }
           if (lower === 'runes:') { currentSection = 'rune'; continue; }
           if (lower === 'sideboard:') { currentSection = 'sideboard'; continue; }
           
           // Card list block
           const cardParts = block.split(/(?=\b\d+\s+)/).map(p => p.trim()).filter(p => p);
           for (const p of cardParts) {
              const match = p.match(/^(\d+)\s+(.+)$/);
              if (match) {
                 parsedCards.push({ qty: parseInt(match[1]), name: match[2].trim(), targetSection: currentSection });
              }
           }
        }
      }

      if (parsedCards.length === 0) throw new Error("No cards found in input.");

      // 2. Fetch all cards to resolve IDs
      const res = await fetch(`${API_URL}/cards?limit=10000`);
      const allCards = await res.json();
      const cardMap = {};
      allCards.forEach(c => cardMap[c.id] = c);

      // 3. Build new deck
      let newDeck = [];
      for (const p of parsedCards) {
        // Match by ID (or card_code) or Name
        const card = Object.values(cardMap).find(c => {
          if (p.id && (c.id === p.id || c.card_code === p.id)) return true;
          if (p.name) {
            const cName = c.name.toLowerCase();
            const pName = p.name.toLowerCase();
            return cName === pName || cName.replace(' - ', ', ') === pName || cName.replace(',', ' -') === pName;
          }
          return false;
        });

        if (!card) continue; // Skip unknown cards

        let section = p.targetSection || 'main';
        
        // Auto-correct section based on type if missing or default 'main'
        if (section === 'main') {
          const type = card.card_type?.toLowerCase();
          if (type === 'legend') section = 'legend';
          else if (type === 'rune') section = 'rune';
          else if (type === 'battlefield') section = 'battlefield';
        }

        newDeck.push({ card, section, quantity: p.qty });
      }

      // 4. Auto-assign Champion if missing
      const legend = newDeck.find(c => c.section === 'legend');
      const champion = newDeck.find(c => c.section === 'champion');
      
      if (legend && !champion) {
        const legBaseName = legend.card.name.split('-')[0].trim().toLowerCase();
        const potentialChamp = newDeck.find(c => c.section === 'main' && c.card.card_type?.toLowerCase() === 'unit' && c.card.name.toLowerCase().startsWith(legBaseName));
        
        if (potentialChamp) {
          if (potentialChamp.quantity > 1) {
            potentialChamp.quantity -= 1;
          } else {
            newDeck = newDeck.filter(c => c !== potentialChamp);
          }
          newDeck.push({ card: potentialChamp.card, section: 'champion', quantity: 1 });
        }
      }

      setDeckCards(newDeck);
      setDeckName(newName);
      setImportText('');
      onClose();
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to parse deck.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <header className="p-4 border-b border-dark-700 flex justify-between items-center bg-dark-800">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Upload size={20} />
            Import Deck
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors rounded hover:bg-dark-700">
            <X size={20} />
          </button>
        </header>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Text Area */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Paste Deck Data (TEXT or CODE)
            </label>
            <textarea
              className="w-full h-64 bg-dark-950 border border-dark-700 rounded-xl p-4 text-sm text-slate-300 font-mono focus:outline-none focus:border-primary-500 transition-colors resize-none"
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="Paste your deck code, json or text here..."
            />
            {error && mode === 'import' && (
              <p className="text-red-400 text-xs font-bold bg-red-500/10 p-2 rounded">{error}</p>
            )}
          </div>
        </div>

        <footer className="p-4 border-t border-dark-700 bg-dark-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
            <button onClick={handleImport} disabled={loading || !importText.trim()} className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg">
              {loading ? <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span> : <Upload size={16} />}
              Import Deck
            </button>
        </footer>
      </div>
    </div>
  );
}
