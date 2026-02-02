/**
 * Tests for server hooks (request logging and error handling)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger module
vi.mock('$lib/server/logger', () => ({
	logRequest: vi.fn(),
	logError: vi.fn()
}));

import { handle, handleError } from './hooks.server';
import { logRequest, logError } from '$lib/server/logger';

describe('hooks.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('handle', () => {
		it('logs successful requests', async () => {
			const mockEvent = {
				request: {
					method: 'GET',
					headers: new Headers({ 'user-agent': 'test-agent' })
				},
				url: new URL('http://localhost/api/test')
			};
			const mockResponse = { status: 200 };
			const resolve = vi.fn().mockResolvedValue(mockResponse);

			const result = await handle({ event: mockEvent, resolve } as never);

			expect(result).toBe(mockResponse);
			expect(logRequest).toHaveBeenCalledWith('GET', '/api/test', 200, expect.any(Number), {
				userAgent: 'test-agent'
			});
		});

		it('logs POST requests', async () => {
			const mockEvent = {
				request: {
					method: 'POST',
					headers: new Headers()
				},
				url: new URL('http://localhost/api/submit')
			};
			const mockResponse = { status: 201 };
			const resolve = vi.fn().mockResolvedValue(mockResponse);

			await handle({ event: mockEvent, resolve } as never);

			expect(logRequest).toHaveBeenCalledWith('POST', '/api/submit', 201, expect.any(Number), {
				userAgent: undefined
			});
		});

		it('truncates long user-agent strings', async () => {
			const longUserAgent = 'a'.repeat(200);
			const mockEvent = {
				request: {
					method: 'GET',
					headers: new Headers({ 'user-agent': longUserAgent })
				},
				url: new URL('http://localhost/')
			};
			const mockResponse = { status: 200 };
			const resolve = vi.fn().mockResolvedValue(mockResponse);

			await handle({ event: mockEvent, resolve } as never);

			expect(logRequest).toHaveBeenCalledWith('GET', '/', 200, expect.any(Number), {
				userAgent: 'a'.repeat(100)
			});
		});
	});

	describe('handleError', () => {
		it('logs errors with context', async () => {
			const testError = new Error('Test error');
			const mockEvent = {
				request: {
					method: 'GET'
				},
				url: new URL('http://localhost/api/error')
			};

			const result = await handleError({
				error: testError,
				event: mockEvent,
				status: 500,
				message: 'Internal Server Error'
			} as never);

			expect(logError).toHaveBeenCalledWith(testError, {
				status: 500,
				message: 'Internal Server Error',
				method: 'GET',
				path: '/api/error'
			});
			expect(result).toEqual({ message: 'Internal Server Error' });
		});

		it('handles non-Error objects', async () => {
			const mockEvent = {
				request: { method: 'POST' },
				url: new URL('http://localhost/api/crash')
			};

			const result = await handleError({
				error: 'string error',
				event: mockEvent,
				status: 500,
				message: 'Something went wrong'
			} as never);

			expect(logError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
			expect(result).toEqual({ message: 'Something went wrong' });
		});

		it('uses default message when none provided', async () => {
			const mockEvent = {
				request: { method: 'GET' },
				url: new URL('http://localhost/api/fail')
			};

			const result = await handleError({
				error: new Error('crash'),
				event: mockEvent,
				status: 500,
				message: ''
			} as never);

			expect(result).toEqual({ message: 'Internal Server Error' });
		});
	});
});
