/**
 * Integration tests for Skip endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { POST } from './[id]/skip/+server';

function createMockEvent(options: { params?: Record<string, string> } = {}) {
	return {
		params: options.params || {}
	} as Parameters<typeof POST>[0];
}

async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: `skip-test-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Skip Test Form',
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
	await db.delete(forms).where(eq(forms.title, 'Skip Test Form'));
}

describe('Skip API Integration Tests', () => {
	beforeEach(async () => {
		await cleanupTestForms();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	describe('POST /api/queue/:id/skip', () => {
		it('should skip a pending form', async () => {
			const form = await createTestForm();

			const event = createMockEvent({ params: { id: form.id } });
			const response = await POST(event);
			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.form.status).toBe('skipped');
		});

		it('should throw 404 for non-existent form', async () => {
			const event = createMockEvent({ params: { id: 'non-existent' } });

			await expect(POST(event)).rejects.toMatchObject({
				status: 404
			});
		});

		it('should throw 400 for already completed form', async () => {
			const form = await createTestForm({ status: 'completed' });

			const event = createMockEvent({ params: { id: form.id } });

			await expect(POST(event)).rejects.toMatchObject({
				status: 400
			});
		});

		it('should throw 400 for already skipped form', async () => {
			const form = await createTestForm({ status: 'skipped' });

			const event = createMockEvent({ params: { id: form.id } });

			await expect(POST(event)).rejects.toMatchObject({
				status: 400
			});
		});
	});
});
