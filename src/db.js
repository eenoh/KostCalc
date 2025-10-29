import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'kostcalc_user',
  password: process.env.DB_PASSWORD || 'kostcalc_pass',
  database: process.env.DB_NAME || 'kostcalc',
});

/**
 * Establish and verify a DB connection once at startup.
 * Console logs success or a concise error (no secrets).
 */
pool.connect()
  .then((client) => {
    console.log('Connected to PostgreSQL');
    client.release();
  })
  .catch((err) => {
    console.error('PostgreSQL connection error:', err.message);
  });

export default pool;
