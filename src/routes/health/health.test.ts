/**
 * Tests for Health endpoint
 */

import { describe, it, expect } from 'vitest';
import { GET } from './+server';

describe('Health API', () => {
	it('should return ok status', async () => {
		const response = await GET({} as Parameters<typeof GET>[0]);
		const data = await response.json();

		expect(data.status).toBe('ok');
		expect(data.timestamp).toBeDefined();
	});
});
