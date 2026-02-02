import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Form status lifecycle
export type FormStatus = 'pending' | 'completed' | 'skipped';

// Forms table - stores JSON Schema form definitions
export const forms = sqliteTable('forms', {
	id: text('id').primaryKey(), // nanoid

	// Link to Fizzy
	fizzyCardId: text('fizzy_card_id').notNull(),
	fizzyCardNumber: integer('fizzy_card_number').notNull(),
	fizzyBoardId: text('fizzy_board_id'),

	// Display
	title: text('title').notNull(),
	summary: text('summary'), // Markdown context
	references: text('references', { mode: 'json' }).$type<Reference[]>(),

	// Form definition (JSON Schema)
	schema: text('schema', { mode: 'json' }).notNull().$type<JSONSchema>(),
	uiSchema: text('ui_schema', { mode: 'json' }).$type<UISchema>(),

	// Behavior
	onSubmit: text('on_submit').$type<'comment' | 'close' | 'move'>().default('comment'),
	targetColumn: text('target_column'), // If onSubmit = 'move'

	// Status
	status: text('status').$type<FormStatus>().default('pending').notNull(),
	response: text('response', { mode: 'json' }).$type<Record<string, unknown>>(),

	// Timestamps
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	completedAt: integer('completed_at', { mode: 'timestamp' }),

	// Context for prioritization
	context: text('context'), // e.g., "infrastructure", "matchcraft"
	priority: integer('priority').default(0) // Higher = more urgent
});

// Type definitions
export interface Reference {
	label: string;
	url: string;
	type?: 'doc' | 'link' | 'video' | 'file';
}

// Simplified JSON Schema type (enough for our needs)
export interface JSONSchema {
	type: 'object';
	required?: string[];
	properties: Record<string, JSONSchemaProperty>;
}

export interface JSONSchemaProperty {
	type: 'string' | 'number' | 'boolean' | 'array';
	title?: string;
	description?: string;
	enum?: string[];
	enumNames?: string[];
	default?: unknown;
	format?: string; // e.g., 'data-url' for file uploads
}

/**
 * UISchema for @sjsf/form widget configuration
 *
 * IMPORTANT: @sjsf/form uses 'ui:components' NOT 'ui:widget'!
 * - Radio buttons: { 'ui:components': { selectWidget: 'radioWidget' } }
 * - Textarea: { 'ui:components': { textWidget: 'textareaWidget' } }
 */
export interface UISchemaField {
	'ui:components'?: {
		selectWidget?: 'radioWidget';
		textWidget?: 'textareaWidget';
	};
	'ui:placeholder'?: string;
	'ui:help'?: string;
	'ui:options'?: Record<string, unknown>;
}

export interface UISchema {
	[key: string]: UISchemaField | undefined;
}

// Infer types for queries
export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
