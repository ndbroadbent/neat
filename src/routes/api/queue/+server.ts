import { json } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq, asc, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/queue - Get the next pending form (smart ordering)
export const GET: RequestHandler = async () => {
	// Priority DESC (higher = more urgent), then oldest first
	// Future: context clustering for minimal context-switching
	const [nextForm] = await db
		.select()
		.from(forms)
		.where(eq(forms.status, 'pending'))
		.orderBy(desc(forms.priority), asc(forms.createdAt))
		.limit(1);

	if (!nextForm) {
		return json({ form: null, message: 'No pending forms' });
	}

	return json({ form: nextForm });
};
