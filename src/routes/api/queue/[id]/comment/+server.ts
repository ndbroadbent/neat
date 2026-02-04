import { json, error } from '@sveltejs/kit';
import { db, forms } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { addComment, closeCard, moveCard } from '$lib/server/fizzy';
import type { RequestHandler } from './$types';

// POST /api/queue/:id/comment - Submit a quick comment response
export const POST: RequestHandler = async ({ params, request }) => {
	let body: { comment?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const { comment } = body;

	// Validate comment exists and is not empty
	if (!comment || typeof comment !== 'string') {
		throw error(400, 'Comment is required');
	}

	const trimmedComment = comment.trim();
	if (trimmedComment.length === 0) {
		throw error(400, 'Comment cannot be empty');
	}

	if (trimmedComment.length > 10000) {
		throw error(400, 'Comment is too long (max 10000 characters)');
	}

	// Get the form
	const [form] = await db.select().from(forms).where(eq(forms.id, params.id));
	if (!form) {
		throw error(404, 'Form not found');
	}
	if (form.status !== 'pending') {
		throw error(400, 'Form already processed');
	}

	// Format comment for Fizzy
	const commentBody = formatQuickComment(trimmedComment);

	// Post comment to Fizzy
	const commentResult = await addComment(form.fizzyCardNumber, commentBody);
	if (!commentResult.success) {
		console.error(
			`Failed to post comment to Fizzy card #${form.fizzyCardNumber}:`,
			JSON.stringify(commentResult.error ?? { message: 'Unknown error' })
		);
		// Still continue - we'll save the response locally even if Fizzy fails
	}

	// Handle onSubmit action (best effort)
	try {
		if (form.onSubmit === 'close') {
			await closeCard(form.fizzyCardNumber);
		} else if (form.onSubmit === 'move' && form.targetColumn) {
			await moveCard(form.fizzyCardNumber, form.targetColumn);
		}
	} catch (e) {
		console.error(`Failed to ${form.onSubmit} Fizzy card #${form.fizzyCardNumber}:`, e);
	}

	// Update form in database - mark as completed with comment response
	// Use atomic check-and-update to prevent race conditions
	const [updated] = await db
		.update(forms)
		.set({
			status: 'completed',
			response: { _comment: trimmedComment },
			completedAt: new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(forms.id, params.id), eq(forms.status, 'pending')))
		.returning();

	// If no row was updated, another request completed it first
	if (!updated) {
		throw error(409, 'Form was already processed by another request');
	}

	return json({ success: true, form: updated });
};

// Format a quick comment response
function formatQuickComment(comment: string): string {
	const lines = [
		'💬 **Quick Response via Neat**',
		'',
		comment,
		'',
		'---',
		`*Submitted ${new Date().toISOString().slice(0, 16).replace('T', ' ')} via Neat*`
	];

	return lines.join('\n');
}
