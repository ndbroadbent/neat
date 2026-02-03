/**
 * Error handling tests for Queue API
 * Tests validation, edge cases, and error messages
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

import { POST as SUBMIT } from './[id]/submit/+server';
import { POST as SKIP } from './[id]/skip/+server';

function createSubmitEvent(options: {
	params?: Record<string, string>;
	body?: unknown;
	throwOnJson?: boolean;
}) {
	return {
		params: options.params || {},
		request: {
			json: options.throwOnJson
				? async () => {
						throw new SyntaxError('Unexpected token in JSON');
					}
				: async () => options.body
		}
	} as Parameters<typeof SUBMIT>[0];
}

function createSkipEvent(options: { params?: Record<string, string> }) {
	return {
		params: options.params || {}
	} as Parameters<typeof SKIP>[0];
}

async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: `queue-error-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Queue Error Test',
		summary: 'Test',
		schema: {
			type: 'object',
			properties: {
				choice: { type: 'string', title: 'Choice' }
			}
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
	await db.delete(forms).where(eq(forms.title, 'Queue Error Test'));
}

describe('Queue API Error Handling', () => {
	beforeEach(async () => {
		await cleanupTestForms();
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	describe('POST /api/queue/:id/submit - Input Validation', () => {
		it('should return 400 for malformed JSON', async () => {
			const form = await createTestForm();

			const event = createSubmitEvent({
				params: { id: form.id },
				throwOnJson: true
			});

			await expect(SUBMIT(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Invalid JSON in request body' }
			});
		});

		it('should return 400 for null response', async () => {
			const form = await createTestForm();

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: null }
			});

			await expect(SUBMIT(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Response data is required' }
			});
		});

		it('should return 400 for undefined response', async () => {
			const form = await createTestForm();

			const event = createSubmitEvent({
				params: { id: form.id },
				body: {}
			});

			await expect(SUBMIT(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Response data is required' }
			});
		});

		it('should return 400 for array response', async () => {
			const form = await createTestForm();

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: ['a', 'b'] }
			});

			await expect(SUBMIT(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Response must be an object' }
			});
		});

		it('should return 400 for primitive response', async () => {
			const form = await createTestForm();

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: 'just a string' }
			});

			await expect(SUBMIT(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Response must be an object' }
			});
		});
	});

	describe('POST /api/queue/:id/submit - Form State Validation', () => {
		it('should return 404 for non-existent form', async () => {
			const event = createSubmitEvent({
				params: { id: 'does-not-exist' },
				body: { response: { choice: 'test' } }
			});

			await expect(SUBMIT(event)).rejects.toMatchObject({
				status: 404,
				body: { message: 'Form not found' }
			});
		});

		it('should return 400 for already completed form', async () => {
			const form = await createTestForm({ status: 'completed' });

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: { choice: 'test' } }
			});

			await expect(SUBMIT(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Form already processed' }
			});
		});

		it('should return 400 for skipped form', async () => {
			const form = await createTestForm({ status: 'skipped' });

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: { choice: 'test' } }
			});

			await expect(SUBMIT(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Form already processed' }
			});
		});
	});

	describe('POST /api/queue/:id/submit - Schema Validation', () => {
		it('should return 400 with details for missing required field', async () => {
			const form = await createTestForm({
				schema: {
					type: 'object',
					required: ['name', 'email'],
					properties: {
						name: { type: 'string' },
						email: { type: 'string' }
					}
				}
			});

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: { name: 'John' } } // Missing email
			});

			try {
				await SUBMIT(event);
				expect.fail('Should have thrown');
			} catch (error: unknown) {
				const httpError = error as { status: number; body: { message: string } };
				expect(httpError.status).toBe(400);
				expect(httpError.body.message).toContain('Validation failed');
				expect(httpError.body.message).toContain('email');
			}
		});

		it('should return 400 with details for wrong type', async () => {
			const form = await createTestForm({
				schema: {
					type: 'object',
					properties: {
						age: { type: 'number' }
					}
				}
			});

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: { age: 'twenty five' } }
			});

			try {
				await SUBMIT(event);
				expect.fail('Should have thrown');
			} catch (error: unknown) {
				const httpError = error as { status: number; body: { message: string } };
				expect(httpError.status).toBe(400);
				expect(httpError.body.message).toContain('Validation failed');
				expect(httpError.body.message).toContain('number');
			}
		});

		it('should return 400 with details for invalid enum value', async () => {
			const form = await createTestForm({
				schema: {
					type: 'object',
					properties: {
						status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
					}
				}
			});

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: { status: 'unknown' } }
			});

			try {
				await SUBMIT(event);
				expect.fail('Should have thrown');
			} catch (error: unknown) {
				const httpError = error as { status: number; body: { message: string } };
				expect(httpError.status).toBe(400);
				expect(httpError.body.message).toContain('Validation failed');
				// Should mention allowed values
				expect(
					httpError.body.message.includes('enum') ||
						httpError.body.message.includes('equal to one of')
				).toBe(true);
			}
		});

		it('should accept empty object for schema with no required fields', async () => {
			const form = await createTestForm({
				schema: {
					type: 'object',
					properties: {
						optional: { type: 'string' }
					}
				}
			});

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: {} }
			});

			const response = await SUBMIT(event);
			const data = await response.json();

			expect(data.success).toBe(true);
		});
	});

	describe('POST /api/queue/:id/skip - Validation', () => {
		it('should return 404 for non-existent form', async () => {
			const event = createSkipEvent({ params: { id: 'does-not-exist' } });

			await expect(SKIP(event)).rejects.toMatchObject({
				status: 404
			});
		});

		it('should return 400 for completed form', async () => {
			const form = await createTestForm({ status: 'completed' });

			const event = createSkipEvent({ params: { id: form.id } });

			await expect(SKIP(event)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should return 400 for already skipped form', async () => {
			const form = await createTestForm({ status: 'skipped' });

			const event = createSkipEvent({ params: { id: form.id } });

			await expect(SKIP(event)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should successfully skip pending form', async () => {
			const form = await createTestForm({ status: 'pending' });

			const event = createSkipEvent({ params: { id: form.id } });
			const response = await SKIP(event);
			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.form.status).toBe('skipped');
		});
	});

	describe('Error Message Quality', () => {
		it('should provide specific validation error paths', async () => {
			const form = await createTestForm({
				schema: {
					type: 'object',
					required: ['name', 'email'],
					properties: {
						name: { type: 'string', title: 'Name' },
						email: { type: 'string', title: 'Email' }
					}
				}
			});

			const event = createSubmitEvent({
				params: { id: form.id },
				body: { response: { name: 'John' } } // Missing email
			});

			try {
				await SUBMIT(event);
			} catch (error: unknown) {
				const httpError = error as { body: { message: string } };
				// Should include the missing field name
				expect(httpError.body.message).toContain('email');
			}
		});

		it('should not expose internal implementation details', async () => {
			const event = createSubmitEvent({
				params: { id: 'non-existent' },
				body: { response: {} }
			});

			try {
				await SUBMIT(event);
			} catch (error: unknown) {
				const httpError = error as { body: { message: string } };
				// Should not contain stack traces or internal paths
				expect(httpError.body.message).not.toContain('.ts');
				expect(httpError.body.message).not.toContain('at ');
				expect(httpError.body.message).not.toContain('Error:');
			}
		});
	});
});
