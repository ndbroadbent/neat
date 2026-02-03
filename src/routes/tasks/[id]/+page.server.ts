import { error } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq, or, asc, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	// Try to find form by ID first, then by fizzyCardNumber (as string)
	const [form] = await db
		.select()
		.from(forms)
		.where(or(eq(forms.id, id), eq(forms.fizzyCardNumber, parseInt(id, 10) || -1)));

	if (!form) {
		throw error(404, {
			message: `Form not found: ${id}`
		});
	}

	// Get all pending forms for navigation context
	const pendingForms = await db
		.select()
		.from(forms)
		.where(eq(forms.status, 'pending'))
		.orderBy(desc(forms.priority), asc(forms.createdAt));

	// Find position in queue if this is a pending form
	const queuePosition =
		form.status === 'pending' ? pendingForms.findIndex((f) => f.id === form.id) + 1 : null;

	return {
		form,
		forms: pendingForms,
		queuePosition,
		totalPending: pendingForms.length
	};
};
