import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /health - Health check endpoint
export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		timestamp: new Date().toISOString()
	});
};
