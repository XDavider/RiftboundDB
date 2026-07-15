import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config'; // Esto busca el archivo .env automáticamente en la carpeta donde se ejecuta el proceso

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // <-- ¡MUY IMPORTANTE para que Supabase no te rechace la conexión segura!
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;