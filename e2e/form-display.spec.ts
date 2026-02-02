/**
 * E2E tests for Neat form display and interaction
 *
 * These tests use the real database via API endpoints.
 * Each test cleans up after itself using unique fizzyCardIds.
 */

import { test, expect } from '@playwright/test';

// Helper to generate unique IDs for test isolation
const testId = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Helper to clean up a form by ID
async function cleanupForm(request: typeof test.prototype.request, formId: string) {
	try {
		// Get the form to check its status
		const res = await request.get(`/api/forms/${formId}`);
		if (res.ok()) {
			const form = await res.json();
			// If pending, skip it first (can't delete pending forms directly)
			if (form.status === 'pending') {
				await request.post(`/api/queue/${formId}/skip`);
			}
		}
	} catch {
		// Form might not exist, that's fine
	}
}

test.describe('Form Display', () => {
	test('should show empty state when no pending forms exist', async ({ page, request }) => {
		// Skip all pending forms to get to empty state
		let hasMore = true;
		while (hasMore) {
			const response = await request.get('/api/queue');
			const data = await response.json();
			if (data.form) {
				await request.post(`/api/queue/${data.form.id}/skip`);
			} else {
				hasMore = false;
			}
		}

		await page.goto('/');

		// Check for empty state - actual UI says "All done!"
		await expect(page.getByText('All done!')).toBeVisible({ timeout: 5000 });
	});

	test('should display form title and summary', async ({ page, request }) => {
		const uniqueId = testId();

		// Create a test form via API
		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9001,
				title: 'E2E Test Form Title',
				summary: 'This is the test summary text',
				schema: {
					type: 'object',
					properties: {
						name: { type: 'string', title: 'Your Name' }
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			await page.goto('/');

			// Check title is displayed
			await expect(page.getByRole('heading', { name: 'E2E Test Form Title' })).toBeVisible();

			// Check summary is displayed
			await expect(page.getByText('This is the test summary text')).toBeVisible();
		} finally {
			// Cleanup
			await cleanupForm(request, created.id);
		}
	});
});

test.describe('Form Input Types', () => {
	test('should render text input field', async ({ page, request }) => {
		const uniqueId = testId();

		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9002,
				title: 'Text Input Test',
				schema: {
					type: 'object',
					properties: {
						username: { type: 'string', title: 'Username' }
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			await page.goto('/');

			// Find the input field by looking for text inputs
			const input = page.locator('input[type="text"]').first();
			await expect(input).toBeVisible();

			// Type into it
			await input.fill('testuser');
			await expect(input).toHaveValue('testuser');
		} finally {
			await cleanupForm(request, created.id);
		}
	});

	test('should render enum field as select dropdown', async ({ page, request }) => {
		const uniqueId = testId();

		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9003,
				title: 'Enum Field Test',
				schema: {
					type: 'object',
					properties: {
						priority: {
							type: 'string',
							title: 'Priority',
							enum: ['low', 'medium', 'high']
						}
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			await page.goto('/');

			// The form library renders enums as select dropdowns
			const select = page.getByLabel('Priority');
			await expect(select).toBeVisible();

			// Select a value from dropdown (by visible label, not internal value)
			await select.selectOption({ label: 'medium' });

			// Verify the selected option text is visible
			const selectedOption = select.locator('option:checked');
			await expect(selectedOption).toHaveText('medium');
		} finally {
			await cleanupForm(request, created.id);
		}
	});

	test('should render checkbox field', async ({ page, request }) => {
		const uniqueId = testId();

		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9005,
				title: 'Checkbox Test',
				schema: {
					type: 'object',
					properties: {
						approved: { type: 'boolean', title: 'Approved' }
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			await page.goto('/');

			// Find the checkbox
			const checkbox = page.locator('input[type="checkbox"]').first();
			await expect(checkbox).toBeVisible();

			// Toggle it
			await checkbox.check();
			await expect(checkbox).toBeChecked();

			await checkbox.uncheck();
			await expect(checkbox).not.toBeChecked();
		} finally {
			await cleanupForm(request, created.id);
		}
	});

	test('should render number input field', async ({ page, request }) => {
		const uniqueId = testId();

		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9006,
				title: 'Number Input Test',
				schema: {
					type: 'object',
					properties: {
						quantity: { type: 'number', title: 'Quantity' }
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			await page.goto('/');

			// Find the number input
			const input = page.locator('input[type="number"]').first();
			await expect(input).toBeVisible();

			// Enter a number
			await input.fill('42');
			await expect(input).toHaveValue('42');
		} finally {
			await cleanupForm(request, created.id);
		}
	});
});

test.describe('Form Submission', () => {
	test('should submit form and update status', async ({ page, request }) => {
		const uniqueId = testId();

		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9007,
				title: 'Submit Test Form',
				schema: {
					type: 'object',
					properties: {
						answer: { type: 'string', title: 'Your Answer' }
					}
				}
			}
		});
		const created = await createRes.json();

		await page.goto('/');

		// Fill out the form
		const input = page.getByLabel('Your Answer');
		await input.fill('test answer');

		// Submit the form and wait for navigation (page reload)
		await Promise.all([
			page.waitForURL('/'), // Waits for page reload
			page.getByRole('button', { name: /submit/i }).click()
		]);

		// Wait a moment for the server to process
		await page.waitForTimeout(500);

		// Verify the form was completed by checking the API
		const checkRes = await request.get(`/api/forms/${created.id}`);
		const checkData = await checkRes.json();
		expect(checkData.status).toBe('completed');
		expect(checkData.response).toEqual({ answer: 'test answer' });
	});

	test('should not submit when required fields are empty', async ({ page, request }) => {
		const uniqueId = testId();

		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9008,
				title: 'Validation Test',
				schema: {
					type: 'object',
					required: ['name'],
					properties: {
						name: { type: 'string', title: 'Name' }
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			await page.goto('/');

			// Try to submit without filling required field
			await page.getByRole('button', { name: /submit/i }).click();

			// Wait a bit to ensure form would have processed
			await page.waitForTimeout(1000);

			// Form should still be pending (not submitted)
			const checkRes = await request.get(`/api/forms/${created.id}`);
			const checkData = await checkRes.json();
			expect(checkData.status).toBe('pending');

			// We should still be on the same form (not reloaded to a different one)
			await expect(page.getByText('Validation Test')).toBeVisible();
		} finally {
			await cleanupForm(request, created.id);
		}
	});
});

test.describe('Backend Schema Validation', () => {
	test('should reject submission with missing required field via API', async ({ request }) => {
		const uniqueId = testId();

		// Create form with required field
		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9020,
				title: 'Required Field Validation Test',
				schema: {
					type: 'object',
					required: ['name', 'email'],
					properties: {
						name: { type: 'string', title: 'Name' },
						email: { type: 'string', title: 'Email' }
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			// Try to submit with missing required field
			const submitRes = await request.post(`/api/queue/${created.id}/submit`, {
				data: {
					response: { name: 'John' } // Missing 'email'
				}
			});

			expect(submitRes.status()).toBe(400);
			const errorData = await submitRes.json();
			expect(errorData.message).toContain('Validation failed');
			expect(errorData.message).toContain('email');

			// Verify form is still pending
			const checkRes = await request.get(`/api/forms/${created.id}`);
			const checkData = await checkRes.json();
			expect(checkData.status).toBe('pending');
		} finally {
			await cleanupForm(request, created.id);
		}
	});

	test('should reject submission with wrong type via API', async ({ request }) => {
		const uniqueId = testId();

		// Create form with number field
		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9021,
				title: 'Type Validation Test',
				schema: {
					type: 'object',
					properties: {
						age: { type: 'number', title: 'Age' },
						count: { type: 'integer', title: 'Count' }
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			// Try to submit string where number expected
			const submitRes = await request.post(`/api/queue/${created.id}/submit`, {
				data: {
					response: { age: 'twenty-five', count: 'ten' }
				}
			});

			expect(submitRes.status()).toBe(400);
			const errorData = await submitRes.json();
			expect(errorData.message).toContain('Validation failed');
		} finally {
			await cleanupForm(request, created.id);
		}
	});

	test('should reject submission with invalid enum value via API', async ({ request }) => {
		const uniqueId = testId();

		// Create form with enum field
		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9022,
				title: 'Enum Validation Test',
				schema: {
					type: 'object',
					properties: {
						priority: {
							type: 'string',
							title: 'Priority',
							enum: ['low', 'medium', 'high']
						}
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			// Try to submit invalid enum value
			const submitRes = await request.post(`/api/queue/${created.id}/submit`, {
				data: {
					response: { priority: 'urgent' } // Not in enum
				}
			});

			expect(submitRes.status()).toBe(400);
			const errorData = await submitRes.json();
			expect(errorData.message).toContain('Validation failed');
		} finally {
			await cleanupForm(request, created.id);
		}
	});

	test('should accept valid submission via API', async ({ request }) => {
		const uniqueId = testId();

		// Create form with various field types
		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9023,
				title: 'Valid Submission Test',
				schema: {
					type: 'object',
					required: ['name'],
					properties: {
						name: { type: 'string', title: 'Name' },
						age: { type: 'number', title: 'Age' },
						priority: {
							type: 'string',
							enum: ['low', 'medium', 'high']
						}
					}
				}
			}
		});
		const created = await createRes.json();

		// Submit valid data
		const submitRes = await request.post(`/api/queue/${created.id}/submit`, {
			data: {
				response: {
					name: 'John Doe',
					age: 30,
					priority: 'high'
				}
			}
		});

		expect(submitRes.status()).toBe(200);
		const submitData = await submitRes.json();
		expect(submitData.success).toBe(true);
		expect(submitData.form.status).toBe('completed');
		expect(submitData.form.response).toEqual({
			name: 'John Doe',
			age: 30,
			priority: 'high'
		});
	});

	test('should reject extra properties when additionalProperties is false', async ({
		request
	}) => {
		const uniqueId = testId();

		// Create strict schema
		const createRes = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId,
				fizzyCardNumber: 9024,
				title: 'Strict Schema Test',
				schema: {
					type: 'object',
					additionalProperties: false,
					properties: {
						name: { type: 'string' }
					}
				}
			}
		});
		const created = await createRes.json();

		try {
			// Try to submit with extra property
			const submitRes = await request.post(`/api/queue/${created.id}/submit`, {
				data: {
					response: { name: 'John', extraField: 'should fail' }
				}
			});

			expect(submitRes.status()).toBe(400);
			const errorData = await submitRes.json();
			expect(errorData.message).toContain('Validation failed');
		} finally {
			await cleanupForm(request, created.id);
		}
	});
});

