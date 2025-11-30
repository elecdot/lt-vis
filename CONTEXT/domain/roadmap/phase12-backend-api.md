Given your spec + monorepo setup:

* `packages/shared` → types and contracts
* `packages/model-ts` → pure data-structure + OpStep/VizEvent logic
* `apps/web` → React UI + renderer that just consumes `OpStep[]` and snapshots

You already have:

* **Logical separation** of UI vs domain model.
* **No hard coupling** to the browser, as long as model-ts stays pure.

That means later you can:

* Add a **Node service** that imports `packages/model-ts` and exposes HTTP endpoints for NL/DSL, cloud save, etc.
* Or use **serverless functions** that speak JSON in exactly the same shapes as your `Operation`, `OpStep`, `VizEvent`, `ProjectJSON`, etc.

No redesign of the core is required — the backend just becomes “another consumer / producer of the same shared types”.

So yes: **stick with the current design now**, don’t split FE/BE for the core simulator. Reuse the persistence/NLP ports and `ProjectJSON` schema defined in Phase 7 (`packages/shared`) as the single source of truth (avoid introducing parallel `ProjectDocument` shapes).

---

## 2. What to be careful about *now* so future backend is easy

There are a few habits that make the later step trivial instead of painful.

### 2.1 Keep `model-ts` truly platform-neutral

Do:

* No `window`, no DOM, no React hooks.
* Just pure TS, data structures, and functions:

  * `applyOperation(op): OpStep[]`
  * `snapshot(): StateSnapshot`
* All domain types live in `packages/shared`.

Result: the **same model code** can run:

* in the browser (current app),
* in a Node backend (future API).

### 2.2 Define clear “service interfaces” inside the frontend

Even though you won’t build the backend now, you can already define **ports** like:

```ts
// packages/shared/src/ports.ts
export interface PersistenceService {
  saveProject(project: ProjectJSON): Promise<void>;
  loadProject(id: string): Promise<ProjectJSON>;
  listProjects(): Promise<ProjectSummary[]>;
}

export interface NlpService {
  nlToDsl(input: string): Promise<DslScript>;
  explainOperationSequence(ops: Operation[]): Promise<string>;
}
```

For v1:

* In `apps/web`, implement these with:

  * `localStorage` / IndexedDB or file download (for Persistence).
  * A simple mock/stub that returns hardcoded examples (for NLP).

Later:

* Replace those with HTTP implementations:

