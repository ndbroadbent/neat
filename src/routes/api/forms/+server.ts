import { json } from '@sveltejs/kit';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { RequestHandler } from './$types';

// GET /api/forms - List all forms (with optional status filter)
export const GET: RequestHandler = async ({ url }) => {
	const status = url.searchParams.get('status') as 'pending' | 'completed' | 'skipped' | null;

	const result = status
		? await db.select().from(forms).where(eq(forms.status, status)).orderBy(forms.createdAt)
		: await db.select().from(forms).orderBy(forms.createdAt);

	return json(result);
};

// POST /api/forms - Create a new form
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as Omit<NewForm, 'id' | 'createdAt' | 'updatedAt'>;

	const newForm: NewForm = {
		id: nanoid(),
		...body,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const [created] = await db.insert(forms).values(newForm).returning();

	return json(created, { status: 201 });
};
