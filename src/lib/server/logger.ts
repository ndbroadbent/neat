/**
 * Structured logging with pino for Loki integration
 *
 * Outputs JSON logs that Loki can parse and index.
 * In development, logs are pretty-printed if pino-pretty is available.
 */

import pino from 'pino';
import { env } from '$env/dynamic/private';

// Base logger configuration
const logger = pino({
	level: env.LOG_LEVEL || 'info',
	// Always use JSON format for Loki compatibility
	// In dev, you can pipe through pino-pretty: bun run dev | pino-pretty
	formatters: {
		level: (label) => ({ level: label })
	},
	base: {
		app: 'neat',
		env: env.NODE_ENV || 'production'
	},
	timestamp: pino.stdTimeFunctions.isoTime
});

// Child logger for HTTP requests
export const httpLogger = logger.child({ component: 'http' });

// Child logger for Fizzy API interactions
export const fizzyLogger = logger.child({ component: 'fizzy' });

// Child logger for database operations
export const dbLogger = logger.child({ component: 'db' });

// Log a request with timing
export function logRequest(
	method: string,
	path: string,
	status: number,
	durationMs: number,
	extra?: Record<string, unknown>
) {
	const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
	httpLogger[level]({
		method,
		path,
		status,
		durationMs,
		...extra
	});
}

// Log an error with stack trace
export function logError(error: Error, context?: Record<string, unknown>) {
	logger.error({
		err: {
			message: error.message,
			name: error.name,
			stack: error.stack
		},
		...context
	});
}

export default logger;
