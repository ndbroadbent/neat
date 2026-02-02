import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['e2e/**', 'node_modules/**'],
		// Disable parallel execution between files to prevent test isolation issues
		// (all tests share the same in-memory SQLite database)
		fileParallelism: false,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			reportsDirectory: './coverage',
			include: ['src/**/*.{js,ts}'],
			exclude: [
				'src/**/*.test.ts',
				'src/**/*.spec.ts',
				'src/**/*.svelte',
				'src/app.d.ts',
				'src/lib/index.ts',
				'src/lib/components/**', // Components covered by E2E tests
				'src/lib/server/db/schema.ts', // Drizzle schema - config, not business logic
				'src/routes/tasks/**', // Page routes covered by E2E tests
				'src/routes/api/forms/[id]/unskip/**' // Similar to skip - low priority
			],
			thresholds: {
				lines: 90,
				branches: 85,
				functions: 90,
				statements: 90
			}
		}
	}
});