test.describe('Skip Functionality', () => {
	test('should skip form and show next one', async ({ page, request }) => {
		const uniqueId1 = testId();
		const uniqueId2 = testId();

		// Create two forms with different priorities
		const create1 = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId1,
				fizzyCardNumber: 9009,
				title: 'First Form To Skip',
				priority: 10, // Higher priority = shown first
				schema: {
					type: 'object',
					properties: { field: { type: 'string' } }
				}
			}
		});
		const form1 = await create1.json();

		const create2 = await request.post('/api/forms', {
			data: {
				fizzyCardId: uniqueId2,
				fizzyCardNumber: 9010,
				title: 'Second Form After Skip',
				priority: 5,
				schema: {
					type: 'object',
					properties: { field: { type: 'string' } }
				}
			}
		});
		const form2 = await create2.json();

		try {
			await page.goto('/');

			// Should see first form (higher priority)
			await expect(page.getByText('First Form To Skip')).toBeVisible();

			// Click skip button
			await page.getByRole('button', { name: /skip/i }).click();

			// Should now see second form
			await expect(page.getByText('Second Form After Skip')).toBeVisible({ timeout: 5000 });
		} finally {
			await cleanupForm(request, form1.id);
			await cleanupForm(request, form2.id);
		}
	});
});
