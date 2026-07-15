import 'dotenv/config';
import pool from './db.js';

async function check() {
  const legends = await pool.query("SELECT name FROM cards WHERE card_type ILIKE '%Legend%' LIMIT 5");
  console.log('Legends:', legends.rows);
  const units = await pool.query("SELECT name FROM cards WHERE card_type ILIKE '%Unit%' LIMIT 5");
  console.log('Units:', units.rows);
  pool.end();
}
check();
