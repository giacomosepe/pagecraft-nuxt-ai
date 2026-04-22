# PageCraft

AI-assisted drafting tool for structured legal and technical documents.

PageCraft currently targets Italian Patent Box documentation. Users work step by step through a document, generate and refine content with AI, and export the final result to Word.

## Stack

- Nuxt 4
- Nuxt UI 4
- Supabase
- Prisma CLI for schema and migrations
- Vercel AI SDK
- Anthropic via `@ai-sdk/anthropic`

## Local development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

PageCraft is hosted as a Node server and deployed from GitHub.

Before deploying, verify:

- required environment variables are present
- the app boots locally
- the current production-sensitive flows still work

## Important local docs

- `AGENTS.md` — canonical repo-local operating contract for coding agents
- `codebase-map.md` — current code structure and known quirks
- `TODAY.md` — current frontier and next action
- `REFACTOR.md` — active and completed major refactors

