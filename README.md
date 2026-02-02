# Neat

**One thing at a time. No friction.**

Neat is an ADHD-friendly, minimal decision UI for humans who work with AI agents. When your AI is faster than you can keep up with, Neat shows you exactly one task at a time with a custom form tailored to what that task needs from you.

## The Problem

AI agents are becoming incredibly productive — often faster than their humans can keep up with. This creates a new bottleneck: the human's ability to make decisions, provide input, and stay in the loop.

For people with ADHD (or anyone overwhelmed by traditional task management), the cognitive load of:

- Scanning a kanban board
- Deciding what to work on
- Context-switching between unrelated tasks
- Figuring out what a task even needs from them

...is often the blocker, not the work itself.

## The Solution

Neat sits in front of your task management system and:

1. **Presents one task at a time** — no board, no list, just THE thing
2. **Renders custom forms per task** — tailored to what that specific task needs
3. **Minimizes cognitive load** — clear title, summary, question, and input. Nothing else.
4. **Auto-updates your tasks** — responses become comments, status changes automatically
5. **Prioritizes by context** — clusters related tasks to minimize context-switching

## How It Works

```
┌─────────────────────────────────────────────┐
│                                             │
│  [Category Tag]                             │
│                                             │
│  Task Title                                 │
│  ─────────────────────────────────────────  │
│                                             │
│  Brief summary of what this is about and    │
│  why it needs your attention.               │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  **Question:**                              │
│  Which approach should we take?             │
│                                             │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│    │    A    │  │    B    │  │    C    │    │
│    └─────────┘  └─────────┘  └─────────┘    │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │ Other: [type here]              │      │
│    └─────────────────────────────────┘      │
│                                             │
│              [ Submit ]                     │
│                                             │
└─────────────────────────────────────────────┘
```

### Form Types

| Type      | Use Case                    | UI Component                            |
| --------- | --------------------------- | --------------------------------------- |
| `choice`  | Multiple choice question    | Buttons + "Other" text field            |
| `text`    | Need freeform input         | Text area                               |
| `file`    | Need a file/screenshot      | Drag-and-drop upload zone               |
| `confirm` | Just need acknowledgment    | Single "Done" button                    |
| `steps`   | Human needs to DO something | Step-by-step instructions with checkbox |
| `info`    | FYI, no action needed       | Just a "Got it" button                  |

## Architecture

```
┌──────────────┐      ┌───────────────────────────────────┐
│              │      │               Neat                │
│   AI Agent   │─────▶│  ┌──────────┐   ┌──────────────┐  │
│   (creates   │      │  │ Form DB  │   │  SvelteKit   │  │
│    forms)    │      │  │ (SQLite) │◀─▶│    API       │  │
│              │      │  └──────────┘   └──────────────┘  │
└──────────────┘      │                       │           │
                      │                       ▼           │
┌──────────────┐      │  ┌─────────────────────────────┐  │
│    Human     │─────▶│  │    Neat UI (SvelteKit)      │  │
│  (fills out  │      │  │  - Renders JSON Schema forms│  │
│    forms)    │      │  │  - One task at a time       │  │
└──────────────┘      │  └─────────────────────────────┘  │
                      └────────────────┬──────────────────┘
                                       │
                                       ▼
                             ┌──────────────────┐
                             │   Task Backend   │
                             │  (Fizzy, Linear, │
                             │   GitHub, etc.)  │
                             └──────────────────┘
```

## Design

- **Background:** Deep blue subtle gradient (dark navy to slightly lighter blue)
- **Text:** White, high contrast for readability
- **Typography:** Inter font, large type sizes for easy scanning
- **Style:** Beautiful, minimal — no clutter, generous whitespace, calm aesthetic

## Tech Stack

- **Frontend:** SvelteKit + Tailwind CSS
- **Forms:** JSON Schema with [@sjsf/form](https://github.com/x0k/svelte-jsonschema-form)
- **Database:** SQLite with Drizzle ORM
- **File uploads:** Local storage or S3-compatible

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm

### Installation

```bash
# Clone the repo
git clone https://github.com/ndbroadbent/neat.git
cd neat

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Configuration

Create a `.env` file:

```bash
# Task backend (e.g., Fizzy)
TASK_API_URL=https://your-task-api.example.com
TASK_API_TOKEN=your-token

# File uploads
UPLOAD_DIR=/opt/neat-uploads
```

## API

### Forms (for AI agents)

```
POST   /api/forms              # Create form for a task
GET    /api/forms/:id          # Get form
PUT    /api/forms/:id          # Update form
DELETE /api/forms/:id          # Delete form
```

### Queue (for humans)

```
GET    /api/queue              # Get next prioritized form
POST   /api/queue/:id/submit   # Submit form response
POST   /api/queue/:id/skip     # Skip for now
```

### Form Definition Example

```json
{
	"taskId": "task_123",
	"title": "Choose database for new service",
	"summary": "The monitoring service needs persistent storage...",
	"schema": {
		"type": "object",
		"required": ["choice"],
		"properties": {
			"choice": {
				"type": "string",
				"title": "Which database?",
				"enum": ["postgres", "sqlite", "redis"]
			},
			"notes": {
				"type": "string",
				"title": "Any additional context?"
			}
		}
	},
	"uiSchema": {
		"choice": { "ui:widget": "radio" },
		"notes": { "ui:widget": "textarea" }
	}
}
```

## Roadmap

- [x] SvelteKit project setup
- [x] README and documentation
- [ ] Deploy to K3s (in progress)
- [ ] SQLite database with Drizzle ORM
- [ ] Form CRUD API
- [ ] JSON Schema form renderer
- [ ] Queue with prioritization
- [ ] Context clustering (minimize context-switching)
- [ ] File upload support
- [ ] Mobile responsive
- [ ] Keyboard shortcuts
- [ ] Generic task backend adapters

## Philosophy

> "Neat: like whiskey. No mixer, no garnish. Just the thing."

Neat is designed for one purpose: reduce the friction between "AI needs something from you" and "you provide it." No dashboards, no analytics, no gamification. Just the next thing you need to do, presented in the simplest possible way.

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.
