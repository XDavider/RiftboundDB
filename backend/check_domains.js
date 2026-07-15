import 'dotenv/config';
import pool from './db.js';

async function check() {
  const c = await pool.query("SELECT name, card_type, element FROM cards WHERE element LIKE '%/%' OR element LIKE '%,%' OR element LIKE '% %' LIMIT 20");
  console.log('Dual domains:', c.rows);
  pool.end();
}
check();
