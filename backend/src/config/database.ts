import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from '../shared/utils/logger';

// Load environment variables
dotenv.config();

// Parse connection string and add SSL config
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Explicitly configure SSL for cloud database connections
const isCloudDatabase = connectionString.includes('neon.tech') ||
                        connectionString.includes('aws') ||
                        connectionString.includes('supabase');

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isCloudDatabase ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  logger.info('Database connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err });
  process.exit(-1);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Monkey patch the query method to add logging
  client.query = (...args: any[]) => {
    return originalQuery(...args);
  };

  // Monkey patch the release method to add logging
  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
}

export default pool;
