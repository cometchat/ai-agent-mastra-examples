# Build a Product Hunt Agent with Mastra (with Frontend Actions)

> Create a Mastra agent that can fetch Product Hunt posts, answer launch questions, and trigger frontend actions (confetti), then plug it into CometChat.

Give your chats superpowers: let an agent call tools to retrieve Product Hunt data and return safe, structured UI actions that your frontend runs (like confetti).

---

## Quick links

- Live demo: [cometchat.github.io/ai-agent-mastra-examples/product-hunt-agent/web](https://cometchat.github.io/ai-agent-mastra-examples/product-hunt-agent/web/)

---

## What you’ll build

- A Mastra agent that can:
  - Get top Product Hunt posts by timeframe or all‑time by votes
  - Search posts via Product Hunt’s public Algolia index
  - Answer practical “how to launch on Product Hunt” questions
  - Trigger a confetti animation in the user’s browser (frontend action)
- A tiny HTTP API that exposes `/api/top*`, `/api/search`, and `/api/chat`
- A static Product Hunt‑style page (with CometChat widget) that handles the confetti tool

Repo layout in this example:

- `src/mastra/agents/producthunt-agent.ts` — the agent definition
- `src/mastra/tools/producthunt-tools.ts` — tools: top products, timeframe top, search, confetti
- `src/services/producthunt.ts` — Product Hunt GraphQL + Algolia helpers and timeframe parsing
- `src/server.ts` — minimal API server returning JSON and agent chat
- `web/index.html` — static UI that mounts CometChat and maps the confetti tool

---

## Prerequisites

- Node.js 20+
- OpenAI API key in your environment as `OPENAI_API_KEY` (agent Q&A)
- Product Hunt API token as `PRODUCTHUNT_API_TOKEN` (for top posts)
- A CometChat app (for the widget on the static page)

Optional quick links in this project:

- Runtime & scripts: `package.json`
- Server TS build: `tsconfig.server.json`
- Static page: `web/index.html`

---

## How it works

- The agent (model: OpenAI via `@ai-sdk/openai`) can call tools:
  - `get-top-products` — top all‑time by votes (GraphQL)
  - `get-top-products-by-timeframe` — top posts for a day/week/month/date range with timezone
  - `search-products` — search via Algolia public index
  - `confetti-tool` — returns a structured payload the frontend uses to fire confetti
- The API server exposes:
  - `GET /api/top`, `GET /api/top-week`, `GET /api/top-range` — fetch posts
  - `GET /api/search` — Algolia search
  - `POST /api/chat` — chat with the agent; server streams model text and returns `{ reply }`
- The static page uses the CometChat Embed, and registers a client‑side tool handler map. When a chat message triggers `confetti-tool`, the page loads `canvas-confetti` and fires it with the provided options.

Security note: model/provider keys are server‑side; frontend only receives tool payloads for UI.

---

## Step 1 — Define tools

File: `src/mastra/tools/producthunt-tools.ts`

- Top/all‑time: `get-top-products`
- Timeframe: `get-top-products-by-timeframe` (supports today/yesterday/this‑week/last‑week/this‑month/last‑month, single date YYYY‑MM‑DD, or `from:YYYY-MM-DD to:YYYY-MM-DD` ranges; default tz `America/New_York`)
- Search: `search-products` via Algolia public GET with fixed public headers
- Frontend action: `confetti-tool` returns a payload with particleCount, colors, origin, etc.

The agent will render compact Markdown tables from tool output for top lists.

---

## Step 2 — Create the agent

File: `src/mastra/agents/producthunt-agent.ts`

Checklist for the agent:

- Name it clearly (e.g., “Product Hunt Agent”)
- Explain when to use each tool, especially timeframe vs. all‑time
- Keep launch‑advice answers concise and actionable
- Include links when returned by tools; omit when missing
- Be graceful when APIs are missing (empty arrays)

---

## Step 3 — Wire Mastra (optional)

File: `src/mastra/index.ts`

- Register your agent into Mastra if you prefer the Mastra dev server workflow
- This demo uses a custom minimal `src/server.ts` for a simple `/api/*` shape

---

## Step 4 — Run locally

1) Install dependencies
2) Build server TypeScript
3) Start the server
4) Open the static page

Default local API: `http://localhost:8787`

Environment variables:

- `OPENAI_API_KEY` — required for agent chat
- `PRODUCTHUNT_API_TOKEN` — required for live top posts; without it `/api/top*` return empty arrays

---

## Step 5 — Frontend actions handler

File: `web/index.html`

- Registers tool handlers:
  - `confetti-tool` (and `confettiTool`) → loads `canvas-confetti` on demand, or uses a fallback renderer
- CometChat Embed is initialized and launched; when the agent returns a tool call tied to the widget configuration, your handler runs it

Tip: keep the handler resilient — accept both string and object args, set defaults, and no‑op on unknown tools.

---

## Step 6 — API overview

- `GET /api/health` → `{ ok: true }`
- `GET /api/top?limit=3` → top all‑time by votes
- `GET /api/top-week?limit=3&days=7` → rolling week by ranking
- `GET /api/top-range?timeframe=today&tz=America/New_York&limit=3` → timeframe window by ranking
- `GET /api/search?q=term&limit=10` → Algolia search
- `POST /api/chat` with `{ message }` → `{ reply }` from the agent

CORS is open in this demo.

---

## Step 7 — Deploy the API

- Deploy `src/server.ts` (Node 20+) to your hosting (Render, Fly, Vercel functions with Node runtime, etc.)
- Set `OPENAI_API_KEY` and `PRODUCTHUNT_API_TOKEN` in the host environment
- Point the static page to your public API by setting `window.PH_AGENT_API`

---

## Step 8 — Connect in CometChat

- Open the CometChat Dashboard → your App → AI Agents
- Add an agent with Provider=Mastra, Agent ID matching your integration, and the public generate/chat endpoint
- Ensure your frontend (widget or custom UI) maps the `confetti-tool` ID to your handler function

---

## Step 9 — Test

- Hit `/api/health` to confirm server is up
- Try `/api/search?q=notion` to verify Algolia access
- Call `/api/top-range?timeframe=today` with a valid token to get live posts
- POST `/api/chat` with a prompt like “Celebrate our launch with confetti” and verify the frontend fires confetti when wired via CometChat

---

## Security & production checklist

- Keep API tokens server‑side; never expose `OPENAI_API_KEY` or Product Hunt tokens to the client
- Add auth (API key/JWT), restrict CORS, and rate‑limit endpoints
- Validate and clamp user inputs (limits, timeframes)
- Log server errors, not secrets

---

## Troubleshooting

- No posts from `/api/top*`: missing or invalid `PRODUCTHUNT_API_TOKEN`
- Empty `/api/search`: network block to Algolia; verify headers and URL
- Chat has generic replies only: `OPENAI_API_KEY` missing
- Confetti not firing: verify tool ID mapping (`confetti-tool` or `confettiTool`) and that the handler loads `canvas-confetti`

