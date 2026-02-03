<script lang="ts">
	import { marked } from 'marked';
	import NeatForm from '$lib/components/NeatForm.svelte';
	import type { PageData } from './$types';

	// Configure marked for inline rendering
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	let { data }: { data: PageData } = $props();

	let submitting = $state(false);
	let error = $state<string | null>(null);

	// Parse error response from API
	async function parseErrorResponse(res: Response): Promise<string> {
		try {
			const data = await res.json();
			if (data.message) return data.message;
			if (data.error?.message) return data.error.message;
			if (typeof data.error === 'string') return data.error;
			return `Request failed (${res.status})`;
		} catch {
			return `Request failed (${res.status})`;
		}
	}

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
				const errorMessage = await parseErrorResponse(res);
				throw new Error(errorMessage);
			}

			// Redirect to home after submission
			window.location.href = '/';
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
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
				const errorMessage = await parseErrorResponse(res);
				throw new Error(errorMessage);
			}

			window.location.href = '/';
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Neat — {data.form.title}</title>
</svelte:head>

<main
	class="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4 pt-16 md:pt-4"
>
	<!-- Navigation links -->
	<div class="absolute top-4 right-4 flex gap-3 md:fixed md:top-6 md:right-6">
		<a
			href="/"
			class="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/20 hover:text-white md:bg-transparent md:px-0 md:py-0 md:text-lg md:text-white/50"
		>
			← Queue
		</a>
		<a
			href="/tasks"
			class="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/20 hover:text-white md:bg-transparent md:px-0 md:py-0 md:text-lg md:text-white/50"
		>
			All Tasks
		</a>
	</div>

	<!-- Form card -->
	<div class="w-full max-w-3xl rounded-2xl bg-white/10 p-6 shadow-2xl backdrop-blur-sm md:p-10">
		<!-- Header -->
		<div class="mb-6">
			<!-- Status badge -->
			<span
				class="mr-2 mb-2 inline-block rounded-full px-3 py-1 text-sm {data.form.status === 'pending'
					? 'bg-blue-500/30 text-blue-200'
					: data.form.status === 'completed'
						? 'bg-green-500/30 text-green-200'
						: 'bg-yellow-500/30 text-yellow-200'}"
			>
				{data.form.status}
			</span>

			<!-- Queue position if pending -->
			{#if data.queuePosition && data.totalPending}
				<span class="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm text-blue-200">
					#{data.queuePosition} of {data.totalPending} in queue
				</span>
			{/if}

			{#if data.form.context}
				<span class="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm text-blue-200">
					{data.form.context}
				</span>
			{/if}

			<h1 class="text-2xl font-bold text-white md:text-4xl">{data.form.title}</h1>

			{#if data.form.summary}
				<div class="prose prose-invert md:prose-lg mt-3 max-w-none text-blue-100">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- Content is from our DB -->
					{@html marked(data.form.summary)}
				</div>
			{/if}
		</div>

		<!-- References -->
		{#if data.form.references && data.form.references.length > 0}
			<div class="mb-8 rounded-lg bg-white/10 p-5">
				<h3 class="mb-3 text-base font-medium text-blue-200">References</h3>
				<ul class="space-y-2">
					{#each data.form.references as ref, i (i)}
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

		<!-- Completed response display -->
		{#if data.form.status === 'completed' && data.form.response}
			<div class="mb-8 rounded-lg bg-green-500/10 p-5">
				<h3 class="mb-3 text-base font-medium text-green-200">Response</h3>
				<pre class="overflow-x-auto text-sm text-green-100">{JSON.stringify(data.form.response, null, 2)}</pre>
			</div>
		{/if}

		<!-- Error -->
		{#if error}
			<div class="mb-4 rounded-lg bg-red-500/20 p-4 text-red-200">
				{error}
			</div>
		{/if}

		<!-- Form (only for pending) -->
		{#if data.form.status === 'pending'}
			<NeatForm
				schema={data.form.schema as import('@sjsf/form').Schema}
				uiSchema={data.form.uiSchema as import('@sjsf/form').UiSchema | undefined}
				onSubmit={handleSubmit}
				submitText={submitting ? 'Submitting...' : 'Submit'}
			/>

			<div class="mt-4 text-center">
				<button
					onclick={handleSkip}
					disabled={submitting}
					class="cursor-pointer rounded-lg px-4 py-2 text-sm text-blue-300 transition-all hover:bg-white/10 hover:text-white active:scale-95"
				>
					Skip for now
				</button>
			</div>
		{:else if data.form.status === 'skipped'}
			<div class="text-center">
				<p class="mb-4 text-blue-200">This task was skipped.</p>
				<a
					href="/api/forms/{data.form.id}/unskip"
					class="rounded-lg bg-white/20 px-4 py-2 text-white hover:bg-white/30"
					onclick={async (e) => {
						e.preventDefault();
						const res = await fetch(`/api/forms/${data.form.id}/unskip`, { method: 'POST' });
						if (res.ok) window.location.reload();
					}}
				>
					Restore to queue
				</a>
			</div>
		{/if}

		<!-- Card link -->
		<div class="mt-6 border-t border-white/20 pt-4 text-center">
			<a
				href="https://fizzy.home.ndbroadbent.com/1/cards/{data.form.fizzyCardNumber}"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-block rounded-lg px-3 py-2 text-sm text-blue-300 hover:bg-white/10 hover:text-white hover:underline"
			>
				Fizzy card #{data.form.fizzyCardNumber}
			</a>
		</div>
	</div>
</main>

<style>
	:global(.prose-invert) {
		--tw-prose-counters: rgba(255, 255, 255, 0.6) !important;
		--tw-prose-bullets: rgba(255, 255, 255, 0.6) !important;
	}
</style>
