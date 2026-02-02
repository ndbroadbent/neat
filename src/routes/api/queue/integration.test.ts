/**
 * Integration tests for Queue API endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Import handlers
import { GET } from './+server';

// Helper to create mock RequestEvent
function createMockEvent(options: { url?: string; params?: Record<string, string> } = {}) {
	const url = new URL(options.url || 'http://localhost/api/queue');
	return {
		url,
		params: options.params || {}
	} as Parameters<typeof GET>[0];
}

// Helper to create a test form
async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: `queue-test-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Queue Test Form',
		summary: 'Test',
		schema: {
			type: 'object',
			properties: { field: { type: 'string', title: 'Test' } }
		},
		status: 'pending',
		priority: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};

	await db.insert(forms).values(form);
	return form;
}

async function cleanupTestForms() {
	await db.delete(forms).where(eq(forms.title, 'Queue Test Form'));
	await db.delete(forms).where(eq(forms.title, 'High Priority'));
	await db.delete(forms).where(eq(forms.title, 'Low Priority'));
}

describe('Queue API Integration Tests', () => {
	beforeEach(async () => {
		await cleanupTestForms();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	describe('GET /api/queue', () => {
		it('should return null form when queue is empty', async () => {
			const event = createMockEvent();
			const response = await GET(event);
			const data = await response.json();

			expect(data.form).toBeNull();
		});

		it('should return the first pending form', async () => {
			await createTestForm({ title: 'Queue Test Form' });

			const event = createMockEvent();
			const response = await GET(event);
			const data = await response.json();

			expect(data.form).toBeDefined();
			expect(data.form.title).toBe('Queue Test Form');
			expect(data.form.status).toBe('pending');
		});

		it('should return higher priority forms first', async () => {
			await createTestForm({ title: 'Low Priority', priority: 1 });
			await createTestForm({ title: 'High Priority', priority: 10 });

			const event = createMockEvent();
			const response = await GET(event);
			const data = await response.json();

			expect(data.form.title).toBe('High Priority');
		});

		it('should not return completed forms', async () => {
			await createTestForm({ status: 'completed' });

			const event = createMockEvent();
			const response = await GET(event);
			const data = await response.json();

			expect(data.form).toBeNull();
		});

		it('should not return skipped forms', async () => {
			await createTestForm({ status: 'skipped' });

			const event = createMockEvent();
			const response = await GET(event);
			const data = await response.json();

			expect(data.form).toBeNull();
		});
	});
});
