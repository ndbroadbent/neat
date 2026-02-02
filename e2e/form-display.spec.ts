/**
 * E2E tests for Neat form display and interaction
 */

import { test, expect } from '@playwright/test';

test.describe('Form Display', () => {
	test('should show empty state when no forms exist', async ({ page }) => {
		// Clear any existing forms first via API
		const response = await page.request.get('/api/queue');
		const data = await response.json();

		if (data.form) {
			// Skip form if exists to get to empty state
			await page.request.post(`/api/queue/${data.form.id}/skip`);
		}

		await page.goto('/');

		// Check for empty state
		await expect(page.getByText(/no tasks/i).or(page.getByText(/all caught up/i))).toBeVisible({
			timeout: 5000
		});
	});

	test('should display form title and summary', async ({ page, request }) => {
		// Create a test form via API
		const formData = {
			fizzyCardId: 'e2e-test-card-1',
			fizzyCardNumber: 9001,
			title: 'E2E Test Form',
			summary: 'This is a test form created by Playwright',
			schema: {
				type: 'object',
				properties: {
					name: { type: 'string', title: 'Your Name' }
				}
			}
		};

		await request.post('/api/forms', {
			data: formData
		});

		await page.goto('/');

		// Check title is displayed
		await expect(page.getByRole('heading', { name: 'E2E Test Form' })).toBeVisible();

		// Check summary is displayed
		await expect(page.getByText('This is a test form created by Playwright')).toBeVisible();
	});
});

test.describe('Form Input Types', () => {
	test('should render text input field', async ({ page, request }) => {
		const formData = {
			fizzyCardId: 'e2e-text-input',
			fizzyCardNumber: 9002,
			title: 'Text Input Test',
			summary: 'Testing text input',
			schema: {
				type: 'object',
				properties: {
					username: { type: 'string', title: 'Username' }
				}
			}
		};

		await request.post('/api/forms', { data: formData });
		await page.goto('/');

		// Find the input field
		const input = page.locator('input[type="text"]');
		await expect(input).toBeVisible();

		// Type into it
		await input.fill('testuser');
		await expect(input).toHaveValue('testuser');
	});

	test('should render radio button field', async ({ page, request }) => {
		const formData = {
			fizzyCardId: 'e2e-radio-input',
			fizzyCardNumber: 9003,
			title: 'Radio Button Test',
			summary: 'Testing radio buttons',
			schema: {
				type: 'object',
				properties: {
					priority: {
						type: 'string',
						title: 'Priority',
						enum: ['low', 'medium', 'high'],
						enumNames: ['Low', 'Medium', 'High']
					}
				}
			},
			uiSchema: {
				priority: {
					'ui:components': { selectWidget: 'radioWidget' }
				}
			}
		};

		await request.post('/api/forms', { data: formData });
		await page.goto('/');

		// Check radio buttons are rendered
		const radioGroup = page.locator('[role="radiogroup"]');
		await expect(radioGroup).toBeVisible();

		// Check all options are present
		await expect(page.getByLabel('Low')).toBeVisible();
		await expect(page.getByLabel('Medium')).toBeVisible();
		await expect(page.getByLabel('High')).toBeVisible();

		// Click one option
		await page.getByLabel('Medium').click();
		await expect(page.getByLabel('Medium')).toBeChecked();
	});

	test('should render textarea field', async ({ page, request }) => {
		const formData = {
			fizzyCardId: 'e2e-textarea-input',
			fizzyCardNumber: 9004,
			title: 'Textarea Test',
			summary: 'Testing textarea',
			schema: {
				type: 'object',
				properties: {
					notes: { type: 'string', title: 'Notes' }
				}
			},
			uiSchema: {
				notes: {
					'ui:components': { textWidget: 'textareaWidget' }
				}
			}
		};

		await request.post('/api/forms', { data: formData });
		await page.goto('/');

		// Find the textarea
		const textarea = page.locator('textarea');
		await expect(textarea).toBeVisible();

		// Type into it
		await textarea.fill('This is a long note with multiple lines.\nSecond line here.');
		await expect(textarea).toHaveValue(
			'This is a long note with multiple lines.\nSecond line here.'
		);
	});

	test('should render checkbox field', async ({ page, request }) => {
		const formData = {
			fizzyCardId: 'e2e-checkbox-input',
			fizzyCardNumber: 9005,
			title: 'Checkbox Test',
			summary: 'Testing checkbox',
			schema: {
				type: 'object',
				properties: {
					approved: { type: 'boolean', title: 'Approved' }
				}
			}
		};

		await request.post('/api/forms', { data: formData });
		await page.goto('/');

		// Find the checkbox
		const checkbox = page.locator('input[type="checkbox"]');
		await expect(checkbox).toBeVisible();

		// Toggle it
		await checkbox.check();
		await expect(checkbox).toBeChecked();

		await checkbox.uncheck();
		await expect(checkbox).not.toBeChecked();
	});

	test('should render number input field', async ({ page, request }) => {
		const formData = {
			fizzyCardId: 'e2e-number-input',
			fizzyCardNumber: 9006,
			title: 'Number Input Test',
			summary: 'Testing number input',
			schema: {
				type: 'object',
				properties: {
					quantity: { type: 'number', title: 'Quantity' }
				}
			}
		};

		await request.post('/api/forms', { data: formData });
		await page.goto('/');

		// Find the number input
		const input = page.locator('input[type="number"]');
		await expect(input).toBeVisible();

		// Enter a number
		await input.fill('42');
		await expect(input).toHaveValue('42');
	});
});

