import { json, error } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// POST /api/forms/:id/unskip - Restore skipped form to pending
export const POST: RequestHandler = async ({ params }) => {
	const [form] = await db.select().from(forms).where(eq(forms.id, params.id));

	if (!form) {
		throw error(404, 'Form not found');
	}
	if (form.status !== 'skipped') {
		throw error(400, 'Form is not skipped');
	}

	// Restore to pending
	const [updated] = await db
		.update(forms)
		.set({
			status: 'pending',
			updatedAt: new Date()
		})
		.where(eq(forms.id, params.id))
		.returning();

	return json({ success: true, form: updated });
};
