# The Editorial Studio

An AI-powered writing workspace for professional content teams: ideation, live research, deep editorial assistance, and multi-channel distribution in a single split-screen surface.

![Stack](https://img.shields.io/badge/Next.js%2015-App%20Router-black) ![DB](https://img.shields.io/badge/PostgreSQL-Prisma-blue) ![Editor](https://img.shields.io/badge/TipTap-ProseMirror-8b5cf6)

---

## 🚀 Key Upgrades

### 1. ⚙️ Multi-Provider LLM & Timeout Protection
* **Flexible API Keys**: Configure individual client keys dynamically for **Anthropic, OpenAI, Google Gemini, Groq, and OpenRouter**.
* **Dynamic Model Catalogs**: Fetches live model offerings directly from OpenRouter and Gemini API registries in real-time.
* **Hangs & Timeout Shield**: Implements a secure `fetchWithTimeout` wrapper (10-second ceiling) on all outgoing API calls to prevent slow endpoints from freezing the Next.js server thread.
* **Gemini JSON Schema Compatibility**: Includes a recursive helper that strips `additionalProperties` from strict output definitions, making complex schemas 100% compatible with Gemini without breaking OpenAI constraints.

### 2. 🖼️ Smart Image Engine (Drag-to-Resize + Drop & Paste)
* **Drag-to-Resize Handles**: Clicking any image in the editor spawns a bottom-right resize handle. Drag it to dynamically scale the image container.
* **Bubble Menu Alignments**: Inline floating bubble menu offers instant block alignments: **Align Left**, **Align Center**, and **Align Right** with CSS flow overrides.
* **Desktop Drag & Drop**: Drag image files directly from your computer's finder onto the canvas to insert them instantly as base64-encoded elements.
* **Clipboard Copy & Paste**: Paste screenshots or copied images directly into the document using standard keystrokes (`Cmd + V` / `Ctrl + V`).

### 3. 💡 Live Angles & Custom Focus Customizer
* **Persistent Toggle Control**: Added a header toolbar button next to the GEO indicator that acts as `Show Angles` / `Hide Angles` / `Generate Angles` based on the document state.
* **Tailored Focus Outlines**: A custom input form at the bottom of the card lets you type a specific direction (e.g. *"focus on user-generated content validation"*) to regenerate tailored writing templates.
* **Stop Generation**: Stop active generations instantly during loading states to prevent server-side blockages.
* **Detailed API Error Reporting**: Transparently displays warning alerts showing exact API fail reasons (e.g. `Google AI 400: API key not valid`) instead of silently serving mock templates.

### 4. 🏋️‍♂️ Expanded Ideation Gaps (Fitness & Sports)
* **New Niches**: Added **Fitness** and **Sports** to the Discovery dashboard.
* **Structured Trends**: Seeded with default trends such as *Hyrox training plans* (high growth, low competition), *Rucking efficiency*, *Thermoformed pickleball paddles*, and *F1 ground effect mechanics*. Fully supports live LLM trend generation.

### 5. 📢 Expanded Multi-Channel Distribution
* **Blogger & Medium Integration**: Upgraded the **Distribute Asset** drawer to support direct drafting/publishing pipelines to **Medium** and **Google Blogspot (Blogger)**.

---

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
│       ├── ai/                   # cascade (distribution pack), rephrase, angles (outline generator)
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
    ├── llm.ts                    # Dynamic Multi-Provider API Keys (stripping Schema parameters, timeouts)
    ├── generate.ts               # Feature generators w/ deterministic offline fallbacks
    ├── research.ts, trends.ts    # Mock corpus (seeded PRNG) + trend dataset
    ├── branching.ts              # Pure branch-tree operations
    └── prisma.ts, brand.ts, store.ts, tiptap-text.ts
```

**Data model** (PostgreSQL via Prisma): `User → Workspace → BrandBrain / Document → TextBranch`. Documents store the TipTap node tree and free-form metadata as JSONB; `TextBranch` is a self-relating tree (root = original block, children = Version A/B…) anchored to a top-level block index.

---

## Running locally

Prereqs: Node 20+, Docker (for PostgreSQL).

```bash
npm install
npm run setup        # docker compose up + prisma migrate + seed
npm run dev          # http://localhost:3100
```

Individual steps: `npm run db:up`, `npm run db:migrate`, `npm run db:seed`, `npm run db:studio`.

Optional environment (`.env`):

```bash
ANTHROPIC_API_KEY=sk-ant-...   # live Claude generation (angles, summaries, cascade, rephrase)
TAVILY_API_KEY=tvly-...        # live web search in the research panel
```

The database runs on host port **5433** (`postgresql://editorial:editorial@localhost:5433/editorial_studio`).

Seeded demo data: one user, two workspaces (Acme Content Studio, Nimbus Agency), three Brand Brains, and one sample draft.

---

## Testing

```bash
npm test             # vitest — 36 tests across 7 files
```
