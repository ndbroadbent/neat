/**
 * Tests for the unskip endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { POST } from './[id]/unskip/+server';

function createMockEvent(options: { params?: Record<string, string> } = {}) {
	return {
		params: options.params || {}
	} as Parameters<typeof POST>[0];
}

async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: `unskip-test-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Unskip Test Form',
		summary: 'Test',
		schema: {
			type: 'object',
			properties: { field: { type: 'string', title: 'Test' } }
		},
		status: 'skipped',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};

	await db.insert(forms).values(form);
	return form;
}

async function cleanupTestForms() {
	await db.delete(forms).where(eq(forms.title, 'Unskip Test Form'));
}

describe('Unskip API Tests', () => {
	beforeEach(async () => {
		await cleanupTestForms();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	describe('POST /api/forms/:id/unskip', () => {
		it('should restore skipped form to pending', async () => {
			const form = await createTestForm({ status: 'skipped' });

			const event = createMockEvent({ params: { id: form.id } });
			const response = await POST(event);
			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.form.status).toBe('pending');
		});

		it('should throw 404 for non-existent form', async () => {
			const event = createMockEvent({ params: { id: 'non-existent' } });

			await expect(POST(event)).rejects.toMatchObject({
				status: 404,
				body: { message: 'Form not found' }
			});
		});

		it('should throw 400 for pending form', async () => {
			const form = await createTestForm({ status: 'pending' });

			const event = createMockEvent({ params: { id: form.id } });

			await expect(POST(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Form is not skipped' }
			});
		});

		it('should throw 400 for completed form', async () => {
			const form = await createTestForm({ status: 'completed' });

			const event = createMockEvent({ params: { id: form.id } });

			await expect(POST(event)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Form is not skipped' }
			});
		});

		it('should update the updatedAt timestamp', async () => {
			// Create form with an old timestamp
			const oldDate = new Date(Date.now() - 60000); // 1 minute ago
			const form = await createTestForm({ status: 'skipped', updatedAt: oldDate });

			const event = createMockEvent({ params: { id: form.id } });
			const response = await POST(event);
			const data = await response.json();

			expect(new Date(data.form.updatedAt).getTime()).toBeGreaterThan(oldDate.getTime());
		});
	});
});
