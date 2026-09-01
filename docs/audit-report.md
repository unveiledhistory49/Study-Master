# StudyMaster Deep Audit Report

**Date:** 2026-08-21  
**Scope:** Full project audit (frontend, backend, database, AI integration, wiring, security)  
**Constraint:** `npm install` was verified **NOT** re-run. All checks use existing `node_modules` as-is + `venv` via `PYTHONPATH=/root/venv:/usr/local/lib/python3.13/dist-packages`.  
**Method:** Hands-on verification per `AGENTS.md` §3/§4 — *“It actually runs, end-to-end, invoked the way it will really be invoked”* + adversarial inputs, not code-reading.

---

## 1. Executive Summary

| Area | Verdict |
|------|---------|
| **Backend core CRUD + auth (sqlite)** | **~60% real** — works on sqlite override, fails on production `DATABASE_URL` |
| **AI Tutor (chat / generate-material)** | **Facade** — returns HTTP 200 with `"API Error: 404 page not found"` when NVIDIA upstream fails |
| **Frontend UI (React/Next.js)** | **~40% real** — code coherent, but **not buildable** (`next build` → `sh: next not found`, `tsc` 16 errors, `eslint` parser crash) |
| **Production wiring (Postgres, Vercel, env)** | **Not done** — placeholder DB URL, missing deps, no `NEXT_PUBLIC_API_URL` |
| **Spec §9-10 (Spaced repetition, Exam simulator, OCR, Mastery engine)** | **Not implemented** |

**Single-line verdict:** End-to-end `npm run build` + `uvicorn` with production `DATABASE_URL` **does not succeed today**. Requires env + install fixes.

---

## 2. What Was Actually Exercised (with commands)

### 2.1 Frontend — `frontend/`

**File inventory:**
```
frontend/src/app/page.tsx (dashboard)
frontend/src/app/login/page.tsx
frontend/src/app/subjects/[id]/page.tsx
frontend/src/app/topics/[id]/page.tsx
frontend/src/app/concepts/[id]/page.tsx
frontend/src/app/chat/page.tsx (365 lines, streaming, quiz streak)
frontend/src/components/ChatMessage.tsx, InlineQuiz.tsx, etc.
frontend/src/lib/api.ts  # API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || http://localhost:8000/api
```

**Checks run:**

```bash
ls frontend/node_modules → 385 dirs, next/dist exists
ls frontend/node_modules/.bin → NOT FOUND
npm ls → "invalid: next@ 15.5.19" + 14 extraneous (sharp, styled-jsx, @swc/helpers …)
npx next --version → 16.3.1  # mismatch with package.json 15.5.19
node node_modules/next/dist/bin/next --version → Cannot find module '../server/require-hook'
node node_modules/typescript/bin/tsc --noEmit --skipLibCheck → 16 errors
# frontend/next.config.ts(1,33): error TS2307: Cannot find module 'next'
# every next/link, next/navigation, next/font/google → TS7016 implicit any
node node_modules/eslint/bin/eslint.js --config eslint.config.mjs src
# → Failed to load parser eslint-config-next ./parser.js: Cannot find module 'next/dist/compiled/babel-packages'
npm run build → sh: 1: next: not found
```

**Result per AGENTS §3:**
- ❌ Does NOT actually run end-to-end
- ❌ Not wired (no `.env`, no `NEXT_PUBLIC_API_URL`)
- ❌ Not tested against failure case (build never completes)

### 2.2 Backend — `backend/`

**Stack:** FastAPI 0.115.0, SQLAlchemy 2.0.35, `python-jose`, `passlib[bcrypt]`, `openai>=1.0.0`, `pydantic-settings`

**Default config (`app/config.py` + `backend/.env`):**
```ini
SECRET_KEY=studymaster-jwt-secret-key-2026-very-secure
DATABASE_URL=postgresql+asyncpg://postgres.your-project-ref:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres  # placeholder
NVIDIA_API_KEY=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
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions  # with suffix
NVIDIA_MODEL=deepseek-ai/deepseek-r1  # vs config default openai/gpt-oss-120b vs test_standalone deepseek-v4-flash
```

**Import test (unforced):**
```bash
from app.database import engine → ModuleNotFoundError: No module named 'asyncpg'
from app.services.ai_service import ai_service → ModuleNotFoundError: No module named 'openai' (venv)
# Mixing system pip (pydantic 2.13.4) + venv (2.9.2) → SystemError: pydantic-core 2.23.4 incompatible
```

**Forced working path (used for all API checks):**
```bash
PYTHONPATH=/root/venv/lib/python3.13/site-packages:/root/study-master/backend:/usr/local/lib/python3.13/dist-packages \
DATABASE_URL=sqlite+aiosqlite:////root/study-master/studymaster.db \
/root/venv/bin/python
```

