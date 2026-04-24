# OpenFrame — Mainframe Data Modernization

## Original problem statement
> https://github.com/Aditya-Sarna/open_frame build a clean beautiful and modern ui ux for this

User request: Keep the structure of the project as it is in the GitHub repo.

## What was built (MVP — Dec 2025)

Rebuilt the Next.js `open_frame` app 1:1 in the supported stack (React + FastAPI + MongoDB), preserving the 5 sections and API surface, with a distinctive **terminal retro-futurism** aesthetic (obsidian black + emerald, JetBrains Mono + IBM Plex Sans).

### Architecture
- **Backend** (`/app/backend/server.py`): FastAPI, all routes prefixed `/api`
  - `GET  /api/` — health
  - `POST /api/parse-cobol` — Claude parses a COBOL copybook → `{record_name, fields[], total_bytes}`
  - `POST /api/map-schema` — Claude maps parsed fields → `{target, table_name, ddl, mappings[]}` for Postgres/BigQuery/Snowflake
  - `POST /api/pipeline/run` — Deterministic migration simulator with 4 stages (EXTRACT → CONVERT → TRANSFORM → LOAD). Persists to Mongo `runs`.
  - `GET  /api/runs` — lists recent runs (no `_id` leakage)
  - `POST /api/validate-data` — Claude audits sample rows → `{quality_score, issues[], reconciliation{}}`
- **LLM**: Claude Sonnet 4.5 via emergentintegrations + `EMERGENT_LLM_KEY`
- **Frontend** (`/app/frontend/src`): React 19 + Tailwind + shadcn/ui + recharts + sonner
  - Routes: `/`, `/parser`, `/mapper`, `/pipeline`, `/validation`
  - Components: `Layout`, `Sidebar`, `StatusBar`, `SectionHeader`, `Terminal`

### Personas
- **Data / platform engineer** migrating a legacy mainframe to a modern cloud warehouse.
- **Mainframe architect** auditing COBOL copybooks and modeling target schemas.
- **Data-quality auditor** running post-migration reconciliation and anomaly checks.

### Core requirements (static)
1. Preserve the 5-section structure from the GitHub repo.
2. Dark, technical UI avoiding AI-slop tropes (no purple gradients, no Inter headings).
3. Working end-to-end pipeline — parse, map, migrate, validate.
4. All backend routes `/api` prefixed; Mongo via `MONGO_URL`.

### Verified (Dec 2025, iteration 1)
- Backend: 7/7 pytest tests green; all 6 endpoints working; Mongo persistence confirmed.
- Frontend: all 5 pages render, LLM flows return UI-ready results, pipeline streams stage logs, tabs switch.
- Success rate: backend 100%, frontend 100%.

## Backlog / Next tasks

### P1
- [ ] Loading skeleton for Dashboard "Recent Runs" so the empty state doesn't flash before `/api/runs` resolves.
- [ ] Drag-and-drop file upload for `.cpy` copybooks on `/parser`.
- [ ] Deterministic seed for `/api/pipeline/run` using `hashlib` (Python's `hash()` is per-process randomized).

### P2
- [ ] Persist parsed schemas and mappings as first-class documents (currently logged as events); surface them in a "Projects" sidebar section.
- [ ] Input length guard on `/api/parse-cobol` (e.g. 50k char cap).
- [ ] Export mapping DDL as `.sql` file.
- [ ] Diff view showing source bytes vs target bytes after EBCDIC conversion.
- [ ] Split `server.py` into `routers/` + `models/` if it grows further.

### P3
- [ ] Real COBOL tokenization fallback (not LLM) for offline / cost-sensitive use.
- [ ] OAuth / SSO for enterprise deployments.
