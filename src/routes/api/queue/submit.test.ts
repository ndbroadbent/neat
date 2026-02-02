/**
 * Integration tests for Submit endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Mock the Fizzy module with proper types
vi.mock('$lib/server/fizzy', () => ({
	addComment: vi.fn().mockResolvedValue({ success: true, data: {} }),
	moveCard: vi.fn().mockResolvedValue({ success: true, data: {} }),
	closeCard: vi.fn().mockResolvedValue({ success: true, data: {} })
}));

import { POST } from './[id]/submit/+server';
import { addComment, closeCard, moveCard } from '$lib/server/fizzy';

function createMockEvent(options: { params?: Record<string, string>; body?: unknown } = {}) {
	return {
		params: options.params || {},
		request: {
			json: async () => options.body
		}
	} as Parameters<typeof POST>[0];
}

async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: `submit-test-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Submit Test Form',
		summary: 'Test',
		schema: {
			type: 'object',
			properties: { choice: { type: 'string', title: 'Choice' } }
		},
		status: 'pending',
		onSubmit: 'comment',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};

	await db.insert(forms).values(form);
	return form;
}

async function cleanupTestForms() {
	await db.delete(forms).where(eq(forms.title, 'Submit Test Form'));
}

describe('Submit API Integration Tests', () => {
	beforeEach(async () => {
		await cleanupTestForms();
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	describe('POST /api/queue/:id/submit', () => {
		it('should submit form and post comment', async () => {
			const form = await createTestForm();
			const response_data = { choice: 'option-a' };

			const event = createMockEvent({
				params: { id: form.id },
				body: { response: response_data }
			});

			const response = await POST(event);
			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.form.status).toBe('completed');
			expect(data.form.response).toEqual(response_data);

			// Verify Fizzy was called
			expect(addComment).toHaveBeenCalledWith(
				form.fizzyCardNumber,
				expect.stringContaining('Response via Neat')
			);
		});

		it('should close card when onSubmit is close', async () => {
			const form = await createTestForm({ onSubmit: 'close' });

			const event = createMockEvent({
				params: { id: form.id },
				body: { response: { choice: 'yes' } }
			});

			await POST(event);

			expect(closeCard).toHaveBeenCalledWith(form.fizzyCardNumber);
		});

		it('should move card when onSubmit is move', async () => {
			const targetColumn = 'column-123';
			const form = await createTestForm({ onSubmit: 'move', targetColumn });

			const event = createMockEvent({
				params: { id: form.id },
				body: { response: { choice: 'yes' } }
			});

			await POST(event);

			expect(moveCard).toHaveBeenCalledWith(form.fizzyCardNumber, targetColumn);
		});

		it('should throw 404 for non-existent form', async () => {
			const event = createMockEvent({
				params: { id: 'non-existent' },
				body: { response: {} }
			});

			await expect(POST(event)).rejects.toMatchObject({
				status: 404
			});
		});

		it('should throw 400 for already completed form', async () => {
			const form = await createTestForm({ status: 'completed' });

			const event = createMockEvent({
				params: { id: form.id },
				body: { response: {} }
			});

			await expect(POST(event)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should throw 500 if Fizzy comment fails', async () => {
			vi.mocked(addComment).mockResolvedValueOnce({
				success: false,
				error: { code: 'api_error', message: 'API error' }
			});

			const form = await createTestForm();

			const event = createMockEvent({
				params: { id: form.id },
				body: { response: { choice: 'test' } }
			});

			await expect(POST(event)).rejects.toMatchObject({
				status: 500
			});
		});
	});
});
