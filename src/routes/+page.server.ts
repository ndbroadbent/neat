import type { PageServerLoad } from './$types';
import { db, forms } from '$lib/server/db';
import { eq, asc, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Get ALL pending forms for navigation
	// Priority DESC (higher = more urgent), then oldest first
	const pendingForms = await db
		.select()
		.from(forms)
		.where(eq(forms.status, 'pending'))
		.orderBy(desc(forms.priority), asc(forms.createdAt));

	return {
		forms: pendingForms,
		form: pendingForms[0] ?? null // Keep for backwards compatibility
	};
};
