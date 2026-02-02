import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { dev } from '$app/environment';

// Database path - use data/ in dev, /opt/neat/data/ in prod
const DB_PATH = dev ? './data/neat.db' : '/opt/neat/data/neat.db';

// Create database connection
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL'); // Better concurrency

// Export drizzle instance with schema
export const db = drizzle(sqlite, { schema });

// Re-export schema types
export * from './schema';