```ts
// apps/web/src/services/httpPersistenceService.ts
export class HttpPersistenceService implements PersistenceService {
  constructor(private baseUrl: string) {}

  async saveProject(project: ProjectJSON) {
    await fetch(`${this.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
  }

  async loadProject(id: string) {
    const res = await fetch(`${this.baseUrl}/projects/${id}`);
    return res.json();
  }

  async listProjects() {
    const res = await fetch(`${this.baseUrl}/projects`);
    return res.json();
  }
}
```

The **UI doesn’t change**, it just gets a different implementation of the same interface.

### 2.3 Stabilize your “wire format” early

Your future HTTP API will basically talk in:

* `OperationRequest` (what the user wants to do)
* `OperationResult` (OpStep[], final Snapshot, maybe error info)
* `ProjectJSON` (timeline + metadata)

If you define these in `packages/shared` and already use them internally, then later the backend just uses **exactly the same types**:

* No mapping hell.
* No “frontend shape vs backend shape” divergence.
* Easier versioning if you ever need `v2` fields.

---

## 3. How NL + cloud save will plug in later

With the above structure:

### NL (natural language → DSL → Operations)

Later, you might create a small Node service:

* Imports `packages/shared` for DSL + Operation types.
* Exposes:

  * `POST /nl/parse` → `{ text: string }` → `{ dsl: string, operations: Operation[] }`

Your frontend:

* Calls `NlpService.nlToDsl`, which internally uses `fetch` to that endpoint.
* Then runs those `Operation[]` locally using your existing model/renderer.

### Cloud save

Later backend service:

* Has endpoints:

  * `GET /projects` → list
  * `GET /projects/:id`
  * `POST /projects`
* Stores `ProjectJSON` in DB / S3 / whatever.

Frontend:

* Switches `PersistenceService` from local-only implementation to HTTP implementation.

Everything else stays the same: the session controller, timeline UI, renderer, etc.

---

## 4. TL;DR for you right now

* ✅ **Yes**, it’s a good idea to stick with the current non-HTTP architecture for the main simulator.
* ✅ If you:

  * keep `model-ts` pure,
  * centralize types in `packages/shared`,
  * define simple service interfaces (Persistence, NLP),

  …then adding a backend/API later will be **a thin, clean extension**, not a rewrite.

If you want, next we can draft:

* A minimal `packages/shared` type file that already includes `ProjectJSON`, `PersistenceService`, and `NlpService` for you to drop into the repo.

---

Here’s a concrete, step-by-step plan you can **actually execute later** when you want an API / backend, without breaking your current design.

I’ll assume:

* Frontend: `apps/web` (React + TS + Vite)
* Shared types: `packages/shared`
* Model: `packages/model-ts` (pure, no I/O)
* Backend (future): Node + TypeScript (Express/Fastify/Hono/etc.)

The idea: **add a backend only for “services” (cloud save, NL/LLM, maybe auth)** while **keeping all data-structure simulation local**.

---

## Phase 0 – Lock in your “core layering” now

You can start this **today**, without any backend:

1. **Ensure model is pure**

   * `packages/model-ts`: no DOM, no fetch, no React, no timers.
   * Only data structures, operations, OpStep[], snapshots.

2. **Centralize domain types**

   * `packages/shared`:

     * `Operation`, `StructureType`, `OpStep`, `VizEvent`, `StateSnapshot`
     * `ProjectJSON`, `ProjectMetadata`, etc.
   * Everything else imports these; no duplicate type definitions.

> If you keep this discipline, the backend later can import exactly the same types and you get type-safe API contracts “for free”.

---

## Phase 1 – Define “service ports” in `packages/shared`

Even before any backend exists, define **interfaces** for the things that *might* become remote:

### 1.1 Persistence port

```ts
// packages/shared/src/ports/persistence.ts
import { ProjectJSON, ProjectSummary } from "../domain/projects";

export interface PersistenceService {
  saveProject(project: ProjectJSON): Promise<void>;
  loadProject(id: string): Promise<ProjectJSON>;
  listProjects(): Promise<ProjectSummary[]>;
  deleteProject?(id: string): Promise<void>;
}
```

### 1.2 NLP / AI port (future)

```ts
// packages/shared/src/ports/nlp.ts
import { Operation } from "../domain/operations";

export interface NlpService {
  nlToOperations(input: string): Promise<Operation[]>;
  summarizeTimeline?(ops: Operation[]): Promise<string>;
}
```

**Execution checklist:**

* [ ] Create `ports/` folder in `packages/shared`.
* [ ] Define `PersistenceService` and `NlpService` (even if Nlp is stub).
* [ ] Refactor frontend so *all* save/load/NL features go through these interfaces.

> Keep these ports the single source of truth; earlier phases (persistence, NL) should depend only on these interfaces, not ad-hoc types.

**Acceptance (for the optional backend phase)**

- Persistence and NL features in earlier phases use `packages/shared` ports only (no duplicate interfaces).
- HTTP adapters (if added) implement the same ports; local adapters remain available for offline use.

---

## Phase 2 – Add **adapters** in the frontend (no network yet)

Implement **local adapters** inside `apps/web` that satisfy these ports, using local storage / file download.

Example: local persistence adapter:

```ts
// apps/web/src/services/localPersistenceService.ts
import {
  PersistenceService,
  ProjectJSON,
  ProjectSummary,
} from "@ltvis/shared";

const STORAGE_KEY = "ltvis.projects";

