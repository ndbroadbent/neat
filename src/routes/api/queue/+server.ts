import { json } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq, and, asc, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/queue - Get the next pending form (smart ordering)
// Test forms are excluded from the queue
export const GET: RequestHandler = async () => {
	// Priority DESC (higher = more urgent), then oldest first
	// Excludes test forms - they're for automated QA only
	const [nextForm] = await db
		.select()
		.from(forms)
		.where(and(eq(forms.status, 'pending'), eq(forms.isTest, false)))
		.orderBy(desc(forms.priority), asc(forms.createdAt))
		.limit(1);

	if (!nextForm) {
		return json({ form: null, message: 'No pending forms' });
	}

	return json({ form: nextForm });
};
