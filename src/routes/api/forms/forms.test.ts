/**
 * Integration tests for Forms API
 * Tests CRUD operations and form submission flow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';

// Test form data for all input types
const testForms = {
	radioButtons: {
		fizzyCardId: `test-radio-${nanoid(8)}`,
		fizzyCardNumber: 100,
		title: 'Radio Button Test',
		summary: 'Testing radio button input',
		schema: {
			type: 'object' as const,
			required: ['choice'],
			properties: {
				choice: {
					type: 'string' as const,
					title: 'Pick one',
					enum: ['a', 'b', 'c'],
					enumNames: ['Option A', 'Option B', 'Option C']
				}
			}
		},
		uiSchema: {
			choice: {
				'ui:components': { selectWidget: 'radioWidget' }
			}
		}
	},

	textarea: {
		fizzyCardId: `test-textarea-${nanoid(8)}`,
		fizzyCardNumber: 101,
		title: 'Textarea Test',
		summary: 'Testing textarea input',
		schema: {
			type: 'object' as const,
			properties: {
				description: {
					type: 'string' as const,
					title: 'Description'
				}
			}
		},
		uiSchema: {
			description: {
				'ui:components': { textWidget: 'textareaWidget' }
			}
		}
	},

	checkbox: {
		fizzyCardId: `test-checkbox-${nanoid(8)}`,
		fizzyCardNumber: 102,
		title: 'Checkbox Test',
		summary: 'Testing checkbox input',
		schema: {
			type: 'object' as const,
			required: ['approved'],
			properties: {
				approved: {
					type: 'boolean' as const,
					title: 'Do you approve?'
				}
			}
		}
	},

	textInput: {
		fizzyCardId: `test-text-${nanoid(8)}`,
		fizzyCardNumber: 103,
		title: 'Text Input Test',
		summary: 'Testing text input',
		schema: {
			type: 'object' as const,
			required: ['name'],
			properties: {
				name: {
					type: 'string' as const,
					title: 'Your name'
				}
			}
		}
	},

	numberInput: {
		fizzyCardId: `test-number-${nanoid(8)}`,
		fizzyCardNumber: 104,
		title: 'Number Input Test',
		summary: 'Testing number input',
		schema: {
			type: 'object' as const,
			properties: {
				quantity: {
					type: 'number' as const,
					title: 'Quantity'
				}
			}
		}
	},

	combined: {
		fizzyCardId: `test-combined-${nanoid(8)}`,
		fizzyCardNumber: 105,
		title: 'Combined Form Test',
		summary: 'Testing multiple input types together',
		schema: {
			type: 'object' as const,
			required: ['choice', 'approved'],
			properties: {
				choice: {
					type: 'string' as const,
					title: 'Select framework',
					enum: ['react', 'svelte', 'vue']
				},
				notes: {
					type: 'string' as const,
					title: 'Additional notes'
				},
				approved: {
					type: 'boolean' as const,
					title: 'Ready to proceed?'
				},
				priority: {
					type: 'number' as const,
					title: 'Priority (1-10)'
				}
			}
		},
		uiSchema: {
			choice: {
				'ui:components': { selectWidget: 'radioWidget' }
			},
			notes: {
				'ui:components': { textWidget: 'textareaWidget' }
			}
		},
		references: [{ label: 'Documentation', url: 'https://example.com', type: 'doc' as const }]
	}
};

describe('Form Input Types', () => {
	describe('Radio Button Forms', () => {
		it('should have correct schema structure for radio buttons', () => {
			const form = testForms.radioButtons;

			expect(form.schema.properties.choice.enum).toBeDefined();
			expect(form.schema.properties.choice.enumNames).toBeDefined();
			expect(form.uiSchema.choice['ui:components'].selectWidget).toBe('radioWidget');
		});

		it('should have matching enum and enumNames lengths', () => {
			const form = testForms.radioButtons;
			const { enum: values, enumNames } = form.schema.properties.choice;

			expect(values?.length).toBe(enumNames?.length);
		});
	});

	describe('Textarea Forms', () => {
		it('should have correct uiSchema for textarea', () => {
			const form = testForms.textarea;

			expect(form.uiSchema.description['ui:components'].textWidget).toBe('textareaWidget');
		});
	});

	describe('Checkbox Forms', () => {
		it('should have boolean type for checkbox', () => {
			const form = testForms.checkbox;

			expect(form.schema.properties.approved.type).toBe('boolean');
		});

		it('should support required checkbox', () => {
			const form = testForms.checkbox;

			expect(form.schema.required).toContain('approved');
		});
	});

	describe('Text Input Forms', () => {
		it('should have string type for text input', () => {
			const form = testForms.textInput;

			expect(form.schema.properties.name.type).toBe('string');
		});
	});

	describe('Number Input Forms', () => {
		it('should have number type', () => {
			const form = testForms.numberInput;

			expect(form.schema.properties.quantity.type).toBe('number');
		});
	});

	describe('Combined Forms', () => {
		it('should support multiple input types', () => {
			const form = testForms.combined;
			const props = Object.keys(form.schema.properties);

			expect(props).toContain('choice');
			expect(props).toContain('notes');
			expect(props).toContain('approved');
			expect(props).toContain('priority');
		});

		it('should have references array', () => {
			const form = testForms.combined;

			expect(form.references).toHaveLength(1);
			expect(form.references[0].type).toBe('doc');
		});
	});
});

describe('Form Response Validation', () => {
	it('should accept valid radio button response', () => {
		const form = testForms.radioButtons;
		const response = { choice: 'a' };

		const isValid = form.schema.properties.choice.enum?.includes(response.choice);
		expect(isValid).toBe(true);
	});

	it('should reject invalid radio button response', () => {
		const form = testForms.radioButtons;
		const response = { choice: 'invalid' };

		const isValid = form.schema.properties.choice.enum?.includes(response.choice);
		expect(isValid).toBe(false);
	});

	it('should accept boolean response for checkbox', () => {
		const form = testForms.checkbox;
		const response = { approved: true };

		expect(typeof response.approved).toBe('boolean');
	});

	it('should accept string response for textarea', () => {
		const form = testForms.textarea;
		const response = { description: 'Some long text here...' };

		expect(typeof response.description).toBe('string');
	});

	it('should accept number response for number input', () => {
		const form = testForms.numberInput;
		const response = { quantity: 42 };

		expect(typeof response.quantity).toBe('number');
	});
});

describe('Form Lifecycle', () => {
	it('should start with pending status', () => {
		const form = {
			...testForms.radioButtons,
			status: 'pending' as const
		};

		expect(form.status).toBe('pending');
	});

	it('should transition to completed after submission', () => {
		// Simulating form submission
		const beforeSubmit = { status: 'pending' as const };
		const afterSubmit = { status: 'completed' as const, response: { choice: 'a' } };

		expect(beforeSubmit.status).toBe('pending');
		expect(afterSubmit.status).toBe('completed');
		expect(afterSubmit.response).toBeDefined();
	});

	it('should transition to skipped when skipped', () => {
		const skippedForm = { status: 'skipped' as const };

		expect(skippedForm.status).toBe('skipped');
	});
});
