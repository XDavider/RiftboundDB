import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const runMigration = async () => {
  try {
    console.log('Running migration...');
    
    // Create decks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        legend_id VARCHAR(255) REFERENCES cards(id),
        champion_id VARCHAR(255) REFERENCES cards(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create deck_cards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_cards (
        deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
        card_id VARCHAR(255) REFERENCES cards(id),
        section VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (deck_id, card_id, section)
      );
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
};

runMigration();
