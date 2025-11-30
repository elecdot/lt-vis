Alright, let’s lock down **Phase 7 — Persistence** in the same style as before.

---

## 7. Phase 7 — Persistence: Save/Open Sessions (S-10)

### 7.0 Goals

By the end of Phase 7 you should be able to:

- **Export** the current LT-Vis session (structures + timeline + layout) to a JSON file.
    
- **Import** that JSON back into a fresh app and get:
    
    - the same structures,
        
    - the same timeline,
        
    - the same layout (node positions, pinned flags, zoom/pan).
        
- Have a basic **autosave/draft** mechanism using localStorage.
    

This is S-10 in the requirements: _“snapshot, timeline, layout save/load”_.

---

## 7.1 Persistence Model & Schema

**Goal:** Define a stable JSON schema that can be written/read independently of TS/React classes.

> Prereqs: `Structure` exposes `resetFromSnapshot(snapshot: StateSnapshot)` (added in Phase 1) and all structures implement it before starting this phase.
>
> Schema source of truth: `packages/shared/src/types/project.ts` (or equivalent) defines `ProjectJSON` consumed by persistence ports (`packages/shared/src/ports/persistence.ts`).

### 7.1.1 Project JSON schema (v1)

Create a TypeScript type in `apps/web/src/infra/persistence.ts`:

```ts
export interface ProjectJSON {
  meta: {
    version: "1.0.0";       // bump when schema changes
    createdAt: string;      // ISO date
    savedAt: string;        // ISO date
    title?: string;
    notes?: string;
  };

  // Logical structures (model-level)
  structures: {
    id: string;             // Structure ID, e.g., "LIST", "BST"
    kind: string;           // "SeqList" | "LinkedList" | "Stack" | "BST" | ...
    snapshot: any;          // StateSnapshot JSON from Structure.snapshot()
  }[];

  // Timeline of OpSteps (model-level)
  timeline: {
    id: number;             // TimelineEntry.id
    label?: string;         // "Insert(2@1)" etc.
    opMeta?: any;           // Optional original Operation
    steps: {
      events: any[];        // VizEvent[] (must be JSON-safe)
      explain?: string;
      snapshot?: any;       // snapshot JSON if stored by model
      error?: {
        code?: string;
        message: string;
        detail?: any;
      };
    }[];
  }[];

  // Renderer/layout state
  layout: {
    nodes: {
      [nodeId: string]: {
        x: number;
        y: number;
        pinned?: boolean;
      };
    };
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  };

  // Optional: UI preferences
  ui?: {
    selectedStructureId?: string;
    theme?: "light" | "dark";
  };
}
```

> Key rule: **everything must be plain JSON** — no Maps, Dates, class instances. Convert those at the boundary.

### 7.1.2 Structure hydration contract

- Extend `packages/shared` with a `resetFromSnapshot(snapshot: StateSnapshot)` (or similar) signature and implement it in each `Structure` so import can restore model state without replay when snapshots are present.

- Document snapshot shapes per structure in `packages/model-ts` to keep export/import deterministic and to allow snapshot validation.

### 7.1.2 DTO vs internal types

- Define **DTO layer** for persistence:
    
    - `ProjectJSON` is your persistence contract.
        
    - Internal types: `TimelineState`, `ViewState`, `Structure` etc.
        
- Conversion functions will bridge them:
    
    - `fromSessionAndRenderer → ProjectJSON`
        
    - `fromProjectJSON → Session + Renderer + Timeline`.
        

**Acceptance check for 7.1**

- The whole schema can be printed as a single JSON object and is self-describing.
    
- It’s clear which parts belong to **model** (structures/timeline) vs **view** (layout/viewport) vs **UI** (selected structure).
    

---

## 7.2 Serialization Implementation (exportProject)

**Goal:** Implement functions to **export** the current app state into `ProjectJSON`.

Create `apps/web/src/infra/persistence.ts`:

