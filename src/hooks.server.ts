/**
 * Server hooks for request logging
 *
 * Logs all HTTP requests with method, path, status, and duration.
 * Errors are logged with full stack traces.
 */

import type { Handle, HandleServerError } from '@sveltejs/kit';
import { logRequest, logError } from '$lib/server/logger';

export const handle: Handle = async ({ event, resolve }) => {
	const start = Date.now();

	const response = await resolve(event);

	const duration = Date.now() - start;
	logRequest(event.request.method, event.url.pathname, response.status, duration, {
		userAgent: event.request.headers.get('user-agent')?.slice(0, 100)
	});

	return response;
};

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
	const err = error instanceof Error ? error : new Error(String(error));

	logError(err, {
		status,
		message,
		method: event.request.method,
		path: event.url.pathname
	});

	// Return a generic error message to the client
	return {
		message: message || 'Internal Server Error'
	};
};
