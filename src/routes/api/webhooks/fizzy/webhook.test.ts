import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { db } from '$lib/server/db';
import { forms } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Mock environment
vi.mock('$env/dynamic/private', () => ({
	env: {
		FIZZY_WEBHOOK_SECRET: 'test-webhook-secret'
	}
}));

// Helper to create webhook signature
function createSignature(payload: string, secret: string): string {
	return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Helper to make webhook request
async function makeWebhookRequest(
	payload: object,
	secret?: string,
	includeSignature = true
): Promise<Response> {
	const { POST } = await import('./+server');
	const body = JSON.stringify(payload);
	const headers = new Headers({
		'Content-Type': 'application/json',
		'x-webhook-timestamp': new Date().toISOString()
	});

	if (includeSignature) {
		const sig = createSignature(body, secret || 'test-webhook-secret');
		headers.set('x-webhook-signature', sig);
	}

	const request = new Request('http://localhost/api/webhooks/fizzy', {
		method: 'POST',
		headers,
		body
	});

	return POST({ request } as Parameters<typeof POST>[0]);
}

describe('Fizzy Webhook', () => {
	beforeEach(async () => {
		// Clear forms table
		await db.delete(forms);
	});

	describe('signature verification', () => {
		it('rejects requests without signature', async () => {
			const response = await makeWebhookRequest({ action: 'card_closed' }, undefined, false);
			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Missing signature');
		});

		it('rejects requests with invalid signature', async () => {
			const response = await makeWebhookRequest({ action: 'card_closed' }, 'wrong-secret');
			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Invalid signature');
		});

		it('accepts requests with valid signature', async () => {
			const response = await makeWebhookRequest({
				action: 'card_closed',
				eventable: { number: 999 }
			});
			expect(response.status).toBe(200);
		});
	});

	describe('card_closed events', () => {
		it('closes form when card is closed', async () => {
			// Create a form linked to card #42
			const formId = nanoid();
			await db.insert(forms).values({
				id: formId,
				title: 'Test Form',
				fizzyCardId: 'card-id-42',
				fizzyCardNumber: 42,
				schema: { type: 'object', properties: {} },
				status: 'pending'
			});

			const response = await makeWebhookRequest({
				action: 'card_closed',
				id: 'event-123',
				created_at: new Date().toISOString(),
				eventable: {
					id: 'card-id-42',
					number: 42,
					title: 'Test Card',
					closed: true
				},
				board: { id: 'board-id', name: 'Test Board' },
				creator: { id: 'user-id', name: 'Test User' }
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.action).toBe('form_closed');
			expect(data.formId).toBe(formId);

			// Verify form was updated
			const [updatedForm] = await db.select().from(forms).where(eq(forms.id, formId));
			expect(updatedForm.status).toBe('completed');
		});

		it('handles card_closed when no form exists', async () => {
			const response = await makeWebhookRequest({
				action: 'card_closed',
				eventable: { number: 9999 }
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.action).toBe('no_form_found');
		});
	});

	describe('other events', () => {
		it('ignores non-card_closed events', async () => {
			const response = await makeWebhookRequest({
				action: 'card_published',
				eventable: { number: 42 }
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.action).toBe('ignored');
			expect(data.eventAction).toBe('card_published');
		});
	});
});
