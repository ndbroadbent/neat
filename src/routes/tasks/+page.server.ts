import { db, forms } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const statusFilter = url.searchParams.get('status');

	// Get all forms, ordered by priority then creation date
	const allForms = await db
		.select({
			id: forms.id,
			title: forms.title,
			summary: forms.summary,
			status: forms.status,
			priority: forms.priority,
			fizzyCardNumber: forms.fizzyCardNumber,
			createdAt: forms.createdAt,
			updatedAt: forms.updatedAt
		})
		.from(forms)
		.orderBy(desc(forms.priority), desc(forms.createdAt));

	// Count by status for filter badges (always from all forms)
	const counts = {
		pending: allForms.filter((f) => f.status === 'pending').length,
		skipped: allForms.filter((f) => f.status === 'skipped').length,
		completed: allForms.filter((f) => f.status === 'completed').length
	};

	// Apply filter for display
	const filteredForms =
		statusFilter && ['pending', 'skipped', 'completed'].includes(statusFilter)
			? allForms.filter((f) => f.status === statusFilter)
			: allForms;

	return {
		forms: filteredForms,
		counts,
		currentFilter: statusFilter
	};
};