test.describe('Form Submission', () => {
	test('should submit form successfully', async ({ page, request }) => {
		const formData = {
			fizzyCardId: 'e2e-submit-test',
			fizzyCardNumber: 9007,
			title: 'Submit Test',
			summary: 'Testing form submission',
			schema: {
				type: 'object',
				required: ['decision'],
				properties: {
					decision: {
						type: 'string',
						title: 'Decision',
						enum: ['approve', 'reject'],
						enumNames: ['Approve', 'Reject']
					}
				}
			},
			uiSchema: {
				decision: {
					'ui:components': { selectWidget: 'radioWidget' }
				}
			}
		};

		const createResponse = await request.post('/api/forms', { data: formData });
		const created = await createResponse.json();

		await page.goto('/');

		// Select an option
		await page.getByLabel('Approve').click();

		// Submit the form
		await page.getByRole('button', { name: /submit/i }).click();

		// Poll for submission completion instead of fixed timeout
		await expect
			.poll(
				async () => {
					const res = await request.get(`/api/forms/${created.id}`);
					const data = await res.json();
					return data.status;
				},
				{ timeout: 10000 }
			)
			.toBe('completed');

		// Verify response data
		const checkResponse = await request.get(`/api/forms/${created.id}`);
		const checkData = await checkResponse.json();
		expect(checkData.response).toEqual({ decision: 'approve' });
	});

	test('should validate required fields before submission', async ({ page, request }) => {
		const formData = {
			fizzyCardId: 'e2e-validation-test',
			fizzyCardNumber: 9008,
			title: 'Validation Test',
			summary: 'Testing required field validation',
			schema: {
				type: 'object',
				required: ['name'],
				properties: {
					name: { type: 'string', title: 'Name' }
				}
			}
		};

		await request.post('/api/forms', { data: formData });
		await page.goto('/');

		// Try to submit without filling required field
		await page.getByRole('button', { name: /submit/i }).click();

		// Should show validation error
		await expect(
			page
				.getByText(/required/i)
				.or(page.getByText(/must have required/i))
				.or(page.getByText(/is a required property/i))
		).toBeVisible();
	});
});

test.describe('Skip Functionality', () => {
	test('should skip form and show next', async ({ page, request }) => {
		// Create two forms
		await request.post('/api/forms', {
			data: {
				fizzyCardId: 'e2e-skip-1',
				fizzyCardNumber: 9009,
				title: 'First Form (will be skipped)',
				summary: 'Skip this one',
				schema: {
					type: 'object',
					properties: { field: { type: 'string' } }
				}
			}
		});

		await request.post('/api/forms', {
			data: {
				fizzyCardId: 'e2e-skip-2',
				fizzyCardNumber: 9010,
				title: 'Second Form (should appear after skip)',
				summary: 'This should show up',
				schema: {
					type: 'object',
					properties: { field: { type: 'string' } }
				}
			}
		});

		await page.goto('/');

		// Should see first form
		await expect(page.getByText('First Form (will be skipped)')).toBeVisible();

		// Click skip button
		await page.getByRole('button', { name: /skip/i }).click();

		// Should now see second form
		await expect(page.getByText('Second Form (should appear after skip)')).toBeVisible();
	});
});
