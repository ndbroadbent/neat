import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['e2e/**', 'node_modules/**'],
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
				'src/lib/server/db/schema.ts' // Drizzle schema - config, not business logic
			],
			thresholds: {
				lines: 90,
				branches: 90,
				functions: 90,
				statements: 90
			}
		}
	}
});
