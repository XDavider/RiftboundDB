import fetch from 'node-fetch';
import 'dotenv/config';
import pool from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSchema() {
  console.log('Running schema.sql...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
  try {
    await pool.query('ALTER TABLE cards ADD COLUMN card_code VARCHAR(100);');
    console.log('Added card_code column.');
  } catch (e) {
    if (e.code !== '42701') console.error('Error adding card_code:', e);
  }
  console.log('Schema created successfully.');
}

async function seed() {
  try {
    await runSchema();

    let allCards = [];
    let currentPage = 1;
    let totalPages = 1;

    console.log('Fetching all cards from Riftcodex API...');

    do {
      console.log(`Fetching page ${currentPage} of ${totalPages}...`);
      const response = await fetch(`https://api.riftcodex.com/cards?page=${currentPage}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.pages) {
        totalPages = data.pages;
      }

      let cards = [];
      if (Array.isArray(data)) {
        cards = data;
      } else if (data && data.cards && Array.isArray(data.cards)) {
        cards = data.cards;
      } else if (data && data.data && Array.isArray(data.data)) {
        cards = data.data;
      } else if (data && data.items && Array.isArray(data.items)) {
        cards = data.items;
      } else {
        throw new Error('Unexpected data format from API');
      }

      allCards = allCards.concat(cards);
      currentPage++;
    } while (currentPage <= totalPages);

    console.log(`Found ${allCards.length} total cards. Inserting into database...`);

    for (const card of allCards) {
      // Map properties defensively based on common TCG API structures
      const id = card.id || card.cardCode || card.card_id || 'unknown_' + Math.random();
      
      const riftbound_id = card.riftbound_id || '';
      let cardCode = '';
      if (riftbound_id) {
         cardCode = riftbound_id.split('-').slice(0, 2).join('-').toUpperCase();
      }

      const name = card.name || 'Unknown Name';
      const setName = (card.set && card.set.label) || (typeof card.set === 'string' ? card.set : null) || card.set_name || card.setRef || 'Promo';
      const cardType = (card.classification && card.classification.type) || card.type || card.supertype || 'Card';
      
      let energyCost = 0;
      if (card.attributes && card.attributes.energy !== undefined) {
        energyCost = card.attributes.energy;
      } else if (card.cost !== undefined) {
        energyCost = card.cost;
      } else if (card.energy !== undefined) {
        energyCost = card.energy;
      }
      
      let element = 'Neutral';
      if (card.classification && card.classification.domain && Array.isArray(card.classification.domain)) {
        element = card.classification.domain.join(',');
      } else if (card.element) {
        element = Array.isArray(card.element) ? card.element.join(',') : card.element;
      } else if (card.region) {
        element = Array.isArray(card.region) ? card.region.join(',') : card.region;
      } else if (card.regionRef) {
        element = Array.isArray(card.regionRef) ? card.regionRef.join(',') : card.regionRef;
      }
      const rarity = (card.classification && card.classification.rarity) || card.rarity || card.rarityRef || 'Common';
      const abilityText = (card.text && card.text.plain) || card.text || card.description || card.descriptionRaw || '';
      const imageUrl = (card.media && card.media.image_url) || card.image_url || card.imageUrl || card.image || (card.assets && card.assets[0] && card.assets[0].gameAbsolutePath) || '';

      const query = `
        INSERT INTO cards (id, name, set_name, card_type, energy_cost, element, rarity, ability_text, image_url, card_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          set_name = EXCLUDED.set_name,
          card_type = EXCLUDED.card_type,
          energy_cost = EXCLUDED.energy_cost,
          element = EXCLUDED.element,
          rarity = EXCLUDED.rarity,
          ability_text = EXCLUDED.ability_text,
          image_url = EXCLUDED.image_url,
          card_code = EXCLUDED.card_code;
      `;
      const values = [id, name, setName, cardType, energyCost, element, rarity, abilityText, imageUrl, cardCode];

      await pool.query(query, values);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    pool.end();
  }
}

seed();
