/**
 * Tests for structured logging module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock pino before importing logger
vi.mock('pino', () => {
	const mockChild = vi.fn(() => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	}));

	const mockLogger = {
		child: mockChild,
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	};

	const mockPino = vi.fn(() => mockLogger);
	mockPino.stdTimeFunctions = {
		isoTime: () => `,"time":"2026-01-01T00:00:00.000Z"`
	};

	return {
		default: mockPino,
		pino: mockPino
	};
});

// Import after mocking
import logger, { httpLogger, fizzyLogger, dbLogger, logRequest, logError } from './logger';

describe('logger module', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('logger instances', () => {
		it('exports default logger', () => {
			expect(logger).toBeDefined();
		});

		it('exports httpLogger child', () => {
			expect(httpLogger).toBeDefined();
		});

		it('exports fizzyLogger child', () => {
			expect(fizzyLogger).toBeDefined();
		});

		it('exports dbLogger child', () => {
			expect(dbLogger).toBeDefined();
		});
	});

	describe('logRequest', () => {
		it('logs successful requests at info level', () => {
			logRequest('GET', '/api/test', 200, 15);
			expect(httpLogger.info).toHaveBeenCalledWith({
				method: 'GET',
				path: '/api/test',
				status: 200,
				durationMs: 15
			});
		});

		it('logs 4xx requests at warn level', () => {
			logRequest('POST', '/api/error', 400, 10);
			expect(httpLogger.warn).toHaveBeenCalledWith({
				method: 'POST',
				path: '/api/error',
				status: 400,
				durationMs: 10
			});
		});

		it('logs 5xx requests at error level', () => {
			logRequest('PUT', '/api/crash', 500, 5);
			expect(httpLogger.error).toHaveBeenCalledWith({
				method: 'PUT',
				path: '/api/crash',
				status: 500,
				durationMs: 5
			});
		});

		it('includes extra fields when provided', () => {
			logRequest('GET', '/api/test', 200, 15, { userId: '123' });
			expect(httpLogger.info).toHaveBeenCalledWith({
				method: 'GET',
				path: '/api/test',
				status: 200,
				durationMs: 15,
				userId: '123'
			});
		});
	});

	describe('logError', () => {
		it('logs error with stack trace', () => {
			const error = new Error('Test error');
			logError(error);
			expect(logger.error).toHaveBeenCalledWith({
				err: {
					message: 'Test error',
					name: 'Error',
					stack: expect.any(String)
				}
			});
		});

		it('includes context when provided', () => {
			const error = new Error('Context error');
			logError(error, { requestId: 'abc123' });
			expect(logger.error).toHaveBeenCalledWith({
				err: {
					message: 'Context error',
					name: 'Error',
					stack: expect.any(String)
				},
				requestId: 'abc123'
			});
		});
	});
});
