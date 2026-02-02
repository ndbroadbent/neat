import { json, error } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// POST /api/queue/:id/skip - Skip form for now (will return later)
export const POST: RequestHandler = async ({ params }) => {
	const [form] = await db.select().from(forms).where(eq(forms.id, params.id));

	if (!form) {
		throw error(404, 'Form not found');
	}
	if (form.status !== 'pending') {
		throw error(400, 'Form already processed');
	}

	// Mark as skipped
	const [updated] = await db
		.update(forms)
		.set({
			status: 'skipped',
			updatedAt: new Date()
		})
		.where(eq(forms.id, params.id))
		.returning();

	return json({ success: true, form: updated });
};
