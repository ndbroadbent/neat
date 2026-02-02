/**
 * Tests for Fizzy API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment
vi.mock('$env/dynamic/private', () => ({
	env: {
		FIZZY_API_URL: 'https://fizzy.test.com',
		FIZZY_ACCOUNT: 'test-account',
		FIZZY_TOKEN: 'test-token'
	}
}));

// Mock fetch globally - keep as vi.fn() for mock methods, cast when assigning
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { getCard, addComment, moveCard, closeCard } from './fizzy';

describe('Fizzy API Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getCard', () => {
		it('should fetch card details', async () => {
			const mockCard = {
				id: 'card-123',
				number: 42,
				title: 'Test Card',
				description: 'Test description',
				closed: false
			};

			mockFetch.mockResolvedValueOnce({
				json: async () => ({ success: true, data: mockCard })
			});

			const result = await getCard(42);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://fizzy.test.com/test-account/cards/42.json',
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: 'Bearer test-token'
					})
				})
			);
			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockCard);
		});
	});

	describe('addComment', () => {
		it('should post a comment to a card', async () => {
			const mockComment = {
				id: 'comment-123',
				body: { html: '<p>Test</p>', plain_text: 'Test' },
				created_at: '2026-01-01T00:00:00Z'
			};

			mockFetch.mockResolvedValueOnce({
				json: async () => ({ success: true, data: mockComment })
			});

			const result = await addComment(42, 'Test comment');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://fizzy.test.com/test-account/cards/42/comments.json',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ comment: { body: 'Test comment' } })
				})
			);
			expect(result.success).toBe(true);
		});
	});

	describe('moveCard', () => {
		it('should move a card to a column', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => ({ success: true, data: {} })
			});

			const result = await moveCard(42, 'column-abc');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://fizzy.test.com/test-account/cards/42/column.json',
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify({ column_id: 'column-abc' })
				})
			);
			expect(result.success).toBe(true);
		});
	});

	describe('closeCard', () => {
		it('should close a card', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => ({ success: true, data: {} })
			});

			const result = await closeCard(42);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://fizzy.test.com/test-account/cards/42/close.json',
				expect.objectContaining({
					method: 'PUT'
				})
			);
			expect(result.success).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should return error response from API', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => ({
					success: false,
					error: { code: 'not_found', message: 'Card not found' }
				})
			});

			const result = await getCard(999);

			expect(result.success).toBe(false);
			expect(result.error?.message).toBe('Card not found');
		});
	});
});
