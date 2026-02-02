import { json, error } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/forms/:id - Get a single form
export const GET: RequestHandler = async ({ params }) => {
	const [form] = await db.select().from(forms).where(eq(forms.id, params.id));

	if (!form) {
		throw error(404, 'Form not found');
	}

	return json(form);
};

// PUT /api/forms/:id - Update a form
export const PUT: RequestHandler = async ({ params, request }) => {
	const body = await request.json();

	const [updated] = await db
		.update(forms)
		.set({
			...body,
			updatedAt: new Date()
		})
		.where(eq(forms.id, params.id))
		.returning();

	if (!updated) {
		throw error(404, 'Form not found');
	}

	return json(updated);
};

// DELETE /api/forms/:id - Delete a form
export const DELETE: RequestHandler = async ({ params }) => {
	const [deleted] = await db.delete(forms).where(eq(forms.id, params.id)).returning();

	if (!deleted) {
		throw error(404, 'Form not found');
	}

	return json({ success: true });
};
