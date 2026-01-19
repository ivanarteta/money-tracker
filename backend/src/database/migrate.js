import pool from '../config/database.js';

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Tabla de usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de movimientos (gastos e ingresos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS movements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
        amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
        category VARCHAR(100) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices para mejorar rendimiento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_movements_user_id ON movements(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_movements_user_date ON movements(user_id, date)
    `);

    await client.query('COMMIT');
    console.log('✅ Tablas creadas exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear tablas:', error);
    throw error;
  } finally {
    client.release();
  }
};

createTables()
  .then(() => {
    console.log('Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en migración:', error);
    process.exit(1);
  });
