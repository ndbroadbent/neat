import { json, error } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { addComment, moveCard, closeCard } from '$lib/server/fizzy';
import type { RequestHandler } from './$types';

// POST /api/queue/:id/submit - Submit form response
export const POST: RequestHandler = async ({ params, request }) => {
	let body: { response?: unknown };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const { response } = body;

	// Validate response
	if (response === null || response === undefined) {
		throw error(400, 'Response data is required');
	}
	if (typeof response !== 'object' || Array.isArray(response)) {
		throw error(400, 'Response must be an object');
	}

	// Get the form
	const [form] = await db.select().from(forms).where(eq(forms.id, params.id));
	if (!form) {
		throw error(404, 'Form not found');
	}
	if (form.status !== 'pending') {
		throw error(400, 'Form already processed');
	}

	// Format response as comment
	const commentBody = formatResponseAsComment(form.title, response as Record<string, unknown>);

	// Post comment to Fizzy
	const commentResult = await addComment(form.fizzyCardNumber, commentBody);
	if (!commentResult.success) {
		throw error(500, `Failed to post comment: ${commentResult.error?.message}`);
	}

	// Handle onSubmit action
	if (form.onSubmit === 'close') {
		await closeCard(form.fizzyCardNumber);
	} else if (form.onSubmit === 'move' && form.targetColumn) {
		await moveCard(form.fizzyCardNumber, form.targetColumn);
	}

	// Update form in database
	const [updated] = await db
		.update(forms)
		.set({
			status: 'completed',
			response,
			completedAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(forms.id, params.id))
		.returning();

	return json({ success: true, form: updated });
};

// Format the response into a readable Fizzy comment
function formatResponseAsComment(title: string, response: Record<string, unknown>): string {
	const lines = ['📋 **Response via Neat**', ''];

	for (const [key, value] of Object.entries(response)) {
		// Convert camelCase to Title Case
		const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
		lines.push(`**${label}:** ${value}`);
	}

	lines.push(
		'',
		'---',
		`*Submitted ${new Date().toISOString().slice(0, 16).replace('T', ' ')} via Neat*`
	);

	return lines.join('\n');
}
