import pool from './db.js';

async function run() {
  const res = await pool.query("SELECT name, card_type, element FROM cards WHERE card_type = 'Legend' LIMIT 5");
  console.log('Legends:', res.rows);
  
  const res2 = await pool.query("SELECT name, card_type, element FROM cards WHERE name ILIKE '%Ahri%'");
  console.log('Ahri:', res2.rows);

  const res3 = await pool.query("SELECT DISTINCT card_type FROM cards");
  console.log('Types:', res3.rows);

  const res4 = await pool.query("SELECT DISTINCT element FROM cards");
  console.log('Domains:', res4.rows);

  pool.end();
}
run();
