import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { dev } from '$app/environment';

// Database path - use data/ in dev, /opt/neat/data/ in prod
const DB_PATH = dev ? './data/neat.db' : '/opt/neat/data/neat.db';

// Lazy database connection
let _db: BetterSQLite3Database<typeof schema> | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
	if (!_db) {
		const sqlite = new Database(DB_PATH);
		sqlite.pragma('journal_mode = WAL');
		_db = drizzle(sqlite, { schema });
	}
	return _db;
}

// For convenience, export a proxy that lazily initializes
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
	get(_, prop) {
		return getDb()[prop as keyof BetterSQLite3Database<typeof schema>];
	}
});

// Re-export schema types
export * from './schema';
