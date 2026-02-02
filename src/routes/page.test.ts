/**
 * Tests for page server load function
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, forms, type NewForm } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { load } from './+page.server';

async function createTestForm(overrides: Partial<NewForm> = {}): Promise<NewForm> {
	const form: NewForm = {
		id: nanoid(),
		fizzyCardId: `page-test-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 10000),
		title: 'Page Test Form',
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
	await db.delete(forms).where(eq(forms.title, 'Page Test Form'));
	await db.delete(forms).where(eq(forms.title, 'High Priority Page'));
	await db.delete(forms).where(eq(forms.title, 'Low Priority Page'));
}

describe('Page Server Load', () => {
	beforeEach(async () => {
		await cleanupTestForms();
	});

	afterEach(async () => {
		await cleanupTestForms();
	});

	it('should return null when no pending forms', async () => {
		const result = (await load({} as Parameters<typeof load>[0])) as { form: unknown };
		expect(result.form).toBeNull();
	});

	it('should return the first pending form', async () => {
		await createTestForm();

		const result = (await load({} as Parameters<typeof load>[0])) as {
			form: { title: string } | null;
		};

		expect(result.form).toBeDefined();
		expect(result.form?.title).toBe('Page Test Form');
	});

	it('should return higher priority forms first', async () => {
		await createTestForm({ title: 'Low Priority Page', priority: 1 });
		await createTestForm({ title: 'High Priority Page', priority: 10 });

		const result = (await load({} as Parameters<typeof load>[0])) as {
			form: { title: string } | null;
		};

		expect(result.form?.title).toBe('High Priority Page');
	});

	it('should not return completed forms', async () => {
		await createTestForm({ status: 'completed' });

		const result = (await load({} as Parameters<typeof load>[0])) as { form: unknown };
		expect(result.form).toBeNull();
	});
});
