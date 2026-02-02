import { json, error } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/forms/card/:cardId - Get form by Fizzy card ID
export const GET: RequestHandler = async ({ params }) => {
	const [form] = await db.select().from(forms).where(eq(forms.fizzyCardId, params.cardId));

	if (!form) {
		throw error(404, 'No form found for this card');
	}

	return json(form);
};
