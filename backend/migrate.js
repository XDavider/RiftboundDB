import pool from './db.js';

async function migrate() {
  try {
    await pool.query('ALTER TABLE decks ADD COLUMN IF NOT EXISTS description TEXT;');
    console.log('Migration successful: added description to decks');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
