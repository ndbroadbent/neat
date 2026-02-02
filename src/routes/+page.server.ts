import type { PageServerLoad } from './$types';
import { db, forms } from '$lib/server/db';
import { eq, asc, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Get next pending form (same logic as /api/queue)
	// Priority DESC (higher = more urgent), then oldest first
	const [nextForm] = await db
		.select()
		.from(forms)
		.where(eq(forms.status, 'pending'))
		.orderBy(desc(forms.priority), asc(forms.createdAt))
		.limit(1);

	return {
		form: nextForm ?? null
	};
};