**DB verification:**
```bash
PYTHONPATH=… DATABASE_URL=sqlite… python -m app.seed
# 🌱 Created 2 users: Charlie, blessing
# ✅ 3 subjects: Biology, Chemistry, Physics
# ✅ 33 topics, 127 concepts
# ✅ 6 student profiles
ls -lh /root/study-master/studymaster.db → 76K  # created at project root, NOT backend/studymaster.db
# Relative ./studymaster.db resolves to cwd → two possible DB files depending on launch dir
```

**API integration test via `httpx.AsyncClient(ASGITransport(app))`:**

| Test | Input | Expected | Actual | Pass |
|------|-------|----------|--------|------|
| `POST /api/auth/login` | Charlie/123 | 200 + token | 200 `access_token, token_type` | ✅ |
| Case-insensitive | charlie/123 | 200 | 200 | ✅ |
| Wrong password | Charlie/wrong | 401 | 401 | ✅ |
| `GET /api/auth/me` | Bearer token | 200 user | 200 `id:1 Charlie` | ✅ |
| `GET /api/subjects` no auth | — | 401 | 401 | ✅ |
| `GET /api/subjects` with auth | — | 200 3 subjects | 200 3 `Biology/Chemistry/Physics` + `topic_count,mastery_score` | ✅ |
| `GET /api/concepts/4` | The Cell | 200 with content+quiz | 200 `content: # Cell Structure…` + 3 Q quiz_data | ✅ |
| `GET /api/concepts/99999` | — | 404 | 404 | ✅ |
| `GET /api/topics/1` | Foundations Biology | 200 6 concepts | 200 6 | ✅ |
| `GET /api/profile` | — | 200 6 profiles | 200 `mastery_score 0.0, total_concepts 55` | ✅ |
| `POST /api/profile/mastery/4 {passed:true}` | — | increment | `concepts_mastered 0→1, mastery 1.81%` | ✅ |
| `POST /api/profile/mastery/4 {passed:false}` | — | no increment | still 1 | ✅ |
| `GET /health` `/` | — | 200 | 200 `{status: healthy}` | ✅ |
| `POST /api/ai/chat {Hello}` | — | 200 but upstream error | **200** `{"user_message":{…},"assistant_message":{"content":"API Error: 404 page not found"}}` | ❌ Facade |
| `POST /api/ai/chat/stream` | — | SSE | **200** `data: {"error":"404 page not found"}` but HTTP 200 | ❌ Facade |

**Log excerpt:**
```
INFO:httpx HTTP Request: POST https://integrate.api.nvidia.com/v1/chat/completions "HTTP/1.1 404 Not Found"
ERROR:app.services.ai_service:AI service error: 404 page not found
```

**Root cause:** `ai_service.py:45` does `settings.NVIDIA_API_URL.replace("/chat/completions","")` so URL is correct, but model `deepseek-ai/deepseek-r1` does not exist / key invalid → 404. Three-way model drift: `.env: deepseek-r1` vs `config.py: gpt-oss-120b` vs `test_standalone.py: deepseek-v4-flash`.

Per AGENTS §6 *“Success signals are conditioned on the real thing”* — chat returns success JSON on `API Error` path. Meets *Red Flag* definition.

### 2.3 Frontend ↔ Backend Wiring

- `frontend/src/lib/api.ts`:
  ```ts
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  fetchWithAuth(`${API_BASE_URL}${endpoint}`) // 120s timeout for Render cold start
  chatStream fetch(`${API_BASE_URL}/ai/chat/stream`)
  ```
  No `frontend/.env` / `.env.local` → defaults to `localhost:8000`. Login page already warns:
  > `(Make sure NEXT_PUBLIC_API_URL is set in Vercel to your Render backend URL!)`
- Backend CORS (`main.py`):
  ```py
  CORSMiddleware(allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
  ```
  `config.py:CORS_ORIGINS=["*"]` is **declared but never used** (dead dependency, §6 flag).
- Token handling: `lib/auth.ts` stores JWT in `localStorage`, `ProtectedRoute` verifies via `api.getMe()`; `Navbar` hides on `/login`.

### 2.4 Other Modules

- `materials/convert.py`: `workspace="/sdcard/Download/study-master"` hardcoded → fails on Linux/CI.
- `parse_biology.py`: `directory="/sdcard/Download/study-master/materials/markdown"` + naive `re.split(r'TOPIC:\s*')` → adversarial run on this host → `FileNotFoundError`.
- `database/` folder empty; `docs/project_spec.md` describes 12 core modules (Knowledge Graph, Mastery Engine, Mistake Analyzer, Spaced Repetition, Exam Simulator) — no code beyond Subjects/Topics/Concepts/Profile/Chat.
- `.agents/skills` — deleted per user request `2026-08-21T01:04Z`; `git status` shows 1,265 `D` deletions; symlinks `/.pi/agent/skills/frontend-design → …/.agents/skills/frontend-design` now broken (expected per request).

