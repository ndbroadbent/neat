<script lang="ts">
	import NeatForm from '$lib/components/NeatForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(response: Record<string, unknown>) {
		if (!data.form) return;

		submitting = true;
		error = null;

		try {
			const res = await fetch(`/api/queue/${data.form.id}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ response })
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || 'Failed to submit');
			}

			// Reload to get next form
			window.location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			submitting = false;
		}
	}

	async function handleSkip() {
		if (!data.form) return;

		submitting = true;
		error = null;

		try {
			const res = await fetch(`/api/queue/${data.form.id}/skip`, {
				method: 'POST'
			});

			if (!res.ok) {
				throw new Error('Failed to skip');
			}

			window.location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Neat{data.form ? ` — ${data.form.title}` : ''}</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
	{#if data.form}
		<div class="w-full max-w-2xl rounded-xl bg-white p-8 shadow-lg">
			<!-- Header -->
			<div class="mb-6">
				{#if data.form.context}
					<span class="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
						{data.form.context}
					</span>
				{/if}
				<h1 class="text-2xl font-bold text-gray-900">{data.form.title}</h1>
				{#if data.form.summary}
					<p class="mt-2 text-gray-600">{data.form.summary}</p>
				{/if}
			</div>

			<!-- References -->
			{#if data.form.references && data.form.references.length > 0}
				<div class="mb-6 rounded-lg bg-gray-50 p-4">
					<h3 class="mb-2 text-sm font-medium text-gray-500">References</h3>
					<ul class="space-y-1">
						{#each data.form.references as ref, i (i)}
							<li>
								<a
									href={ref.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-blue-600 hover:underline"
								>
									{ref.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Error -->
			{#if error}
				<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
					{error}
				</div>
			{/if}

			<!-- Form -->
			<NeatForm
				schema={data.form.schema as import('@sjsf/form').Schema}
				uiSchema={data.form.uiSchema as import('@sjsf/form').UiSchema | undefined}
				onSubmit={handleSubmit}
				submitText={submitting ? 'Submitting...' : 'Submit'}
			/>

			<!-- Skip button -->
			<div class="mt-4 text-center">
				<button
					onclick={handleSkip}
					disabled={submitting}
					class="text-sm text-gray-500 hover:text-gray-700"
				>
					Skip for now
				</button>
			</div>

			<!-- Card link -->
			<div class="mt-6 border-t pt-4 text-center text-sm text-gray-400">
				Fizzy card #{data.form.fizzyCardNumber}
			</div>
		</div>
	{:else}
		<!-- No pending forms -->
		<div class="text-center">
			<div class="text-6xl">🎉</div>
			<h1 class="mt-4 text-2xl font-bold text-gray-900">All done!</h1>
			<p class="mt-2 text-gray-600">No pending decisions. Check back later.</p>
		</div>
	{/if}
</main>
