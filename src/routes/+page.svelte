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

<main
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4"
>
	{#if data.form}
		<div class="w-full max-w-2xl rounded-xl bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
			<!-- Header -->
			<div class="mb-6">
				{#if data.form.context}
					<span class="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm text-blue-200">
						{data.form.context}
					</span>
				{/if}
				<h1 class="text-2xl font-bold text-white">{data.form.title}</h1>
				{#if data.form.summary}
					<p class="mt-2 text-blue-100">{data.form.summary}</p>
				{/if}
			</div>

			<!-- References -->
			{#if data.form.references && data.form.references.length > 0}
				<div class="mb-6 rounded-lg bg-white/10 p-4">
					<h3 class="mb-2 text-sm font-medium text-blue-200">References</h3>
					<ul class="space-y-1">
						{#each data.form.references as ref, i (i)}
							<li>
								<a
									href={ref.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-blue-300 hover:text-white hover:underline"
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
				<div class="mb-4 rounded-lg bg-red-500/20 p-4 text-red-200">
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
					class="text-sm text-blue-300 hover:text-white"
				>
					Skip for now
				</button>
			</div>

			<!-- Card link -->
			<div class="mt-6 border-t border-white/20 pt-4 text-center text-sm text-blue-300">
				Fizzy card #{data.form.fizzyCardNumber}
			</div>
		</div>
	{:else}
		<!-- No pending forms -->
		<div class="text-center">
			<div class="text-6xl">🎉</div>
			<h1 class="mt-4 text-2xl font-bold text-white">All done!</h1>
			<p class="mt-2 text-blue-200">No pending decisions. Check back later.</p>
		</div>
	{/if}
</main>
