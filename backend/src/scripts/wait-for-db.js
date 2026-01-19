import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'money_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const waitForDb = async (maxRetries = 30, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Base de datos conectada');
      await pool.end();
      process.exit(0);
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`⏳ Esperando base de datos... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ No se pudo conectar a la base de datos');
        await pool.end();
        process.exit(1);
      }
    }
  }
};

waitForDb();
