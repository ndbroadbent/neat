<script lang="ts">
	import { createForm, BasicForm, type Schema, type UiSchema } from '@sjsf/form';
	import { resolver } from '@sjsf/form/resolvers/basic';
	import { translation } from '@sjsf/form/translations/en';
	import { createFormMerger } from '@sjsf/form/mergers/modern';
	import { createFormIdBuilder } from '@sjsf/form/id-builders/modern';
	import { createFormValidator } from '@sjsf/ajv8-validator';
	import { theme } from '@sjsf/basic-theme';
	import '@sjsf/basic-theme/css/basic.css';

	interface Props {
		schema: Schema;
		uiSchema?: UiSchema;
		onSubmit: (data: Record<string, unknown>) => void;
		submitText?: string;
	}

	let { schema, uiSchema, onSubmit, submitText = 'Submit' }: Props = $props();

	const form = createForm({
		theme,
		schema,
		uiSchema,
		resolver,
		translation,
		merger: createFormMerger,
		validator: createFormValidator,
		idBuilder: createFormIdBuilder,
		onSubmit: (e: { formData: Record<string, unknown> }) => {
			onSubmit(e.formData);
		}
	});
</script>

<div class="neat-form">
	<BasicForm {form} />
	<div class="mt-6">
		<button
			type="submit"
			class="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
		>
			{submitText}
		</button>
	</div>
</div>

<style>
	.neat-form :global(.sjsf-field) {
		margin-bottom: 1.5rem;
	}
	.neat-form :global(label) {
		display: block;
		font-weight: 500;
		margin-bottom: 0.5rem;
		color: #374151;
	}
	.neat-form :global(input),
	.neat-form :global(select),
	.neat-form :global(textarea) {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 1rem;
	}
	.neat-form :global(input:focus),
	.neat-form :global(select:focus),
	.neat-form :global(textarea:focus) {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}
</style>
