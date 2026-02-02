<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function toggleSkip(formId: string, currentStatus: string) {
		const endpoint =
			currentStatus === 'skipped' ? `/api/forms/${formId}/unskip` : `/api/queue/${formId}/skip`;

		const res = await fetch(endpoint, { method: 'POST' });
		if (res.ok) {
			window.location.reload();
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

	function truncate(text: string | null, maxLength: number): string {
		if (!text) return '';
		return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
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

		<!-- Filters -->
		<div class="mb-6 flex flex-wrap gap-2">
			<a
				href="/tasks"
				class="rounded-full px-4 py-2 text-sm font-medium transition-colors
					{!data.currentFilter ? 'bg-white text-blue-900' : 'bg-white/10 text-white hover:bg-white/20'}"
			>
				All ({data.counts.pending + data.counts.skipped + data.counts.completed})
			</a>
			<a
				href="/tasks?status=pending"
				class="rounded-full px-4 py-2 text-sm font-medium transition-colors
					{data.currentFilter === 'pending'
					? 'bg-blue-500 text-white'
					: 'bg-white/10 text-white hover:bg-white/20'}"
			>
				New ({data.counts.pending})
			</a>
			<a
				href="/tasks?status=skipped"
				class="rounded-full px-4 py-2 text-sm font-medium transition-colors
					{data.currentFilter === 'skipped'
					? 'bg-yellow-500 text-white'
					: 'bg-white/10 text-white hover:bg-white/20'}"
			>
				Skipped ({data.counts.skipped})
			</a>
			<a
				href="/tasks?status=completed"
				class="rounded-full px-4 py-2 text-sm font-medium transition-colors
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
						class="flex items-center justify-between rounded-xl bg-white/10 p-4 backdrop-blur-sm"
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

						<div class="ml-4 flex-shrink-0">
							{#if form.status === 'pending'}
								<button
									onclick={() => toggleSkip(form.id, form.status)}
									class="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/20 hover:text-white"
								>
									Skip
								</button>
							{:else if form.status === 'skipped'}
								<button
									onclick={() => toggleSkip(form.id, form.status)}
									class="cursor-pointer rounded-lg bg-yellow-500/20 px-3 py-2 text-sm text-yellow-200 hover:bg-yellow-500/30"
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
