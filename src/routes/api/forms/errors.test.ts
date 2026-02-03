/**
 * Error handling tests for Forms API
 * Tests validation, error messages, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Import handlers
import { POST } from './+server';
import { GET as GET_BY_ID, PUT, DELETE } from './[id]/+server';

function createMockEvent(options: {
	url?: string;
	body?: unknown;
	params?: Record<string, string>;
	throwOnJson?: boolean;
}) {
	const url = new URL(options.url || 'http://localhost/api/forms');

	return {
		url,
		params: options.params || {},
		request: {
			json: options.throwOnJson
				? async () => {
						throw new SyntaxError('Unexpected token in JSON');
					}
				: async () => options.body
		}
	} as unknown;
}

async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: `error-test-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Error Test Form',
		summary: 'Test',
		schema: {
			type: 'object',
			properties: { field: { type: 'string', title: 'Test' } }
		},
		status: 'pending',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};

	await db.insert(forms).values(form);
	return form;
}

async function cleanupTestForms() {
	await db.delete(forms).where(eq(forms.title, 'Error Test Form'));
}

describe('Forms API Error Handling', () => {
	beforeEach(async () => {
		await cleanupTestForms();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	describe('POST /api/forms - Validation', () => {
		it('should handle malformed JSON body gracefully', async () => {
			const event = createMockEvent({ throwOnJson: true });

			await expect(POST(event as Parameters<typeof POST>[0])).rejects.toMatchObject({
				message: expect.stringContaining('JSON')
			});
		});

		it('should accept minimal valid form', async () => {
			const event = createMockEvent({
				body: {
					fizzyCardId: 'card-123',
					fizzyCardNumber: 123,
					title: 'Error Test Form',
					schema: { type: 'object', properties: {} }
				}
			});

			const response = await POST(event as Parameters<typeof POST>[0]);
			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data.id).toBeDefined();
			expect(data.status).toBe('pending'); // Default status
		});

		it('should preserve extra fields in body', async () => {
			const event = createMockEvent({
				body: {
					fizzyCardId: 'card-456',
					fizzyCardNumber: 456,
					title: 'Error Test Form',
					summary: 'Custom summary',
					schema: { type: 'object', properties: {} },
					priority: 5,
					references: [{ label: 'Doc', url: 'https://example.com', type: 'doc' }]
				}
			});

			const response = await POST(event as Parameters<typeof POST>[0]);
			const data = await response.json();

			expect(data.summary).toBe('Custom summary');
			expect(data.priority).toBe(5);
		});
	});

	describe('GET /api/forms/:id - Not Found', () => {
		it('should return 404 with helpful message for non-existent form', async () => {
			const event = createMockEvent({
				params: { id: 'definitely-does-not-exist' }
			});

			try {
				await GET_BY_ID(event as Parameters<typeof GET_BY_ID>[0]);
				expect.fail('Should have thrown');
			} catch (error: unknown) {
				const httpError = error as { status: number; body: { message: string } };
				expect(httpError.status).toBe(404);
				expect(httpError.body?.message).toBe('Form not found');
			}
		});

		it('should handle empty id parameter', async () => {
			const event = createMockEvent({ params: { id: '' } });

			await expect(GET_BY_ID(event as Parameters<typeof GET_BY_ID>[0])).rejects.toMatchObject({
				status: 404
			});
		});
	});

	describe('PUT /api/forms/:id - Update Validation', () => {
		it('should return 404 when updating non-existent form', async () => {
			const event = createMockEvent({
				params: { id: 'non-existent-id' },
				body: { title: 'New Title' }
			});

			await expect(PUT(event as Parameters<typeof PUT>[0])).rejects.toMatchObject({
				status: 404
			});
		});

		it('should allow partial updates', async () => {
			const form = await createTestForm();

			const event = createMockEvent({
				params: { id: form.id },
				body: { summary: 'Updated summary only' }
			});

			const response = await PUT(event as Parameters<typeof PUT>[0]);
			const data = await response.json();

			expect(data.summary).toBe('Updated summary only');
			expect(data.title).toBe('Error Test Form'); // Unchanged
		});

		it('should update the updatedAt timestamp', async () => {
			// Create form with an old timestamp
			const oldDate = new Date(Date.now() - 60000); // 1 minute ago
			const form = await createTestForm({ updatedAt: oldDate });

			const event = createMockEvent({
				params: { id: form.id },
				body: { title: 'Error Test Form' } // Keep same title for cleanup
			});

			const response = await PUT(event as Parameters<typeof PUT>[0]);
			const data = await response.json();

			expect(new Date(data.updatedAt).getTime()).toBeGreaterThan(oldDate.getTime());
		});

		it('should handle empty body', async () => {
			const form = await createTestForm();

			const event = createMockEvent({
				params: { id: form.id },
				body: {}
			});

			const response = await PUT(event as Parameters<typeof PUT>[0]);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.title).toBe('Error Test Form');
		});
	});

	describe('DELETE /api/forms/:id - Deletion', () => {
		it('should return 404 when deleting non-existent form', async () => {
			const event = createMockEvent({
				params: { id: 'non-existent-id' }
			});

			await expect(DELETE(event as Parameters<typeof DELETE>[0])).rejects.toMatchObject({
				status: 404
			});
		});

		it('should successfully delete existing form', async () => {
			const form = await createTestForm();

			const event = createMockEvent({
				params: { id: form.id }
			});

			const response = await DELETE(event as Parameters<typeof DELETE>[0]);
			expect(response.status).toBe(200);

			// Verify deleted
			const [deleted] = await db.select().from(forms).where(eq(forms.id, form.id));
			expect(deleted).toBeUndefined();
		});

		it('should return success response with correct format', async () => {
			const form = await createTestForm();

			const event = createMockEvent({
				params: { id: form.id }
			});

			const response = await DELETE(event as Parameters<typeof DELETE>[0]);
			const data = await response.json();

			expect(data).toEqual({ success: true });
		});
	});

	describe('Error Message Quality', () => {
		it('should not leak database internals in error messages', async () => {
			const event = createMockEvent({
				params: { id: "'; DROP TABLE forms; --" }
			});

			try {
				await GET_BY_ID(event as Parameters<typeof GET_BY_ID>[0]);
			} catch (error: unknown) {
				const httpError = error as { body?: { message?: string } };
				// Error message should be generic, not expose SQL details
				expect(httpError.body?.message).not.toContain('DROP');
				expect(httpError.body?.message).not.toContain('TABLE');
				expect(httpError.body?.message).not.toContain('SELECT');
			}
		});

		it('should provide actionable 404 messages', async () => {
			const event = createMockEvent({
				params: { id: 'abc123' }
			});

			try {
				await GET_BY_ID(event as Parameters<typeof GET_BY_ID>[0]);
			} catch (error: unknown) {
				const httpError = error as { status: number; body: { message: string } };
				expect(httpError.status).toBe(404);
				// Message should tell user what wasn't found
				expect(httpError.body.message.toLowerCase()).toContain('form');
				expect(httpError.body.message.toLowerCase()).toContain('not found');
			}
		});
	});
});
