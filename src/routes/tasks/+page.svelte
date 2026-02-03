<script lang="ts">
	import { marked } from 'marked';
	import type { PageData } from './$types';

	// Configure marked
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	let { data }: { data: PageData } = $props();
	let error = $state<string | null>(null);

	// Parse error response from API - handles various formats
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

	async function toggleSkip(formId: string, currentStatus: string) {
		error = null;
		const endpoint =
			currentStatus === 'skipped' ? `/api/forms/${formId}/unskip` : `/api/queue/${formId}/skip`;

		try {
			const res = await fetch(endpoint, { method: 'POST' });
			if (!res.ok) {
				const errorMessage = await parseErrorResponse(res);
				throw new Error(errorMessage);
			}
			window.location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'pending':
				return { text: 'New', class: 'bg-blue-500/30 text-blue-200' };
			case 'skipped':
				return { text: 'Skipped', class: 'bg-yellow-500/30 text-yellow-200' };
			case 'completed':
				return { text: 'Done', class: 'bg-green-500/30 text-green-200' };
			default:
				return { text: status, class: 'bg-gray-500/30 text-gray-200' };
		}
	}

	// Convert markdown to plain text for truncation
	function markdownToPlainText(md: string): string {
		// Convert markdown to HTML with marked, then strip HTML tags
		const html = marked.parse(md, { async: false }) as string;
		return html
			.replace(/<[^>]+>/g, '') // strip HTML tags
			.replace(/&nbsp;/g, ' ') // common HTML entity
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/\n+/g, ' ') // newlines to spaces
			.trim();
	}

	function truncate(text: string | null, maxLength: number): string {
		if (!text) return '';
		const plain = markdownToPlainText(text);
		return plain.length > maxLength ? plain.slice(0, maxLength) + '...' : plain;
	}
</script>

<svelte:head>
	<title>All Tasks — Neat</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4 md:p-8">
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-8">
			<a href="/" class="text-sm text-white/50 hover:text-white/80"> ← Back to Next Task </a>
			<h1 class="mt-4 text-3xl font-bold text-white">All Tasks</h1>
		</div>

		<!-- Error display -->
		{#if error}
			<div class="mb-6 rounded-lg bg-red-500/20 p-4 text-red-200">
				{error}
			</div>
		{/if}

		<!-- Filters - larger touch targets on mobile -->
		<div class="mb-6 flex flex-wrap gap-2">
			<a
				href="/tasks"
				class="rounded-full px-4 py-2.5 text-sm font-medium transition-colors md:px-4 md:py-2
					{!data.currentFilter ? 'bg-white text-blue-900' : 'bg-white/10 text-white hover:bg-white/20'}"
			>
				All ({data.counts.pending + data.counts.skipped + data.counts.completed})
			</a>
			<a
				href="/tasks?status=pending"
				class="rounded-full px-4 py-2.5 text-sm font-medium transition-colors md:px-4 md:py-2
					{data.currentFilter === 'pending'
					? 'bg-blue-500 text-white'
					: 'bg-white/10 text-white hover:bg-white/20'}"
			>
				New ({data.counts.pending})
			</a>
			<a
				href="/tasks?status=skipped"
				class="rounded-full px-4 py-2.5 text-sm font-medium transition-colors md:px-4 md:py-2
					{data.currentFilter === 'skipped'
					? 'bg-yellow-500 text-white'
					: 'bg-white/10 text-white hover:bg-white/20'}"
			>
				Skipped ({data.counts.skipped})
			</a>
			<a
				href="/tasks?status=completed"
				class="rounded-full px-4 py-2.5 text-sm font-medium transition-colors md:px-4 md:py-2
					{data.currentFilter === 'completed'
					? 'bg-green-500 text-white'
					: 'bg-white/10 text-white hover:bg-white/20'}"
			>
				Done ({data.counts.completed})
			</a>
		</div>

		<!-- Task List -->
		{#if data.forms.length === 0}
			<div class="rounded-xl bg-white/10 p-8 text-center">
				<p class="text-lg text-blue-200">No tasks found</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.forms as form (form.id)}
					{@const badge = getStatusBadge(form.status)}
					<div
						role="button"
						tabindex="0"
						onclick={() => (window.location.href = `/tasks/${form.id}`)}
						onkeydown={(e) => e.key === 'Enter' && (window.location.href = `/tasks/${form.id}`)}
						class="flex cursor-pointer items-center justify-between rounded-xl bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/15"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-3">
								<span class="rounded-full px-2 py-1 text-xs font-medium {badge.class}">
									{badge.text}
								</span>
								<a
									href="https://fizzy.home.ndbroadbent.com/1/cards/{form.fizzyCardNumber}"
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-white/40 hover:text-white/60"
									onclick={(e) => e.stopPropagation()}
								>
									#{form.fizzyCardNumber}
								</a>
							</div>
							<h3 class="mt-1 truncate text-lg font-medium text-white">
								{form.title}
							</h3>
							{#if form.summary}
								<p class="mt-1 text-sm text-blue-200/70">
									{truncate(form.summary, 100)}
								</p>
							{/if}
						</div>

						<div class="ml-4 flex-shrink-0" onclick={(e) => e.stopPropagation()}>
							{#if form.status === 'pending'}
								<button
									onclick={() => toggleSkip(form.id, form.status)}
									class="cursor-pointer rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white/70 transition-transform hover:bg-white/20 hover:text-white active:scale-95"
								>
									Skip
								</button>
							{:else if form.status === 'skipped'}
								<button
									onclick={() => toggleSkip(form.id, form.status)}
									class="cursor-pointer rounded-lg bg-yellow-500/20 px-4 py-2.5 text-sm text-yellow-200 transition-transform hover:bg-yellow-500/30 active:scale-95"
								>
									Unskip
								</button>
							{:else}
								<span class="text-sm text-green-300/50">✓</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</main>
