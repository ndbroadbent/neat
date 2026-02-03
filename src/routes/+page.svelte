<script lang="ts">
	import { fly } from 'svelte/transition';
	import { marked } from 'marked';
	import NeatForm from '$lib/components/NeatForm.svelte';
	import type { PageData } from './$types';

	// Configure marked for inline rendering (no <p> wrapper for simple text)
	marked.setOptions({
		breaks: true, // Convert \n to <br>
		gfm: true // GitHub Flavored Markdown
	});

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

	// Touch/swipe handling for mobile
	let touchStartX = $state(0);
	let touchEndX = $state(0);
	const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.changedTouches[0].screenX;
	}

	function handleTouchEnd(e: TouchEvent) {
		touchEndX = e.changedTouches[0].screenX;
		handleSwipe();
	}

	function handleSwipe() {
		const swipeDistance = touchEndX - touchStartX;
		if (Math.abs(swipeDistance) < SWIPE_THRESHOLD) return;

		if (swipeDistance > 0) {
			// Swiped right -> go to previous
			navigateLeft();
		} else {
			// Swiped left -> go to next
			navigateRight();
		}
	}

	// Parse error response from API - handles various formats
	async function parseErrorResponse(res: Response): Promise<string> {
		try {
			const data = await res.json();
			// SvelteKit error format: { message: string }
			if (data.message) return data.message;
			// Alternative format: { error: { message: string } }
			if (data.error?.message) return data.error.message;
			// Plain error string
			if (typeof data.error === 'string') return data.error;
			// Fallback
			return `Request failed (${res.status})`;
		} catch {
			// JSON parse failed
			return `Request failed (${res.status})`;
		}
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
				const errorMessage = await parseErrorResponse(res);
				throw new Error(errorMessage);
			}

			// Reload to get updated forms
			window.location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
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
				const errorMessage = await parseErrorResponse(res);
				throw new Error(errorMessage);
			}

			window.location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Neat{currentForm ? ` — ${currentForm.title}` : ''}</title>
</svelte:head>

<main
	class="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4 pt-16 md:pt-4"
>
	<!-- All Tasks link - fixed on larger screens, absolute on mobile -->
	<a
		href="/tasks"
		class="absolute top-4 right-4 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/20 hover:text-white md:fixed md:top-6 md:right-6 md:bg-transparent md:px-0 md:py-0 md:text-lg md:text-white/50"
	>
		All Tasks
	</a>

	{#if currentForm}
		<!-- Navigation container -->
		<div class="flex w-full max-w-4xl items-center justify-center gap-4">
			<!-- Left navigation arrow (desktop only) -->
			{#if totalForms > 1}
				<button
					onclick={navigateLeft}
					class="hidden h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-2xl text-white/50 transition-all hover:bg-white/20 hover:text-white md:flex"
					aria-label="Previous task"
				>
					←
				</button>
			{/if}

			<!-- Form card with animation (swipe on mobile) -->
			{#key currentForm.id}
				<div
					class="w-full max-w-3xl rounded-2xl bg-white/10 p-6 shadow-2xl backdrop-blur-sm md:p-10"
					in:fly={{ x: direction === 'right' ? 100 : -100, duration: 200, opacity: 0 }}
					out:fly={{ x: direction === 'right' ? -100 : 100, duration: 200, opacity: 0 }}
					ontouchstart={handleTouchStart}
					ontouchend={handleTouchEnd}
					role="region"
					aria-label="Task card - swipe left or right to navigate"
				>
					<!-- Header -->
					<div class="mb-6">
						<!-- Task counter -->
						{#if totalForms > 1}
							<span
								class="mr-2 mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm text-blue-200"
							>
								{currentIndex + 1} / {totalForms}
							</span>
						{/if}
						{#if currentForm.context}
							<span
								class="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm text-blue-200"
							>
								{currentForm.context}
							</span>
						{/if}
						<h1 class="text-2xl font-bold text-white md:text-4xl">{currentForm.title}</h1>
						{#if currentForm.summary}
							<div class="prose prose-invert md:prose-lg mt-3 max-w-none text-blue-100">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- Content is from our DB, not user input -->
								{@html marked(currentForm.summary)}
							</div>
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

					<!-- Skip button - larger touch target on mobile -->
					<div class="mt-4 text-center">
						<button
							onclick={handleSkip}
							disabled={submitting}
							class="cursor-pointer rounded-lg px-4 py-2 text-sm text-blue-300 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
						>
							Skip for now
						</button>
					</div>

					<!-- Card link - larger touch target -->
					<div class="mt-6 border-t border-white/20 pt-4 text-center">
						<a
							href="https://fizzy.home.ndbroadbent.com/1/cards/{currentForm.fizzyCardNumber}"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-block rounded-lg px-3 py-2 text-sm text-blue-300 hover:bg-white/10 hover:text-white hover:underline"
						>
							Fizzy card #{currentForm.fizzyCardNumber}
						</a>
					</div>
				</div>
			{/key}

			<!-- Right navigation arrow (desktop only) -->
			{#if totalForms > 1}
				<button
					onclick={navigateRight}
					class="hidden h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-2xl text-white/50 transition-all hover:bg-white/20 hover:text-white md:flex"
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
			<h1 class="mt-6 text-2xl font-bold text-white md:text-4xl">All done!</h1>
			<p class="mt-3 text-lg text-blue-200 md:text-xl">No pending decisions. Check back later.</p>
		</div>
	{/if}
</main>

<style>
	/* Fix prose list markers - override Tailwind prose counters variable */
	:global(.prose-invert) {
		--tw-prose-counters: rgba(255, 255, 255, 0.6) !important;
		--tw-prose-bullets: rgba(255, 255, 255, 0.6) !important;
	}
</style>
