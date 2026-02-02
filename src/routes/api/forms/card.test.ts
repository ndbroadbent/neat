/**
 * Integration tests for Card lookup endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { GET } from './card/[cardId]/+server';

function createMockEvent(options: { params?: Record<string, string> } = {}) {
	return {
		params: options.params || {}
	} as Parameters<typeof GET>[0];
}

async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const cardId = `card-test-${nanoid(8)}`;
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: cardId,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Card Test Form',
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
	await db.delete(forms).where(eq(forms.title, 'Card Test Form'));
}

describe('Card API Integration Tests', () => {
	beforeEach(async () => {
		await cleanupTestForms();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	describe('GET /api/forms/card/:cardId', () => {
		it('should return form by fizzy card id', async () => {
			const form = await createTestForm();

			const event = createMockEvent({ params: { cardId: form.fizzyCardId } });
			const response = await GET(event);
			const data = await response.json();

			expect(data.id).toBe(form.id);
			expect(data.fizzyCardId).toBe(form.fizzyCardId);
		});

		it('should throw 404 for non-existent card', async () => {
			const event = createMockEvent({ params: { cardId: 'non-existent' } });

			await expect(GET(event)).rejects.toMatchObject({
				status: 404
			});
		});
	});
});
