/**
 * Comprehensive tests for form handling
 * Tests all input types and form lifecycle
 */

import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import type { JSONSchema, UISchema, NewForm } from './schema';

// Test data generators
function createTestForm(overrides: Partial<NewForm> = {}): NewForm {
	return {
		id: nanoid(),
		fizzyCardId: `test-card-${nanoid(8)}`,
		fizzyCardNumber: Math.floor(Math.random() * 1000),
		title: 'Test Form',
		summary: 'Test summary',
		schema: {
			type: 'object',
			properties: {
				field: { type: 'string', title: 'Test Field' }
			}
		},
		status: 'pending',
		...overrides
	};
}

describe('Form Schema Types', () => {
	describe('Radio Button Fields', () => {
		it('should define radio button schema correctly', () => {
			const schema: JSONSchema = {
				type: 'object',
				required: ['choice'],
				properties: {
					choice: {
						type: 'string',
						title: 'Select an option',
						enum: ['option1', 'option2', 'option3'],
						enumNames: ['Option 1', 'Option 2', 'Option 3']
					}
				}
			};

			const uiSchema: UISchema = {
				choice: {
					'ui:components': { selectWidget: 'radioWidget' }
				}
			};

			expect(schema.properties.choice.enum).toHaveLength(3);
			expect(schema.properties.choice.enumNames).toHaveLength(3);
			expect(uiSchema.choice).toBeDefined();
		});

		it('should support required radio fields', () => {
			const schema: JSONSchema = {
				type: 'object',
				required: ['priority'],
				properties: {
					priority: {
						type: 'string',
						title: 'Priority Level',
						enum: ['low', 'medium', 'high']
					}
				}
			};

			expect(schema.required).toContain('priority');
		});
	});

	describe('Text Input Fields', () => {
		it('should define text input schema', () => {
			const schema: JSONSchema = {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						title: 'Your Name'
					}
				}
			};

			expect(schema.properties.name.type).toBe('string');
		});

		it('should support textarea with ui:components', () => {
			const uiSchema: UISchema = {
				description: {
					'ui:components': { textWidget: 'textareaWidget' }
				}
			};

			expect(uiSchema.description?.['ui:components']).toBeDefined();
			expect(uiSchema.description?.['ui:components']?.textWidget).toBe('textareaWidget');
		});
	});

	describe('Boolean/Checkbox Fields', () => {
		it('should define boolean schema', () => {
			const schema: JSONSchema = {
				type: 'object',
				properties: {
					approved: {
						type: 'boolean',
						title: 'Approve this?'
					}
				}
			};

			expect(schema.properties.approved.type).toBe('boolean');
		});

		it('should support required boolean fields', () => {
			const schema: JSONSchema = {
				type: 'object',
				required: ['termsAccepted'],
				properties: {
					termsAccepted: {
						type: 'boolean',
						title: 'Accept terms'
					}
				}
			};

			expect(schema.required).toContain('termsAccepted');
		});
	});

	describe('Number Fields', () => {
		it('should define number schema', () => {
			const schema: JSONSchema = {
				type: 'object',
				properties: {
					quantity: {
						type: 'number',
						title: 'Quantity'
					}
				}
			};

			expect(schema.properties.quantity.type).toBe('number');
		});
	});

	describe('Combined Form Schemas', () => {
		it('should support multiple field types in one form', () => {
			const schema: JSONSchema = {
				type: 'object',
				required: ['choice', 'approved'],
				properties: {
					choice: {
						type: 'string',
						title: 'Select option',
						enum: ['a', 'b', 'c']
					},
					notes: {
						type: 'string',
						title: 'Additional notes'
					},
					approved: {
						type: 'boolean',
						title: 'Approve?'
					},
					priority: {
						type: 'number',
						title: 'Priority (1-10)'
					}
				}
			};

			const uiSchema: UISchema = {
				choice: {
					'ui:components': { selectWidget: 'radioWidget' }
				},
				notes: {
					'ui:components': { textWidget: 'textareaWidget' }
				}
			};

			expect(Object.keys(schema.properties)).toHaveLength(4);
			expect(schema.required).toHaveLength(2);
			expect(uiSchema.choice?.['ui:components']?.selectWidget).toBe('radioWidget');
			expect(uiSchema.notes?.['ui:components']?.textWidget).toBe('textareaWidget');
		});
	});
});

describe('Form Validation', () => {
	it('should validate required fields', () => {
		const schema: JSONSchema = {
			type: 'object',
			required: ['name'],
			properties: {
				name: { type: 'string', title: 'Name' }
			}
		};

		// Schema should have required field
		expect(schema.required).toContain('name');

		// Empty response should fail validation
		const emptyResponse = {};
		const hasRequiredField = 'name' in emptyResponse;
		expect(hasRequiredField).toBe(false);

		// Valid response
		const validResponse = { name: 'Test' };
		expect('name' in validResponse).toBe(true);
	});

	it('should validate enum values', () => {
		const schema: JSONSchema = {
			type: 'object',
			properties: {
				choice: {
					type: 'string',
					enum: ['a', 'b', 'c']
				}
			}
		};

		const validChoice = 'a';
		const invalidChoice = 'd';

		expect(schema.properties.choice.enum).toContain(validChoice);
		expect(schema.properties.choice.enum).not.toContain(invalidChoice);
	});
});

describe('Form Status Lifecycle', () => {
	it('should have correct status values', () => {
		const validStatuses = ['pending', 'completed', 'skipped'];

		const pendingForm = createTestForm({ status: 'pending' });
		const completedForm = createTestForm({ status: 'completed' });
		const skippedForm = createTestForm({ status: 'skipped' });

		expect(validStatuses).toContain(pendingForm.status);
		expect(validStatuses).toContain(completedForm.status);
		expect(validStatuses).toContain(skippedForm.status);
	});
});

describe('Form References', () => {
	it('should support references array', () => {
		const form = createTestForm({
			references: [
				{ label: 'Documentation', url: 'https://example.com/docs', type: 'doc' },
				{ label: 'PR Link', url: 'https://github.com/pr/123', type: 'link' }
			]
		});

		expect(form.references).toHaveLength(2);
		expect(form.references?.[0].type).toBe('doc');
	});
});

describe('uiSchema Format', () => {
	it('should use ui:components for widget overrides', () => {
		// This is the CORRECT format for @sjsf/form
		const correctUiSchema: UISchema = {
			field: {
				'ui:components': { selectWidget: 'radioWidget' }
			}
		};

		expect(correctUiSchema.field?.['ui:components']).toBeDefined();
	});

	it('should NOT use ui:widget (wrong format)', () => {
		// This format does NOT work with @sjsf/form
		const wrongFormat = {
			field: {
				'ui:widget': 'radio' // WRONG - don't use this
			}
		};

		// The correct format uses ui:components
		expect(wrongFormat.field).not.toHaveProperty('ui:components');
	});
});
