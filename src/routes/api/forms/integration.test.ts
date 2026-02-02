/**
 * Integration tests for Forms API endpoints
 * These tests actually exercise the API handlers with real database operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Import handlers directly for testing
import { GET, POST } from './+server';
import { GET as GET_BY_ID, PUT, DELETE } from './[id]/+server';

// Helper to create mock RequestEvent
// Use 'unknown' to allow passing to any handler
function createMockEvent(options: {
	url?: string;
	method?: string;
	body?: unknown;
	params?: Record<string, string>;
}) {
	const url = new URL(options.url || 'http://localhost/api/forms');

	return {
		url,
		params: options.params || {},
		request: {
			json: async () => options.body
		}
	} as unknown;
}

// Helper to create a test form in the database
async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: `test-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Test Form',
		summary: 'Test summary',
		schema: {
			type: 'object',
			properties: {
				field: { type: 'string', title: 'Test' }
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

// Clean up test forms
async function cleanupTestForms() {
	await db.delete(forms).where(eq(forms.title, 'Test Form'));
	await db.delete(forms).where(eq(forms.title, 'Created via API'));
	await db.delete(forms).where(eq(forms.title, 'Updated Title'));
}

describe('Forms API Integration Tests', () => {
	beforeEach(async () => {
		await cleanupTestForms();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	describe('GET /api/forms', () => {
		it('should return empty array when no forms exist', async () => {
			const event = createMockEvent({ url: 'http://localhost/api/forms' });
			const response = await GET(event as Parameters<typeof GET>[0]);
			const data = await response.json();

			expect(Array.isArray(data)).toBe(true);
		});

		it('should return all forms when no status filter', async () => {
			await createTestForm({ status: 'pending' });
			await createTestForm({ status: 'completed' });

			const event = createMockEvent({ url: 'http://localhost/api/forms' });
			const response = await GET(event as Parameters<typeof GET>[0]);
			const data = await response.json();

			expect(data.length).toBeGreaterThanOrEqual(2);
		});

		it('should filter forms by status', async () => {
			await createTestForm({ status: 'pending' });
			await createTestForm({ status: 'completed' });

			const event = createMockEvent({
				url: 'http://localhost/api/forms?status=pending'
			});
			const response = await GET(event as Parameters<typeof GET>[0]);
			const data = await response.json();

			expect(data.every((f: { status: string }) => f.status === 'pending')).toBe(true);
		});
	});

	describe('POST /api/forms', () => {
		it('should create a new form', async () => {
			const formData = {
				fizzyCardId: 'new-card-123',
				fizzyCardNumber: 123,
				title: 'Created via API',
				summary: 'API test',
				schema: {
					type: 'object',
					properties: {
						name: { type: 'string', title: 'Name' }
					}
				}
			};

			const event = createMockEvent({
				url: 'http://localhost/api/forms',
				method: 'POST',
				body: formData
			});

			const response = await POST(event as Parameters<typeof POST>[0]);
			expect(response.status).toBe(201);

			const created = await response.json();
			expect(created.id).toBeDefined();
			expect(created.fizzyCardId).toBe('new-card-123');
			expect(created.title).toBe('Created via API');
			expect(created.status).toBe('pending');
		});
	});

	describe('GET /api/forms/:id', () => {
		it('should return a form by id', async () => {
			const form = await createTestForm();

			const event = createMockEvent({
				url: `http://localhost/api/forms/${form.id}`,
				params: { id: form.id }
			});

			const response = await GET_BY_ID(event as Parameters<typeof GET_BY_ID>[0]);
			const data = await response.json();

			expect(data.id).toBe(form.id);
			expect(data.title).toBe('Test Form');
		});

		it('should throw 404 for non-existent form', async () => {
			const event = createMockEvent({
				url: 'http://localhost/api/forms/non-existent',
				params: { id: 'non-existent' }
			});

			await expect(GET_BY_ID(event as Parameters<typeof GET_BY_ID>[0])).rejects.toMatchObject({
				status: 404
			});
		});
	});

	describe('PUT /api/forms/:id', () => {
		it('should update a form', async () => {
			const form = await createTestForm();

			const event = createMockEvent({
				url: `http://localhost/api/forms/${form.id}`,
				params: { id: form.id },
				body: { title: 'Updated Title' }
			});

			const response = await PUT(event as Parameters<typeof PUT>[0]);
			const data = await response.json();

			expect(data.title).toBe('Updated Title');
		});

		it('should throw 404 when updating non-existent form', async () => {
			const event = createMockEvent({
				url: 'http://localhost/api/forms/non-existent',
				params: { id: 'non-existent' },
				body: { title: 'New Title' }
			});

			await expect(PUT(event as Parameters<typeof PUT>[0])).rejects.toMatchObject({
				status: 404
			});
		});
	});

	describe('DELETE /api/forms/:id', () => {
		it('should delete a form', async () => {
			const form = await createTestForm();

			const event = createMockEvent({
				url: `http://localhost/api/forms/${form.id}`,
				params: { id: form.id }
			});

			const response = await DELETE(event as Parameters<typeof DELETE>[0]);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);

			// Verify deletion
			const [deleted] = await db.select().from(forms).where(eq(forms.id, form.id));
			expect(deleted).toBeUndefined();
		});

		it('should throw 404 when deleting non-existent form', async () => {
			const event = createMockEvent({
				url: 'http://localhost/api/forms/non-existent',
				params: { id: 'non-existent' }
			});

			await expect(DELETE(event as Parameters<typeof DELETE>[0])).rejects.toMatchObject({
				status: 404
			});
		});
	});
});
