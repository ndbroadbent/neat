/**
 * Screenshot generator for README
 *
 * Creates an example form and takes a screenshot of the Neat UI.
 * Run with: bun run scripts/screenshot.ts
 */

import { chromium } from 'playwright';
import { Database } from 'bun:sqlite';
import { nanoid } from 'nanoid';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const DB_PATH = './data/neat.db';
const SCREENSHOT_PATH = './docs/screenshot.jpg';
const DEV_URL = 'http://localhost:5173';

// Example form that showcases the UI well
const exampleForm = {
	id: nanoid(),
	fizzy_card_id: 'example-card-001',
	fizzy_card_number: 42,
	fizzy_board_id: 'example-board',
	title: 'Choose database for monitoring service',
	summary:
		'The new monitoring service needs persistent storage for metrics history. We need to decide between a few options based on our infrastructure.',
	references: JSON.stringify([
		{ label: 'Architecture RFC', url: '#', type: 'doc' },
		{ label: 'Performance comparison', url: '#', type: 'link' }
	]),
	schema: JSON.stringify({
		type: 'object',
		required: ['database'],
		properties: {
			database: {
				type: 'string',
				title: 'Which database should we use?',
				enum: ['postgres', 'sqlite', 'timescaledb'],
				enumNames: ['PostgreSQL', 'SQLite', 'TimescaleDB']
			},
			notes: {
				type: 'string',
				title: 'Any additional context?'
			}
		}
	}),
	ui_schema: JSON.stringify({
		database: { 'ui:widget': 'radio' },
		notes: { 'ui:widget': 'textarea', 'ui:placeholder': 'Optional notes...' }
	}),
	on_submit: 'comment',
	status: 'pending',
	context: 'infrastructure',
	priority: 1,
	created_at: Math.floor(Date.now() / 1000),
	updated_at: Math.floor(Date.now() / 1000)
};

async function seedForm(): Promise<string> {
	console.log('Seeding example form...');

	const db = new Database(DB_PATH);

	// Clear any existing pending forms for clean screenshot
	db.run("DELETE FROM forms WHERE status = 'pending'");

	// Insert example form
	const stmt = db.prepare(`
    INSERT INTO forms (
      id, fizzy_card_id, fizzy_card_number, fizzy_board_id,
      title, summary, "references", schema, ui_schema,
      on_submit, status, context, priority, created_at, updated_at
    ) VALUES (
      $id, $fizzy_card_id, $fizzy_card_number, $fizzy_board_id,
      $title, $summary, $references, $schema, $ui_schema,
      $on_submit, $status, $context, $priority, $created_at, $updated_at
    )
  `);

	stmt.run({
		$id: exampleForm.id,
		$fizzy_card_id: exampleForm.fizzy_card_id,
		$fizzy_card_number: exampleForm.fizzy_card_number,
		$fizzy_board_id: exampleForm.fizzy_board_id,
		$title: exampleForm.title,
		$summary: exampleForm.summary,
		$references: exampleForm.references,
		$schema: exampleForm.schema,
		$ui_schema: exampleForm.ui_schema,
		$on_submit: exampleForm.on_submit,
		$status: exampleForm.status,
		$context: exampleForm.context,
		$priority: exampleForm.priority,
		$created_at: exampleForm.created_at,
		$updated_at: exampleForm.updated_at
	});

	db.close();
	console.log(`✓ Form seeded with id: ${exampleForm.id}`);
	return exampleForm.id;
}

async function takeScreenshot(): Promise<void> {
	console.log('Launching browser...');

	const browser = await chromium.launch({
		headless: true
	});

	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		deviceScaleFactor: 2 // Retina quality
	});

	const page = await context.newPage();

	console.log(`Navigating to ${DEV_URL}...`);
	await page.goto(DEV_URL, { waitUntil: 'networkidle' });

	// Wait for the form to render
	await page.waitForSelector('form', { timeout: 10000 });

	// Small delay to ensure fonts and animations are complete
	await page.waitForTimeout(500);

	// Ensure docs directory exists
	await mkdir(join(process.cwd(), 'docs'), { recursive: true });

	console.log(`Taking screenshot...`);
	await page.screenshot({
		path: SCREENSHOT_PATH,
		type: 'jpeg',
		quality: 90,
		fullPage: false
	});

	await browser.close();
	console.log(`✓ Screenshot saved to ${SCREENSHOT_PATH}`);
}

async function cleanup(formId: string): Promise<void> {
	console.log('Cleaning up...');
	const db = new Database(DB_PATH);
	db.run('DELETE FROM forms WHERE id = ?', [formId]);
	db.close();
	console.log('✓ Example form removed');
}

async function main(): Promise<void> {
	console.log('\n📸 Neat Screenshot Generator\n');

	// Check if dev server is running
	try {
		const res = await fetch(DEV_URL);
		if (!res.ok) throw new Error('Dev server not responding');
	} catch {
		console.error('❌ Dev server not running. Start it with: bun run dev');
		process.exit(1);
	}

	const formId = await seedForm();

	try {
		await takeScreenshot();
	} finally {
		await cleanup(formId);
	}

	console.log('\n✅ Done! Screenshot ready at docs/screenshot.jpg\n');
}

main().catch(console.error);