export class LocalPersistenceService implements PersistenceService {
  async saveProject(project: ProjectJSON): Promise<void> {
    const all = await this.listProjects();
    const others = all.filter(p => p.id !== project.id);
    const updated = [...others, project];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async loadProject(id: string): Promise<ProjectJSON> {
    const all = await this.listProjects();
    const found = all.find(p => p.id === id);
    if (!found) throw new Error("Project not found");
    return found;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const docs: ProjectJSON[] = JSON.parse(raw);
    return docs.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }
}
```

Then define a simple **service locator** or DI-ish helper:

```ts
// apps/web/src/services/index.ts
import { LocalPersistenceService } from "./localPersistenceService";
import type { PersistenceService, NlpService } from "@ltvis/shared";

const persistence: PersistenceService = new LocalPersistenceService();

// stub NLP for now
const nlp: NlpService = {
  async nlToOperations(_input) {
    throw new Error("NLP not enabled");
  },
};

export const Services = {
  persistence,
  nlp,
};
```

**Execution checklist:**

* [ ] Implement `LocalPersistenceService`.
* [ ] Implement a stub `NlpService`.
* [ ] Refactor all React components / viewmodels to call `Services.persistence` / `Services.nlp` instead of direct I/O.

This is the key: once you have this, **switching to HTTP later is just swapping the implementation.**

---

## Phase 3 – Design the HTTP API contract (on paper / in shared types)

Before writing backend code, design your **API shapes** using the types you already have.

### 3.1 Define wire types

In `packages/shared/src/api/contracts.ts`:

```ts
import { ProjectJSON, ProjectSummary } from "../domain/projects";
import { Operation } from "../domain/operations";

export interface ApiSaveProjectRequest {
  project: ProjectJSON;
}

export type ApiSaveProjectResponse = { ok: true };

export interface ApiListProjectsResponse {
  projects: ProjectSummary[];
}

export interface ApiLoadProjectResponse {
  project: ProjectJSON;
}

export interface ApiNlToOperationsRequest {
  text: string;
}

export interface ApiNlToOperationsResponse {
  operations: Operation[];
}
```

### 3.2 Decide endpoints

For example:

* `GET /health`
* `GET /projects`
* `GET /projects/:id`
* `POST /projects` (create/update)
* `POST /nl/operations`

**Execution checklist:**

* [ ] Add `api/contracts.ts` with request/response interfaces.
* [ ] Write a short `API.md` describing endpoints and JSON bodies, referencing those TS types.

---

## Phase 4 – Implement the backend skeleton

Later, when you’re ready to add a backend:

### 4.1 Create a new app

Monorepo:

* `apps/api` (Node + TS)

  * Depends on `@ltvis/shared` for API contracts and domain types.
  * Optionally depends on `@ltvis/model-ts` **only if** you want server-side operations or NL helpers.

Minimal Express example:

```ts
// apps/api/src/server.ts
import express from "express";
import cors from "cors";
import {
  ApiSaveProjectRequest,
  ApiSaveProjectResponse,
  ApiListProjectsResponse,
  ApiLoadProjectResponse,
  ApiNlToOperationsRequest,
  ApiNlToOperationsResponse,
} from "@ltvis/shared/api/contracts";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// In-memory stub DB for first version
const db = new Map<string, any>();

app.get("/projects", (_req, res) => {
  const projects = Array.from(db.values()).map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  const payload: ApiListProjectsResponse = { projects };
  res.json(payload);
});

app.get("/projects/:id", (req, res) => {
  const proj = db.get(req.params.id);
  if (!proj) return res.status(404).json({ error: "Not found" });
  const payload: ApiLoadProjectResponse = { project: proj };
  res.json(payload);
});

app.post("/projects", (req, res) => {
  const body = req.body as ApiSaveProjectRequest;
  const project = body.project;
  db.set(project.id, project);
  const payload: ApiSaveProjectResponse = { ok: true };
  res.json(payload);
});

app.post("/nl/operations", async (req, res) => {
  const body = req.body as ApiNlToOperationsRequest;
  const text = body.text;

  // Stub: later call LLM or some model using text + @ltvis/model-ts
  const operations = []; // Operation[]
  const payload: ApiNlToOperationsResponse = { operations };
  res.json(payload);
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
```

**Execution checklist:**

* [ ] Add `apps/api` with Express/Fastify/Hono.
* [ ] Wire up basic `/health` + `/projects` endpoints.
* [ ] Use `@ltvis/shared/api/contracts` types in handlers.
* [ ] Use in-memory storage at first; later swap for real DB.

---

## Phase 5 – Add HTTP adapters in frontend and switch via config

Now you create **HTTP implementations** of your ports, and choose between local or HTTP via config/env.

### 5.1 HTTP persistence adapter

```ts
// apps/web/src/services/httpPersistenceService.ts
import type {
  PersistenceService,
  ProjectJSON,
  ProjectSummary,
} from "@ltvis/shared";
import {
  ApiSaveProjectRequest,
  ApiSaveProjectResponse,
  ApiListProjectsResponse,
  ApiLoadProjectResponse,
} from "@ltvis/shared/api/contracts";

export class HttpPersistenceService implements PersistenceService {
  constructor(private baseUrl: string) {}

  async saveProject(project: ProjectJSON): Promise<void> {
    const body: ApiSaveProjectRequest = { project };
    const res = await fetch(`${this.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to save project");
    const _data = (await res.json()) as ApiSaveProjectResponse;
  }

  async loadProject(id: string): Promise<ProjectJSON> {
    const res = await fetch(`${this.baseUrl}/projects/${id}`);
    if (!res.ok) throw new Error("Failed to load project");
    const data = (await res.json()) as ApiLoadProjectResponse;
    return data.project;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const res = await fetch(`${this.baseUrl}/projects`);
    if (!res.ok) throw new Error("Failed to list projects");
    const data = (await res.json()) as ApiListProjectsResponse;
    return data.projects;
  }
}
```

### 5.2 Config-based service wiring

```ts
// apps/web/src/services/index.ts
import { LocalPersistenceService } from "./localPersistenceService";
import { HttpPersistenceService } from "./httpPersistenceService";
import type { PersistenceService, NlpService } from "@ltvis/shared";
import { HttpNlpService } from "./httpNlpService"; // later

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL; // or similar

const persistence: PersistenceService =
  apiBaseUrl != null
    ? new HttpPersistenceService(apiBaseUrl)
    : new LocalPersistenceService();

const nlp: NlpService =
  apiBaseUrl != null
    ? new HttpNlpService(apiBaseUrl)
    : {
        async nlToOperations() {
          throw new Error("NLP not enabled");
        },
      };

export const Services = { persistence, nlp };
```

**Execution checklist:**

* [ ] Implement `HttpPersistenceService` and (later) `HttpNlpService`.
* [ ] Add `VITE_API_BASE_URL` env to Vite for dev/prod.
* [ ] Switch service implementation based on existence of `VITE_API_BASE_URL`.

---

## Phase 6 – Add NL/LLM behind the API (optional extension)

Once basic API + cloud save works, you can add **NL features**:

1. In the backend:

   * Add LLM client (OpenAI, local model, whatever).
   * Implement `/nl/operations` by:

     * Taking `text`, context (maybe current structure).
     * Calling LLM.
     * Parsing into `Operation[]` using `@ltvis/shared` types and `@ltvis/model-ts` helpers.
   * Return `operations`.

2. In frontend:

   * Implement `HttpNlpService.nlToOperations` → calls `/nl/operations`.
   * Existing UI uses `Services.nlp` to get `Operation[]` and then runs them locally through your model.

This keeps all heavy visualization still in the browser, backend only does “language + persistence”.

---

## Final condensed checklist (what you actually do over time)

**Now / during course project:**

* [ ] Keep model pure and shared.
* [ ] Move domain + project types into `packages/shared`.
* [ ] Introduce `PersistenceService` + `NlpService` ports.
* [ ] Implement `LocalPersistenceService` and stub `NlpService`.
* [ ] Route all UI calls through `Services.persistence` / `Services.nlp`.

**Later / after project, when you want real API:**

* [ ] Design API contracts in `packages/shared/api/contracts.ts`.
* [ ] Add `apps/api` Node TS project using those contracts.
* [ ] Implement `/projects` endpoints with in-memory (then DB) storage.
* [ ] Implement `/nl/operations` stub (then wire to LLM).
* [ ] Implement `HttpPersistenceService` and `HttpNlpService`.
* [ ] Use `VITE_API_BASE_URL` to switch between local and HTTP adapters.
* [ ] Add tests for both local and HTTP service implementations.

If you want, next step we can zoom into **how to structure `ProjectJSON`** and version it so your API is stable even when you add new fields to the timeline.
