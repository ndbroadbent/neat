import { json } from '@sveltejs/kit';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { RequestHandler } from './$types';

// GET /api/forms - List all forms (with optional status filter)
// Test forms excluded by default; use ?includeTest=true to see them
export const GET: RequestHandler = async ({ url }) => {
	const status = url.searchParams.get('status') as 'pending' | 'completed' | 'skipped' | null;
	const includeTest = url.searchParams.get('includeTest') === 'true';

	// Build conditions based on params
	const baseQuery = db.select().from(forms);
	let result;

	if (status && !includeTest) {
		result = await baseQuery
			.where(and(eq(forms.status, status), eq(forms.isTest, false)))
			.orderBy(forms.createdAt);
	} else if (status) {
		result = await baseQuery.where(eq(forms.status, status)).orderBy(forms.createdAt);
	} else if (!includeTest) {
		result = await baseQuery.where(eq(forms.isTest, false)).orderBy(forms.createdAt);
	} else {
		result = await baseQuery.orderBy(forms.createdAt);
	}

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
