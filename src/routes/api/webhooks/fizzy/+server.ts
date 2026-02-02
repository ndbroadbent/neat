import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import { db } from '$lib/server/db';
import { forms } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

interface WebhookPayload {
	id: string;
	action: string;
	created_at: string;
	eventable: {
		id: string;
		number: number;
		title: string;
		closed: boolean;
	};
	board: {
		id: string;
		name: string;
	};
	creator: {
		id: string;
		name: string;
	};
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
	const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export const POST: RequestHandler = async ({ request }) => {
	const webhookSecret = env.FIZZY_WEBHOOK_SECRET;

	if (!webhookSecret) {
		console.error('[Webhook] FIZZY_WEBHOOK_SECRET not configured');
		return json({ error: 'Webhook not configured' }, { status: 500 });
	}

	// Get signature from headers (timestamp available but not currently used)
	const signature = request.headers.get('x-webhook-signature');
	// const timestamp = request.headers.get('x-webhook-timestamp');

	if (!signature) {
		console.warn('[Webhook] Missing signature header');
		return json({ error: 'Missing signature' }, { status: 401 });
	}

	// Read the raw body for signature verification
	const rawBody = await request.text();

	// Verify signature
	if (!verifySignature(rawBody, signature, webhookSecret)) {
		console.warn('[Webhook] Invalid signature');
		return json({ error: 'Invalid signature' }, { status: 401 });
	}

	// Parse the payload
	let payload: WebhookPayload;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		console.error('[Webhook] Invalid JSON payload');
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	console.log(`[Webhook] Received ${payload.action} event for card #${payload.eventable?.number}`);

	// Handle card_closed events
	if (payload.action === 'card_closed' && payload.eventable?.number) {
		const cardNumber = payload.eventable.number;

		// Find and update the form by card number
		const result = await db
			.update(forms)
			.set({
				status: 'completed',
				updatedAt: new Date()
			})
			.where(eq(forms.fizzyCardNumber, cardNumber))
			.returning({ id: forms.id });

		if (result.length > 0) {
			console.log(
				`[Webhook] Auto-closed form ${result[0].id} for card #${cardNumber} (by ${payload.creator?.name})`
			);
			return json({
				success: true,
				action: 'form_closed',
				formId: result[0].id,
				cardNumber
			});
		} else {
			console.log(`[Webhook] No form found for card #${cardNumber}`);
			return json({
				success: true,
				action: 'no_form_found',
				cardNumber
			});
		}
	}

	// Acknowledge other events without processing
	return json({
		success: true,
		action: 'ignored',
		eventAction: payload.action
	});
};