```ts
import { Session } from "../core/session";
import { Renderer } from "../viz/engine";
import { TimelineState } from "../core/timeline";

export function exportProject(
  session: Session,
  renderer: Renderer,
  metaOverrides?: Partial<ProjectJSON["meta"]>
): ProjectJSON {
  // ...
}
```

### 7.2.1 Serializing structures

- Use the Session API (from Phase 4):
    
    ```ts
    const structs: ProjectJSON["structures"] = [];
    for (const [id, structure] of session.getStructures()) {
      structs.push({
        id,
        kind: structure.kind,
        snapshot: structure.snapshot(), // must be JSON-safe in model layer
      });
    }
    ```
    
- If `snapshot()` currently returns non-JSON types (e.g. Maps), normalize them in model phase or here.
    

### 7.2.2 Serializing timeline

- Get `TimelineState`:
    
    ```ts
    const timelineState = session.getTimeline();
    ```
    
- For each `TimelineEntry`:
    
    ```ts
    const timeline: ProjectJSON["timeline"] = timelineState.entries.map(e => ({
      id: e.id,
      label: e.label,
      opMeta: e.opMeta,              // optional; ensure JSON-safe
      steps: e.steps.map(step => ({
        events: step.events,         // VizEvent[] as plain objects
        explain: step.explain,
        snapshot: step.snapshot,
        error: step.error && {
          code: step.error.code,
          message: step.error.message,
          detail: step.error.detail,
        },
      })),
    }));
    ```
    

### 7.2.3 Serializing layout

Use the `Renderer`’s `ViewState`:

```ts
const view = renderer.getState();
const nodes: ProjectJSON["layout"]["nodes"] = {};

for (const node of view.nodes.values()) {
  nodes[node.id] = {
    x: node.x,
    y: node.y,
    pinned: !!node.pinned,
  };
}

const layout: ProjectJSON["layout"] = {
  nodes,
  viewport: view.meta.viewport ?? undefined, // if you track viewport here
};
```

### 7.2.4 Filling meta

```ts
const nowIso = new Date().toISOString();

const meta: ProjectJSON["meta"] = {
  version: "1.0.0",
  createdAt: metaOverrides?.createdAt ?? nowIso,
  savedAt: nowIso,
  title: metaOverrides?.title ?? "Untitled Project",
  notes: metaOverrides?.notes,
};
```

**Acceptance check for 7.2**

- Calling `exportProject(session, renderer)` at any time returns a valid `ProjectJSON`.
    
- `JSON.stringify(exportProject(...))` works without errors or circular references.
    

---

## 7.3 Deserialization Implementation (importProject)

**Goal:** Implement the inverse: **load** a `ProjectJSON` and reconstruct Session + Renderer state.

Add in `persistence.ts`:

```ts
export interface ImportResult {
  session: Session;
  renderer: Renderer;
  warnings: string[];
}

export function importProject(
  data: ProjectJSON,
  deps: { makeSession: () => Session; renderer: Renderer }
): ImportResult {
  // ...
}
```

### 7.3.1 Validate & normalize JSON

- Use runtime checks (Zod, custom guards, or manual validation):
    
    - Confirm `meta.version` matches or is compatible.
        
    - Confirm required fields (`structures`, `timeline`, `layout.nodes`) are present.
        
    - If something is missing, add to `warnings` and apply defaults.
        

### 7.3.2 Rebuild Session + structures

- Create a fresh `Session` from `deps.makeSession()`.
    
- For each structure entry:
    
    ```ts
    for (const s of data.structures) {
      // add empty structure of appropriate kind
      session.addStructure(s.kind, s.id);
    
      // restore state:
      const struct = session.getStructures().get(s.id)!;
      // Option A: structure has a "hydrate" method (best).
      // Option B: call structure.reset() then re-apply from snapshot via a helper:
      hydrateStructureFromSnapshot(struct, s.snapshot);
    }
    ```
    
    - You may need helper functions in `model-ts` to hydrate from a snapshot, or adjust snapshot() format so you can set it directly.
        