---

## 3. Architecture & Scope Gaps (vs `project_spec.md`)

| Spec Requirement | Status |
|------------------|--------|
| Auth (2 users, no public registration) | Done (hardcoded `Charlie`/`blessing`, JWT) |
| Subject/Topic/Concept hierarchy + 127 seeded concepts | Done (sqlite) |
| Knowledge Graph with Prerequisites | Partial: `ConceptPrerequisite` association table exists, but seed leaves `prerequisites=[]` for all 127; `GET /concepts/{id}` returns `prerequisites` but always empty |
| Lesson Engine (`content` markdown, `generate-material` via AI) | `content` seeded for 1 concept (The Cell), `generate_concept_material` prompt exists (3,000-token NERDC/WAEC-bounded prompt), but live generation untested (404) |
| Practice Engine / Quiz | `InlineQuiz.tsx` + `quiz_data` JSON works, but `mastery` is naive increment (`if concepts_mastered < total_concepts: +1`) with no *already-mastered* check, no retention/forgetting |
| Socratic Tutor, Mistake Analyzer, Mastery Engine | System prompts contain quiz JSON contract, but no `Mistake` entity, no spaced repetition scheduler |
| Exam Simulator, Spaced Repetition, Progress Dashboard, Analytics | `dashboard` shows 4 `StatCard`s (`mastery%`, `time`, `streak`, `concepts_mastered`) — no predicted UTME score, no retention % |
| PDF/OCR pipeline | `materials/convert.py` uses `MarkItDown` locally, not wired to upload API |

---

## 4. Security Findings

| Finding | Evidence | Severity |
|---------|----------|----------|
| Weak `SECRET_KEY` in `backend/.env` | `studymaster-jwt-secret-key-2026-very-secure` (low entropy, committed-adjacent) | Medium |
| Real `NVIDIA_API_KEY` on disk | `nvapi-5jWMxO0Su7Rf…` in `backend/.env` (ignored by `.gitignore` but present, no rotation hint) | High if repo public |
| `DATABASE_URL` placeholder with fake password | `postgres.your-project-ref:[YOUR-PASSWORD]@aws-0…` — will crash production without override | High (startup crash) |
| CORS `*` | Intended for dev per spec, acceptable for 2-user MVP | Low |

---

## 5. What Is Done vs. Not Done (AGENTS §7 honest report)

**Implemented AND independently verified (ran + asserted):**
- DB schema, `init_db()` idempotency (`Base.metadata.create_all`), WAL pragma, sqlite fallback via `DATABASE_URL` override
- Seed idempotency (`if subject_count>0 skip`) → 127 concepts verified via `select(func.count(Concept.id))`
- Auth register/login/JWT/decode/case-insensitive lookup — verified 401/200 including adversarial wrong password + missing token
- `GET /api/subjects` (single aggregated query with `func.count(distinct Topic.id)` + `coalesce(mastery_score)`) — verified
- `GET /api/subjects/{id}` with `outerjoin Concept` aggregation
- `GET /api/topics/{id}` + `GET /api/concepts/{id}` with `selectinload(prerequisites, topic.subject)`
- `GET /api/profile` + `POST /api/profile/mastery/{id}` — verified increment + cap at `total_concepts`
- `GET /health`, `GET /`
- Chat persistence (creates `Conversation` on first message, saves both `user`/`assistant` rows) — verified `conversations` count increments

**Implemented BUT NOT yet verified (or degraded):**
- AI chat + `generate_concept_material` — code exists, prompt is thorough, but **no successful network call observed** (404). Verified *failure* path returns 200 facade, not `5xx`. Streaming saves assistant message after done via `async_session()` — logic read, not load-tested.
- Frontend route guards, `api.chatStream` SSE parsing (`data: ` + `JSON.parse`), `ChatMessage` katex `processContent` (handles `\(`, `\[` → `$`), `InlineQuiz` 60s-per-question timer + streak `quizPassStreak` (needs 3 consecutive ≥70% to master) — code-read, **no browser E2E**.
- ESLint `next/core-web-vitals` + `typescript` typing — config exists but toolchain broken.

**Not implemented:**
- Postgres production DB (missing `asyncpg` in `venv`, placeholder URL)
- Frontend production build + `postcss`/`tailwindcss 4` verification (`.bin` missing → no `next build`)
- OCR → text → chunk → knowledge graph pipeline (only local `convert.py`)
- Mastery retention / spaced repetition / exam simulator / mistake classification

