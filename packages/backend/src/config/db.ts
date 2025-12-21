import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool;

interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export async function connectDB(): Promise<pg.Pool> {
  if (!process.env.POSTGRES_USER || !process.env.POSTGRES_HOST || !process.env.POSTGRES_DB || 
      !process.env.POSTGRES_PASSWORD || !process.env.POSTGRES_PORT) {
    throw new Error('Missing required database environment variables');
  }

  const config: DatabaseConfig = {
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(config);

  // Test the connection
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected');
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err);
    throw err;
  }

  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDB() first.');
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