### 7.3.3 Rebuild timeline

- Set `session.timeline = timelineFromJSON(data.timeline)` (via a helper):
    
    ```ts
    function timelineFromJSON(entriesJson: ProjectJSON["timeline"]): TimelineState {
      return {
        entries: entriesJson.map(e => ({
          id: e.id,
          label: e.label,
          opMeta: e.opMeta,
          steps: e.steps.map(s => ({
            events: s.events,
            explain: s.explain,
            snapshot: s.snapshot,
            error: s.error,
          })),
        })),
        currentStepIndex: -1,
        totalSteps: entriesJson.reduce((sum, e) => sum + e.steps.length, 0),
      };
    }
    ```
    
- Don’t apply steps yet; the Playback/Timeline UI will control that.
    

### 7.3.4 Rebuild Renderer view / layout

- Start with an empty Renderer state:
    
    ```ts
    const { renderer } = deps;
    renderer.reset();
    ```
    
- Reapply layout information:
    
    ```ts
    const view = renderer.getState();
    for (const [nodeId, pos] of Object.entries(data.layout.nodes)) {
      // Option A: create nodes immediately based on structure snapshots
      // Option B: rely on applying timeline steps later
    
      // At minimum, store layout in view.meta so layout engine can use it.
      view.meta.layout = view.meta.layout || { nodes: {} };
      view.meta.layout.nodes[nodeId] = pos;
    }
    
    // viewport
    if (data.layout.viewport) {
      view.meta.viewport = data.layout.viewport;
    }
    ```
    
- A pragmatic approach:
    
    - When user **opens** project, prefer hydrating structures via `resetFromSnapshot` and restoring renderer state from the stored snapshots/layout; only replay OpSteps if a snapshot is unexpectedly absent. If any timeline entry is marked non-reversible, disable stepBack before that entry in the UI.
        
    - After import, set the timeline index to the last step and render the final snapshot so the canvas matches the saved state; users can still jump/play from there (persist `currentStepIndex` if you support resuming mid-timeline).
        
    ```ts
    const flatSteps = flattenSteps(session.getTimeline());
    renderer.reset();
    // preferred: hydrate from snapshots; replay flatSteps only as a fallback
    applySteps(renderer.getState(), flatSteps);  // fallback using Phase 3 engine helpers
    ```
        

**Acceptance check for 7.3**

- Exporting a project, then immediately importing it into a fresh app instance yields:
    
    - Same structure snapshots (model).
        
    - Same timeline entries and step counts.
        
    - Same layout (node positions, pinned flags, viewport).
        

---

## 7.4 Autosave & Draft Recovery

**Goal:** Implement a non-intrusive autosave mechanism using `localStorage`.

### 7.4.1 Design

- Use a key like: `ltvis-autosave:<sessionId>`.
    
- Store a **ProjectJSON** snapshot:
    
    ```ts
    const key = `ltvis-autosave:${session.getId()}`;
    localStorage.setItem(key, JSON.stringify(exportProject(session, renderer)));
    ```
    
- Trigger autosave:
    
    - On every operation (`RunOperation`) or timeline change; and/or
        
    - Throttled (e.g. once every 5–10 seconds using a debounced function).
        

### 7.4.2 Recovery on app load

- On app initialization:
    
    - Read `localStorage.getItem(key)` for current session id.
        
    - If present:
        
        - Parse JSON.
            
        - Show a **modal**:
            
            > “A draft session was found from <timestamp>.  
            > Do you want to restore it?”
            
        - If user clicks **Restore**:
            
            - Call `importProject`.
                
        - If user clicks **Discard**:
            
            - Remove the autosave key.
                

**Acceptance check for 7.4**

- Close/reload page mid-session → on next visit, user is offered to restore.
    
- Restored draft behaves like a normal project (timeline and playback work).
    

---

## 7.5 UI Integration: Save/Open Buttons

**Goal:** Wire persistence into the actual UI.

### 7.5.1 File export

