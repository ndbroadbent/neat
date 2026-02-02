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
			class="w-full rounded-lg bg-white px-4 py-3 text-lg font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900 focus:outline-none"
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
		font-size: 1.125rem;
		margin-bottom: 0.75rem;
		color: rgb(191 219 254); /* text-blue-200 */
	}
	.neat-form :global(input),
	.neat-form :global(select),
	.neat-form :global(textarea) {
		width: 100%;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		font-size: 1.125rem;
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}
	.neat-form :global(input::placeholder),
	.neat-form :global(textarea::placeholder) {
		color: rgba(191, 219, 254, 0.6);
	}
	.neat-form :global(input:focus),
	.neat-form :global(select:focus),
	.neat-form :global(textarea:focus) {
		outline: none;
		border-color: rgba(255, 255, 255, 0.5);
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
	}
	.neat-form :global(select option) {
		background: #1e3a5f;
		color: white;
	}
</style>
