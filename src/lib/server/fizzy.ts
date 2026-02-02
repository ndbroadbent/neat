import { env } from '$env/dynamic/private';

function getApiBase() {
	return `${env.FIZZY_API_URL}/${env.FIZZY_ACCOUNT}`;
}

export interface FizzyResponse<T> {
	success: boolean;
	data?: T;
	error?: { code: string; message: string };
}

// Generic fetch wrapper
async function fizzyFetch<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<FizzyResponse<T>> {
	const response = await fetch(`${getApiBase()}${endpoint}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.FIZZY_TOKEN}`,
			...options.headers
		}
	});

	return response.json();
}

// Get card details
export async function getCard(cardNumber: number) {
	return fizzyFetch<FizzyCard>(`/cards/${cardNumber}.json`);
}

// Add comment to a card
export async function addComment(cardNumber: number, body: string) {
	return fizzyFetch<FizzyComment>(`/cards/${cardNumber}/comments.json`, {
		method: 'POST',
		body: JSON.stringify({ body })
	});
}

// Move card to a column
export async function moveCard(cardNumber: number, columnId: string) {
	return fizzyFetch<object>(`/cards/${cardNumber}/column.json`, {
		method: 'PUT',
		body: JSON.stringify({ column_id: columnId })
	});
}

// Close a card
export async function closeCard(cardNumber: number) {
	return fizzyFetch<object>(`/cards/${cardNumber}/close.json`, {
		method: 'PUT'
	});
}

// Types
export interface FizzyCard {
	id: string;
	number: number;
	title: string;
	description: string;
	closed: boolean;
	column?: { id: string; name: string };
	board: { id: string; name: string };
}

export interface FizzyComment {
	id: string;
	body: { html: string; plain_text: string };
	created_at: string;
}
