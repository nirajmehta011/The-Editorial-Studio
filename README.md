# The Editorial Studio

An AI-powered writing workspace for professional content teams: ideation, live research, deep editorial assistance, and multi-channel distribution in a single split-screen surface.

![Stack](https://img.shields.io/badge/Next.js%2015-App%20Router-black) ![DB](https://img.shields.io/badge/PostgreSQL-Prisma-blue) ![Editor](https://img.shields.io/badge/TipTap-ProseMirror-8b5cf6)

## Features

| Feature | Where | What it does |
|---|---|---|
| **Integrated Research Workspace** | Editor → search icon (right rail) | Split-screen search panel (mock corpus by default, Tavily when keyed). Highlight any passage in a result and **Clip & Quote** injects a formatted blockquote plus a numbered footnote hyperlink at the cursor. **AI Auto-Summarizer** yields 5 data-focused bullets per source. **Competitor SERP** sub-tab shows average word count, aggregated H2/H3 outlines, and People-Also-Ask questions. |
| **Discovery & Trends** | `/discovery` | Trend grid by vertical niche with Interest Volume, Growth %, and Competition Density. **Gap Finder** banner flags explosive-growth/low-competition topics. **Write About This** provisions a document, seeds its metadata, and runs an angle worker that generates three structural angles (Beginner's Guide / Contrarian Take / Deep Analytical Breakdown) — click an angle card in the editor to scaffold its outline. |
| **Asset Cascading** | Editor → **Distribute asset** | Reads the full editor state and runs four parallel prompt chains: email newsletter teaser, long-form LinkedIn post, 5-part X thread, and a timestamped short-form video script. Tabbed viewer with copy-to-clipboard. |
| **GEO & Editing Engine** | Editor → gauge icon (right rail) | Live 0–100 **GEO Citability Score** (direct-answer opening, heading/table structure, statistical density, citations) recomputed on every keystroke. **Style Trimmer** decorates passive voice, wordy connectors, redundant adverbs, and run-on sentences inline — click a highlight for a popover with a one-click structural fix. **AI Cadence Scan** measures burstiness + lexical diversity, flags robotic pacing and stock AI phrases, and re-phrases blocks to restore human rhythm. |
| **Brand Brains & Branching** | Navbar dropdowns + selection bubble menu | Multi-tenant workspaces, each with **Brand Brain** profiles (markdown guidelines + tone keywords) that rewrite every LLM system prompt. **Text branching**: select a block → *Branch block* → create Version A/B variants, toggle them in place, or open the side-by-side compare view. The branch tree (parent + child variants) is persisted relationally. |

## Architecture

```
src/
├── app/
│   ├── desk/                     # Draft list
│   ├── discovery/                # Trend intelligence dashboard
│   ├── write/[id]/               # Editor workspace (split-screen)
│   └── api/
│       ├── workspaces/           # GET workspaces + brand brains
│       ├── documents/            # CRUD + [id]/branches
│       ├── branches/[id]/        # Activate / update / delete variants
│       ├── research/             # search (mock/Tavily), summarize
│       ├── trends/               # GET trends, POST write (provision doc + angles)
│       ├── ai/                   # cascade (distribution pack), rephrase
│       └── geo/score/            # Full analysis endpoint (same engines as the live panel)
├── components/
│   ├── Navbar.tsx                # Workspace + Brand Brain selectors (zustand, persisted)
│   └── editor/
│       ├── WriteWorkspace.tsx    # Editor shell: autosave, analysis loop, branching
│       ├── IssueHighlighter.ts   # ProseMirror decoration plugin (issues + branch marks)
│       ├── ResearchPanel.tsx     # Search / clip & quote / summarize / SERP
│       ├── GeoPanel.tsx          # GEO score, style trimmer, cadence scan
│       ├── BranchBar.tsx         # Variant chips + side-by-side compare
│       └── DistributeDrawer.tsx  # Cascade tabs + copy hooks
└── lib/
    ├── geo.ts, readability.ts, cadence.ts   # Pure scoring engines (unit-tested)
    ├── llm.ts                    # Anthropic orchestration (claude-opus-4-8, structured JSON)
    ├── generate.ts               # Feature generators w/ deterministic offline fallbacks
    ├── research.ts, trends.ts    # Mock corpus (seeded PRNG) + trend dataset
    ├── branching.ts              # Pure branch-tree operations
    └── prisma.ts, brand.ts, store.ts, tiptap-text.ts
```

**Data model** (PostgreSQL via Prisma): `User → Workspace → BrandBrain / Document → TextBranch`. Documents store the TipTap node tree and free-form metadata as JSONB; `TextBranch` is a self-relating tree (root = original block, children = Version A/B…) anchored to a top-level block index.

**AI orchestration**: every generator calls Claude (`claude-opus-4-8`) with a strict JSON schema via `output_config.format` when `ANTHROPIC_API_KEY` is set, and falls back to deterministic mocks otherwise — so every workflow is fully demoable offline, and the UI labels mock output. The active Brand Brain's guidelines are injected into each system prompt.

**Analysis engines** run client-side on each edit (debounced) — the same pure functions power the `/api/geo/score` endpoint and the test suite. Readability issues are mapped from block-relative character offsets onto ProseMirror positions by a decoration plugin.

## Running locally

Prereqs: Node 20+, Docker (for PostgreSQL).

```bash
npm install
npm run setup        # docker compose up + prisma migrate + seed
npm run dev          # http://localhost:3000
```

Individual steps: `npm run db:up`, `npm run db:migrate`, `npm run db:seed`, `npm run db:studio`.

Optional environment (`.env`):

```bash
ANTHROPIC_API_KEY=sk-ant-...   # live Claude generation (angles, summaries, cascade, rephrase)
TAVILY_API_KEY=tvly-...        # live web search in the research panel
```

The database runs on host port **5433** (`postgresql://editorial:editorial@localhost:5433/editorial_studio`).

Seeded demo data: one user, two workspaces (Acme Content Studio, Nimbus Agency), three Brand Brains, and one sample draft.

## Testing

```bash
npm test             # vitest — 36 tests across 7 files
```

Covers the GEO scoring engine, readability scanner (offsets, replacements), cadence/burstiness analysis, branch-tree grouping and variant application, the deterministic research corpus + SERP aggregation, offline generators, and API route handlers (search validation, scoring, trend filtering).

A Playwright pass also exercised the full user paths end-to-end (31 checks): desk, discovery filters, write-about-this provisioning, editor analysis + inline fix popover, research search/summarize/SERP, clip & quote insertion, branching (create, variant, compare), and the distribute drawer.

## Notes & trade-offs

- **Auth** is out of scope; the app runs as the seeded demo user. All models are keyed for multi-tenant workspaces, so adding auth means scoping queries by session user.
- The **angle worker** runs inline in the provision request (instant when mocked, a few seconds live). For heavy live traffic, move it to a queue and poll `meta.anglesStatus`.
- The **plagiarism/AI-cadence scan is simulated** as specified — a burstiness/diversity heuristic, not a similarity search against an index.
- Trend data is a static dataset behind `getTrends()`; swap in a live provider without touching the dashboard.