- Add “Save project” button in some global toolbar (top-right or in Command Panel):
    
    - `onClick`:
        
        ```ts
        const project = exportProject(session, renderer);
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project.meta.title ?? "ltvis-project"}.ltvis.json`;
        a.click();
        URL.revokeObjectURL(url);
        ```
        
- Use a specific extension (e.g. `.ltvis.json`) to distinguish from arbitrary JSON.
    

### 7.5.2 File import

- Add “Open project” button:
    
    - `onClick`: open `<input type="file" accept=".json,.ltvis.json">`.
        
    - On file select:
        
        ```ts
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const data = JSON.parse(text) as ProjectJSON;
        
        const { session: newSession, renderer: newRenderer, warnings }
          = importProject(data, { makeSession, renderer });
        
        // Replace current services or reinitialize CoreContext.
        ```
        
- Show warnings in a small notification area (e.g. “Some nodes lacked layout; used defaults.”).
    

**Acceptance check for 7.5**

- A user can:
    
    - Save project → download JSON file.
        
    - Reload app → load that file → continue playback and interaction without issues.
        

---

## 7.6 Validation, Versioning & Migrations (future-proofing)

Even for the course project, adding basic versioning now avoids pain later.

### 7.6.1 Runtime validation

- Add a simple schema validator for `ProjectJSON`:
    
    - Using Zod or a hand-written validator:
        
        ```ts
        import { z } from "zod";
        
        export const ProjectJSONSchema = z.object({
          meta: z.object({
            version: z.string(),
            createdAt: z.string(),
            savedAt: z.string(),
            title: z.string().optional(),
            notes: z.string().optional(),
          }),
          structures: z.array(...),
          timeline: z.array(...),
          layout: z.object(...),
          ui: z.object(...).optional(),
        });
        ```
        
- On import:
    
    - Validate JSON first.
        
    - If invalid:
        
        - Show a clear error (“Invalid LT-Vis project file”).
            
        - Reject import gracefully.
            

### 7.6.2 Version field & migration hook

- Use `meta.version` to signal schema:
    
    - `1.0.0` for current version.
        
- Add a migration hook:
    
    ```ts
    function migrateProjectJSON(data: any): ProjectJSON {
      if (!data.meta?.version) {
        // e.g. pre-version files: add defaults, map fields
        // For now, treat as incompatible or attempt best-effort migration.
      }
    
      switch (data.meta.version) {
        case "1.0.0":
          return data as ProjectJSON;
        default:
          // If future version: either downgrade or show warning.
          return data as ProjectJSON;
      }
    }
    ```
    

**Acceptance check for 7.6**

- Importing malformed JSON doesn’t crash the app; shows a friendly error.
    
- Loading a project with unknown `version` yields a warning at minimum.
    

---

## 7.7 Phase 7 Done-ness Checklist

You can call Phase 7 complete when:

-  **Schema**
    
    -  `ProjectJSON` is defined and documented (fields, meaning, version).
        
-  **Export**
    
    -  `exportProject(session, renderer)` returns a valid `ProjectJSON`.
        
    -  `JSON.stringify(exportProject(...))` works without error.
        
-  **Import**
    
    -  `importProject(data, deps)` reconstructs:
        
        -  Structures with correct snapshots.
            
        -  Timeline with correct entries and step counts.
            
        -  Layout (node positions & pinned flags) and viewport.
            
    -  Export → Import round-trip leads to equivalent model state and a sensible canvas.
        
-  **Autosave**
    
    -  Autosave to `localStorage` happens during work.
        
    -  On reload, user is prompted to restore or discard a draft.
        
-  **UI**
    
    -  “Save project” downloads a `.ltvis.json` file.
        
    -  “Open project” can load that file and restore the session.
        
-  **Validation**
    
    -  Basic runtime validation for `ProjectJSON`.
        
    -  Malformed or incompatible files fail gracefully with clear error messages.

**Commands to run**

- `pnpm --filter web test -- persistence`
- `pnpm --filter web test:e2e -- --project=chromium`
