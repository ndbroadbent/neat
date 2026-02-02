<script lang="ts">
	import { createForm, BasicForm, type Schema, type UiSchema } from '@sjsf/form';
	import { translation } from '@sjsf/form/translations/en';
	import { resolver } from '@sjsf/form/resolvers/compat';
	import { createFormMerger } from '@sjsf/form/mergers/modern';
	import { createFormIdBuilder } from '@sjsf/form/id-builders/modern';
	import { createFormValidator } from '@sjsf/ajv8-validator';
	import { theme } from './theme';
	import '@sjsf/basic-theme/css/basic.css';

	interface Props {
		schema: Schema;
		uiSchema?: UiSchema;
		onSubmit: (data: Record<string, unknown>) => void;
		submitText?: string;
	}

	let { schema, uiSchema, onSubmit, submitText = 'Submit' }: Props = $props();

	let formRef: HTMLFormElement | undefined = $state();

	const form = createForm({
		theme,
		schema,
		uiSchema,
		resolver,
		translation,
		merger: createFormMerger,
		validator: createFormValidator,
		idBuilder: createFormIdBuilder,
		onSubmit: (value: Record<string, unknown>) => {
			// value is the form data (first argument, not event.formData)
			onSubmit(value ?? {});
		}
	});

	function handleSubmitClick() {
		if (formRef) {
			formRef.requestSubmit();
		}
	}
</script>

<div class="neat-form">
	<BasicForm {form} bind:ref={formRef} />
	<div class="mt-6">
		<button
			type="button"
			onclick={handleSubmitClick}
			class="neat-submit w-full cursor-pointer rounded-lg bg-white px-4 py-3 text-lg font-medium text-blue-900 hover:bg-blue-100 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900 focus:outline-none"
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
	.neat-form :global(input[type='text']),
	.neat-form :global(input[type='email']),
	.neat-form :global(input[type='number']),
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

	/* Hide the built-in submit button from BasicForm */
	.neat-form :global(button[type='submit']:not(.neat-submit)) {
		display: none;
	}

	/* Typeform-style radio card buttons */
	.neat-form :global(.sjsf-radio-group),
	.neat-form :global([role='radiogroup']) {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.neat-form :global(.sjsf-radio-group label),
	.neat-form :global([role='radiogroup'] label) {
		position: relative;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 1.25rem;
		color: white;
		font-weight: 500;
		margin-bottom: 0;
	}
	.neat-form :global(.sjsf-radio-group label:hover),
	.neat-form :global([role='radiogroup'] label:hover) {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.4);
		transform: translateY(-1px);
	}
	/* Selected state */
	.neat-form :global(.sjsf-radio-group label:has(input:checked)),
	.neat-form :global([role='radiogroup'] label:has(input:checked)) {
		background: rgba(255, 255, 255, 0.15);
		border-color: white;
		box-shadow: 0 0 0 1px white;
	}
	/* Hide native radio, create custom circle */
	.neat-form :global(.sjsf-radio-group input[type='radio']),
	.neat-form :global([role='radiogroup'] input[type='radio']) {
		appearance: none;
		-webkit-appearance: none;
		width: 1.5rem;
		height: 1.5rem;
		min-width: 1.5rem;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-radius: 50%;
		background: transparent;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}
	/* Checkmark inside when selected */
	.neat-form :global(.sjsf-radio-group input[type='radio']:checked),
	.neat-form :global([role='radiogroup'] input[type='radio']:checked) {
		border-color: white;
		background: white;
	}
	.neat-form :global(.sjsf-radio-group input[type='radio']:checked::after),
	.neat-form :global([role='radiogroup'] input[type='radio']:checked::after) {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -60%) rotate(45deg);
		width: 0.35rem;
		height: 0.6rem;
		border: solid #1e3a5f;
		border-width: 0 2px 2px 0;
	}

	/* Checkbox styling */
	.neat-form :global(input[type='checkbox']) {
		width: 1.5rem;
		height: 1.5rem;
		accent-color: white;
		margin-right: 0.5rem;
	}
</style>