**Blocked on (non-negotiable per AGENTS §2):**
1. `asyncpg` + `openai` missing from `venv` (`requirements.txt` lists `asyncpg==0.30.0`, `openai>=1.0.0` but `pip list` in `venv` shows neither) — needs `pip install -r backend/requirements.txt` or fix `venv` recreation.
2. `DATABASE_URL` must be overridden to real Supabase/Render URL or forced to `sqlite+aiosqlite:////root/study-master/studymaster.db` for local dev.
3. `NVIDIA_API_KEY` valid + model alignment (`deepseek-r1` not found; `test_nvidia.py` uses `deepseek-v4-flash` with `extra_body thinking:true` not in service).
4. `NEXT_PUBLIC_API_URL` must be set in Vercel to backend URL.
5. `frontend/node_modules/.bin` recreation — requires `npm install` (forbidden by audit instruction; note: install was previously run but produced invalid/broken linking — suggests `npm install` completed with `fetch-retries=5` but ignored `bin-links` or `next` version conflict).
6. Manual step outside code: valid `NVIDIA_API_KEY` issuance + Supabase project creation — cannot be done by agent.

---

## 6. Red Flags Hit (AGENTS §6 checklist)

- ✅ **Success on failure path:** `chat` returns `200` + `"API Error: 404 page not found"` instead of `5xx`.
- ✅ **Declared dependency not actually used:** `config.CORS_ORIGINS` + `CORS_ORIGINS` never read; `next` declared but `dist/compiled/babel-packages` missing.
- ✅ **Hardcoded placeholder:** `DATABASE_URL` with `[YOUR-PASSWORD]` presented as runnable `.env`.
- ❌ Not hit: Self-issued 100% verified report, warning-instead-of-failure, fallback-silencing, doc-edited-to-match-bug.

---

## 7. Recommendations (in dependency order)

1. **Fix venv** — `python -m venv --clear backend/venv && backend/venv/bin/pip install -r backend/requirements.txt` (adds `asyncpg`, `openai`, aligns `pydantic 2.9.2` + `pydantic-core 2.23.4`).
2. **Fix `DATABASE_URL`** — set `backend/.env` to `sqlite+aiosqlite:////root/study-master/studymaster.db` for dev, or real Supabase `postgresql+asyncpg://…@pooler…:6543/postgres` for prod; document fallback in `README`.
3. **Fix `NVIDIA_MODEL` + endpoint** — align `.env`, `config.py`, `ai_service.py`, `test_standalone.py` to single model (`deepseek-ai/deepseek-r1` → `deepseek-ai/deepseek-v3` or `openai/gpt-oss-120b` per spec); verify with `PYTHONPATH=… python test_standalone.py` → should print `SUCCESS!` not `404`.
4. **Fail loudly on AI error** — make `chat`/`chat/stream` return `502` when `ai_service` yields error, not `API Error: …` in 200 body; add retry for 404 vs 429.
5. **Repair frontend install** — `rm -rf frontend/node_modules && npm install` (using `npm@10.9.8`, `node v22.23.2`, `bin-links=true`) then `npx tsc --noEmit` should be 0 errors and `npx next build` should succeed; add `frontend/.env.local` with `NEXT_PUBLIC_API_URL`.
6. **Remove `/sdcard` hardcodes** — make `convert.py` / `parse_biology.py` accept `WORKSPACE` env var.
7. **Rotate secrets** — regenerate `SECRET_KEY=$(openssl rand -hex 32)` and `NVIDIA_API_KEY` if repo ever pushed public.
8. **Add wiring test** — `pytest` that boots `TestClient(app)` with `DATABASE_URL=sqlite…` and asserts every router is included (prevents *“correct script that nothing calls”*).

---

## 8. How This Audit Was Verified (for reproducibility)

```bash
# Frontend
node /root/study-master/frontend/node_modules/typescript/bin/tsc --noEmit --project /root/study-master/frontend/tsconfig.json
node /root/study-master/frontend/node_modules/eslint/bin/eslint.js --config /root/study-master/frontend/eslint.config.mjs /root/study-master/frontend/src

# Backend (repeatable after fixing venv)
PYTHONPATH=/root/venv/lib/python3.13/site-packages:/root/study-master/backend:/usr/local/lib/python3.13/dist-packages \
DATABASE_URL=sqlite+aiosqlite:////root/study-master/studymaster.db \
/root/venv/bin/python -c "from httpx import AsyncClient, ASGITransport; from main import app; … POST /api/auth/login, GET /api/subjects, …"

# DB counts
sqlite3 /root/study-master/studymaster.db "SELECT count(*) FROM concepts; SELECT count(*) FROM topics; SELECT name FROM subjects;"
```

Outputs attached in this report’s table of checks above; no *“I re-audited and confirmed”* without concrete `status_code` shown.

---

*“A working system that is 30% finished and honestly labeled as such is a correct output.” (AGENTS.md Prime Directive) — This audit labels StudyMaster as **~50% finished, verified on sqlite + auth, degraded on AI + frontend build**.*
