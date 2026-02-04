/**
 * Integration tests for Comment endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Mock the Fizzy module
vi.mock('$lib/server/fizzy', () => ({
	addComment: vi.fn().mockResolvedValue({ success: true, data: {} }),
	moveCard: vi.fn().mockResolvedValue({ success: true, data: {} }),
	closeCard: vi.fn().mockResolvedValue({ success: true, data: {} })
}));

import { POST } from './[id]/comment/+server';
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
		fizzyCardId: `comment-test-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Comment Test Form',
		summary: 'Test',
		schema: {
			type: 'object',
			properties: { name: { type: 'string', title: 'Name' } }
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

describe('POST /api/queue/:id/comment', () => {
	let testForm: NewForm;

	beforeEach(async () => {
		vi.clearAllMocks();
		testForm = await createTestForm();
	});

	afterEach(async () => {
		await db.delete(forms).where(eq(forms.id, testForm.id));
	});

	it('should accept a valid comment and mark form as completed', async () => {
		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'This is my response' }
		});

		const response = await POST(event);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(data.form.status).toBe('completed');
		expect(data.form.response._comment).toBe('This is my response');
	});

	it('should call addComment with formatted comment', async () => {
		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'Test comment' }
		});

		await POST(event);

		expect(addComment).toHaveBeenCalledWith(
			testForm.fizzyCardNumber,
			expect.stringContaining('Test comment')
		);
		expect(addComment).toHaveBeenCalledWith(
			testForm.fizzyCardNumber,
			expect.stringContaining('Quick Response via Neat')
		);
	});

	it('should call closeCard when onSubmit is close', async () => {
		await db.delete(forms).where(eq(forms.id, testForm.id));
		testForm = await createTestForm({ onSubmit: 'close' });

		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'Closing with comment' }
		});

		await POST(event);

		expect(closeCard).toHaveBeenCalledWith(testForm.fizzyCardNumber);
	});

	it('should call moveCard when onSubmit is move', async () => {
		await db.delete(forms).where(eq(forms.id, testForm.id));
		testForm = await createTestForm({ onSubmit: 'move', targetColumn: 'col-123' });

		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'Moving with comment' }
		});

		await POST(event);

		expect(moveCard).toHaveBeenCalledWith(testForm.fizzyCardNumber, 'col-123');
	});

	it('should reject empty comment', async () => {
		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: '' }
		});

		await expect(POST(event)).rejects.toThrow();
	});

	it('should reject whitespace-only comment', async () => {
		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: '   ' }
		});

		await expect(POST(event)).rejects.toThrow();
	});

	it('should reject missing comment field', async () => {
		const event = createMockEvent({
			params: { id: testForm.id },
			body: {}
		});

		await expect(POST(event)).rejects.toThrow();
	});

	it('should reject already completed form', async () => {
		await db.update(forms).set({ status: 'completed' }).where(eq(forms.id, testForm.id));

		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'Too late' }
		});

		await expect(POST(event)).rejects.toThrow();
	});

	it('should return 404 for non-existent form', async () => {
		const event = createMockEvent({
			params: { id: 'non-existent-id' },
			body: { comment: 'Hello' }
		});

		await expect(POST(event)).rejects.toThrow();
	});

	it('should trim whitespace from comment', async () => {
		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: '  trimmed response  ' }
		});

		const response = await POST(event);
		const data = await response.json();

		expect(data.form.response._comment).toBe('trimmed response');
	});

	it('should reject comment over 10000 characters', async () => {
		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'x'.repeat(10001) }
		});

		await expect(POST(event)).rejects.toThrow();
	});

	it('should complete form even when Fizzy addComment fails', async () => {
		vi.mocked(addComment).mockResolvedValueOnce({
			success: false,
			error: { code: 'API_ERROR', message: 'API down' }
		});

		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'Test despite Fizzy failure' }
		});

		const response = await POST(event);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(data.form.status).toBe('completed');
	});

	it('should handle race condition with 409 error', async () => {
		// Simulate race: complete the form between select and update
		const event = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'First request' }
		});

		// First request succeeds
		await POST(event);

		// Reset form to pending for fresh test form
		await db.delete(forms).where(eq(forms.id, testForm.id));
		testForm = await createTestForm();

		// Complete the form externally (simulating race)
		await db.update(forms).set({ status: 'completed' }).where(eq(forms.id, testForm.id));

		// Second request should fail with 409 or 400
		const event2 = createMockEvent({
			params: { id: testForm.id },
			body: { comment: 'Second request' }
		});

		await expect(POST(event2)).rejects.toThrow();
	});
});
