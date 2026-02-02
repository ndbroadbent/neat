<script lang="ts">
	import { fly } from 'svelte/transition';
	import NeatForm from '$lib/components/NeatForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let currentIndex = $state(0);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let direction = $state<'left' | 'right'>('right');

	// Current form based on index
	let currentForm = $derived(data.forms?.[currentIndex] ?? null);
	let totalForms = $derived(data.forms?.length ?? 0);

	function navigateLeft() {
		if (totalForms === 0) return;
		direction = 'left';
		currentIndex = currentIndex === 0 ? totalForms - 1 : currentIndex - 1;
	}

	function navigateRight() {
		if (totalForms === 0) return;
		direction = 'right';
		currentIndex = currentIndex === totalForms - 1 ? 0 : currentIndex + 1;
	}

	async function handleSubmit(response: Record<string, unknown>) {
		if (!currentForm) return;

		submitting = true;
		error = null;

		try {
			const res = await fetch(`/api/queue/${currentForm.id}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ response })
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || 'Failed to submit');
			}

			// Reload to get updated forms
			window.location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			submitting = false;
		}
	}

	async function handleSkip() {
		if (!currentForm) return;

		submitting = true;
		error = null;

		try {
			const res = await fetch(`/api/queue/${currentForm.id}/skip`, {
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
	<title>Neat{currentForm ? ` — ${currentForm.title}` : ''}</title>
</svelte:head>

<main
	class="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4"
>
	<!-- All Tasks link - always visible, top-right of page -->
	<a href="/tasks" class="fixed top-6 right-6 text-lg text-white/50 hover:text-white/80">
		All Tasks
	</a>

	{#if currentForm}
		<!-- Navigation container -->
		<div class="flex w-full max-w-4xl items-center justify-center gap-4">
			<!-- Left navigation arrow -->
			{#if totalForms > 1}
				<button
					onclick={navigateLeft}
					class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-2xl text-white/50 transition-all hover:bg-white/20 hover:text-white"
					aria-label="Previous task"
				>
					←
				</button>
			{/if}

			<!-- Form card with animation -->
			{#key currentForm.id}
				<div
					class="w-full max-w-3xl rounded-2xl bg-white/10 p-10 shadow-2xl backdrop-blur-sm"
					in:fly={{ x: direction === 'right' ? 100 : -100, duration: 200, opacity: 0 }}
					out:fly={{ x: direction === 'right' ? -100 : 100, duration: 200, opacity: 0 }}
				>
					<!-- Header -->
					<div class="mb-6">
						<!-- Task counter -->
						{#if totalForms > 1}
							<span class="mb-2 mr-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm text-blue-200">
								{currentIndex + 1} / {totalForms}
							</span>
						{/if}
						{#if currentForm.context}
							<span class="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm text-blue-200">
								{currentForm.context}
							</span>
						{/if}
						<h1 class="text-4xl font-bold text-white">{currentForm.title}</h1>
						{#if currentForm.summary}
							<p class="mt-3 text-xl text-blue-100">{currentForm.summary}</p>
						{/if}
					</div>

					<!-- References -->
					{#if currentForm.references && currentForm.references.length > 0}
						<div class="mb-8 rounded-lg bg-white/10 p-5">
							<h3 class="mb-3 text-base font-medium text-blue-200">References</h3>
							<ul class="space-y-2">
								{#each currentForm.references as ref, i (i)}
									<li>
										<a
											href={ref.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-lg text-blue-300 hover:text-white hover:underline"
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
						schema={currentForm.schema as import('@sjsf/form').Schema}
						uiSchema={currentForm.uiSchema as import('@sjsf/form').UiSchema | undefined}
						onSubmit={handleSubmit}
						submitText={submitting ? 'Submitting...' : 'Submit'}
					/>

					<!-- Skip button -->
					<div class="mt-4 text-center">
						<button
							onclick={handleSkip}
							disabled={submitting}
							class="cursor-pointer text-sm text-blue-300 hover:text-white"
						>
							Skip for now
						</button>
					</div>

					<!-- Card link -->
					<div class="mt-6 border-t border-white/20 pt-4 text-center text-sm">
						<a
							href="https://fizzy.home.ndbroadbent.com/1/cards/{currentForm.fizzyCardNumber}"
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-300 hover:text-white hover:underline"
						>
							Fizzy card #{currentForm.fizzyCardNumber}
						</a>
					</div>
				</div>
			{/key}

			<!-- Right navigation arrow -->
			{#if totalForms > 1}
				<button
					onclick={navigateRight}
					class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-2xl text-white/50 transition-all hover:bg-white/20 hover:text-white"
					aria-label="Next task"
				>
					→
				</button>
			{/if}
		</div>
	{:else}
		<!-- No pending forms -->
		<div class="text-center">
			<div class="text-8xl">🎉</div>
			<h1 class="mt-6 text-4xl font-bold text-white">All done!</h1>
			<p class="mt-3 text-xl text-blue-200">No pending decisions. Check back later.</p>
		</div>
	{/if}
</main>
