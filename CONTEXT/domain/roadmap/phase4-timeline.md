Gotcha. Quick recap first, then we zoom into Phase 4.

---

## 0. Where we are now (very briefly)

- **Phase 1 – Shared contracts**
    
    - Core types in `packages/shared`: `Structure`, `Operation`, `OpStep`, `VizEvent`, `StateSnapshot`.
        
    - Contracts are stable enough that Model and Renderer don’t depend on each other.
        
- **Phase 2 – Model**
    
    - `packages/model-ts` implements:
        
        - Linear structures: `SeqList`, `LinkedList`, `Stack`.
            
        - Tree structures: `BinaryTree`, `BST`, `Huffman` (with `BuildHuffman`).
            
    - Each `Structure.apply(op)` returns `Iterable<OpStep>` with meaningful `VizEvent[]`, `explain?`, `snapshot?`, or `error?`.
        
    - REQUEST examples (linked-list insert, BST delete, Huffman build) are covered by tests.
        
- **Phase 3 – Renderer & Layout**
    
    - `apps/web/src/viz/*`:
        
        - Idempotent `applyEvent`/`applyStep`/`applySteps` on `ViewState`.
            
        - Layout helpers: `layoutLinear`, `layoutTree`.
            
        - React Flow adapter maps `ViewState` → `nodes[]`/`edges[]`.
            
        - Simple `RendererImpl.play(steps, { onStepApplied })` for timed animation.
            
    - Renderer is independent of model and UI; uses only shared types.
        

Now Phase 4 connects these with a **Session + timeline + command path** so the system behaves like the sequence diagram in DESIGN.

---

## 4. Phase 4 — Timeline, Session, and Command Path (Detailed Roadmap)

### 4.0 Goals

By the end of Phase 4, we want:

- A **Session** abstraction that owns:
    
    - A set of `Structure` instances.
        
    - A canonical **timeline** of `OpStep` blocks.
        
    - The bridge from `Operation` → `OpStep[]`.
        
- A **Timeline model + controller** that supports:
    
    - Play, pause, step forward, step back, jump, set speed.
        
- A **Command path (VM)** that maps UI intents to `Operation` objects and Session calls.
    
- Ability to run the whole pipeline **headless** (no React) for tests and CLI.
    

This corresponds mainly to:

- REQUEST: playback and step control (M-07, M-09).
    
- DESIGN: sequence `UI → VM → Session → Model → Renderer`.
    

---

## 4.1 Design snapshot & module boundaries

**Files / modules (suggested):**

```text
apps/web/src/
  core/
    session.ts          // Session + model orchestration
    timeline.ts         // Timeline state + pure functions
    playback.ts         // Playback controller, uses Renderer + Timeline
    commands.ts         // Command API (VM) used by UI
  viz/
    engine.ts           // (Phase 3) Renderer core
    layout.ts           // (Phase 3) Layout
```

**Layering:**

- `packages/model-ts`: pure model, no knowledge of UI.
    
- `apps/web/src/viz/*`: pure rendering/layout, no knowledge of commands/timeline.
    
- `apps/web/src/core/*`: **glue** between Model and Renderer; this is Phase 4’s main target.
    

---

## 4.2 Step 1 — Timeline Data Model (pure, framework-free)

**Goal:** Define a reusable, testable timeline representation and operations on it.

**Work items**

1. **Timeline data structures** (`core/timeline.ts`):
    
    ```ts
    import { OpStep } from "@ltvis/shared";
    
    export interface TimelineEntry {
      id: number;          // monotonically increasing
      steps: OpStep[];     // steps from a single Operation.apply()
      label?: string;      // e.g. "Insert(2 at 1)"
      opMeta?: any;        // Operation payload if useful
    }
    
    export interface TimelineState {
      entries: TimelineEntry[];
      // Global linear index into "flattened" steps
      currentStepIndex: number; // -1 = before first
      totalSteps: number;
    }
    ```
    
2. **Helpers to manage entries**
    
    ```ts
    export function createEmptyTimeline(): TimelineState { ... }
    
    export function appendEntry(
      state: TimelineState,
      entry: TimelineEntry
    ): TimelineState { ... }
    
    export function flattenSteps(state: TimelineState): OpStep[] { ... }
    ```
    
    - `appendEntry`:
        
        - Computes `entry.id` = `state.entries.length`.
            
        - Updates `totalSteps` = sum of all `steps.length`.
            
3. **Step navigation helpers**
    
    ```ts
    export function canStepForward(state: TimelineState): boolean { ... }
    export function canStepBack(state: TimelineState): boolean { ... }
    
    export function stepForward(state: TimelineState): TimelineState { ... }
    export function stepBack(state: TimelineState): TimelineState { ... }
    
    export function jumpTo(state: TimelineState, index: number): TimelineState { ... }
    ```
    
    - These are purely about indices, not about applying events.
        
    - They ensure `currentStepIndex` stays in `[-1, totalSteps - 1]`.
        

**Acceptance checks**

- `TimelineState` and helpers are **pure functions**.
    
- Unit tests:
    
    - Append multiple entries and verify `totalSteps` and flatten order.
        
    - `stepForward`/`stepBack` update `currentStepIndex` correctly (no overshoot).
        

---

## 4.3 Step 2 — Session Core (headless model orchestrator)

**Goal:** Implement a `Session` that owns structures and a timeline, and emits OpSteps when operations run.

**Work items**

1. **Session interface and implementation** (`core/session.ts`):
    
    ```ts
    import { Structure, Operation, OpStep, StateSnapshot } from "@ltvis/shared";
    import { createStructure } from "@ltvis/model-ts";
    import { TimelineState, createEmptyTimeline, appendEntry } from "./timeline";
    
    export interface SessionConfig {
      id: string;
      // optional: seeding initial structures
    }
    
    export interface Session {
      getId(): string;
    
      getStructures(): ReadonlyMap<string, Structure>;
      getTimeline(): TimelineState;
      getSnapshot(structureId: string): StateSnapshot | undefined;
    
      addStructure(kind: string, id: string, payload?: unknown): void;
      resetStructure(id: string): void;
    
      executeOperation(op: Operation): OpStep[];  // core path
      resetTimeline(): void;
    }
    
    export class SessionImpl implements Session {
      private readonly id: string;
      private structures = new Map<string, Structure>();
      private timeline: TimelineState = createEmptyTimeline();
    
      constructor(config: SessionConfig) {
        this.id = config.id;
      }
    
      // .. implement methods ..
    }
    ```
    
2. **Key behaviors**

    - `addStructure(kind, id, payload?)`:
        
        - Uses `createStructure` from model package.
            
        - If id already exists, maybe reset or throw (decide per DESIGN; probably throw to surface misuse).
            
    - `executeOperation(op)`:
        
        - If `op.kind === "Create"`: call `addStructure(op.structure, op.id, op.payload)` and record a timeline entry for the creation (an OpStep with a snapshot of the new structure; throw on duplicate ids rather than silently no-op).
        
        - Lookup `Structure` by `op.target` (or similar identifier).
            
        - If missing, return a single error `OpStep`.
            
        - Otherwise:
            
            ```ts
            const steps = Array.from(structure.apply(op));
            const missingSnapshot = steps.some(s => !s.snapshot);
            if (missingSnapshot) {
              // Prefer model-provided snapshots; if missing, attach final snapshot to the last step and mark entry as non-reversible for stepBack prior to that point.
              const last = steps[steps.length - 1];
              steps[steps.length - 1] = { ...last, snapshot: last.snapshot ?? structure.snapshot() };
              // optional: flag downstream playback/UI to disable stepBack before this entry
            }
            
            const label = /* create concise label from op, e.g. "Insert(2@1)" */;
            this.timeline = appendEntry(this.timeline, { id: 0 /* overwritten */, steps, label, opMeta: { ...op, nonReversible: missingSnapshot } });
            return steps;
            ```
            
    - `getSnapshot(structureId)`:
        
        - Returns `structures.get(structureId)?.snapshot()`.
            
    - `resetTimeline`:
        
        - Clears timeline; structures not reset (that’s `resetStructure`).
            
3. **Tests**
    
    - Headless tests:
        
        - Create a `SessionImpl` with one `LinkedList` structure.
            
        - Run `executeOperation` for the linked list insert example.
            
            - Assert:
                
                - `structures` final snapshot matches expected.
                    
                - `timeline.entries.length === 1`.
                    
                - `timeline.totalSteps === steps.length`.
                    
        - Multiple operations:
            
            - Two inserts; ensure timeline has 2 entries and flatten matches concatenated steps.
                

**Acceptance checks**

- `Session` is React-free; uses only `@ltvis/shared` + `@ltvis/model-ts` + `core/timeline`.
    
- M-09: you can load a `Session`, run operations, and obtain `OpStep[]` timeline + snapshots **without** Renderer/UI.
    

---

## 4.4 Step 3 — Playback Controller (Timeline ↔ Renderer bridge)

**Goal:** Implement a controller that walks the timeline, applies steps to the Renderer, and handles play/pause/step/back/jump/speed.

**Work items**

1. **Playback state model** (`core/playback.ts`):
    
    ```ts
    import { TimelineState } from "./timeline";
    
    export type PlaybackStatus = "idle" | "playing" | "paused";
    
    export interface PlaybackState {
      status: PlaybackStatus;
      speed: number; // multiplier, 0.5x, 1x, 2x...
      // lastAppliedIndex mirrors TimelineState.currentStepIndex
    }
    ```
    
2. **Playback controller interface**
    
    ```ts
    import { Renderer } from "../viz/engine";
    import { Session } from "./session";
    import { TimelineState } from "./timeline";
    
    export interface PlaybackController {
      getPlaybackState(): PlaybackState;
      play(): Promise<void>;
      pause(): void;
      stepForward(): void;
      stepBack(): void;
      jumpTo(index: number): void;
      setSpeed(multiplier: number): void;
    }
    
    export interface PlaybackDeps {
      session: Session;
      renderer: Renderer;
      getTimeline: () => TimelineState;
      setTimeline: (t: TimelineState) => void;
    }
    ```
    
3. **Implementation sketch**
    
    - `PlaybackControllerImpl`:
        
        - Holds `PlaybackState`, plus references to `session`, `renderer`, and timeline getter/setter.
            
        - `play()`:
            
            - If `status === "playing"`, no-op.
                
            - Set `status = "playing"`.
                
            - Loop:
                
                ```ts
                while (status === "playing" && canStepForward(timeline)) {
                  const nextIndex = timeline.currentStepIndex + 1;
                  const step = flattenedSteps[nextIndex];
                  // Prefer a Renderer.applyStep(step, idx) method if exposed; otherwise call the Phase 3 helper directly.
                  renderer.applyStep?.(step, nextIndex) ?? applyStep(renderer.getState(), step, nextIndex);
                  // Update timeline via stepForward(timeline).
                  await sleep(baseDelay / speed);
                }
                status = "idle"; // or "paused" if user paused
                ```
                
            - Use a cancellable mechanism (e.g. check `status` in the loop) so `pause()` can interrupt.
                
        - `pause()`:
            
            - Set `status = "paused"`.
                
        - `stepForward()`:
            
            - If !`canStepForward`, no-op.
                
            - `stepForward(timeline)` to update index.
                
            - Get the corresponding `OpStep` and apply to Renderer via its API (e.g., `renderer.applyStep` or `applyStep(renderer.getState(), ...)` as a fallback).
                
        - `stepBack()`:
            
            - Strategy (snapshot-first per REQUEST/DESIGN):
                
                - If the `OpStep` at target index has a snapshot, restore from that snapshot directly (preferred).
                    
                - If a snapshot is missing, mark that step as non-reversible in UI; fallback is replay-from-zero up to the prior reversible step using `applySteps`.
                        
            - For n ≤ ~200 steps (typical classroom demos), replay fallback is acceptable but must be documented.
                        
    - Document the tradeoff: if performance later becomes an issue, we can optimize by using OpStep snapshots or inverse events.
        
4. **Tests**
    
    - Use fake timers (Vitest):
        
        - `play()` with 3 steps:
            
            - After simulated time, renderer state is equal to “all steps applied” reference.
                
            - `currentStepIndex` advanced to 2.
                
        - `pause()` mid-play:
            
            - Controller stops after current step, status = "paused".
                
        - `stepBack()`:
            
            - After moving forward a few steps, call `stepBack()`, then check renderer state equals replay up to `index - 1`.
                

**Acceptance checks**

- API supports all required operations: play, pause, stepForward, stepBack, jumpTo, setSpeed.
    
- StepBack is correct (possibly implemented via replay).
    
- Design is robust enough to plug into UI without modification.
    

---

## 4.5 Step 4 — Command Path / VM (UI → Operation → Session)

**Goal:** Define a typed command layer that the UI uses instead of touching Session/Renderer directly.

**Work items**

1. **Command types** (`core/commands.ts`):
    
    ```ts
    import { Operation } from "@ltvis/shared";
    
    // UI-level intents – what the UI calls
    export type UICommand =
      | { type: "CreateStructure"; kind: "SeqList" | "LinkedList" | "Stack" | "BST" | "Huffman"; id: string; payload?: any }
      | { type: "RunOperation"; op: Operation }
      | { type: "LoadDemo"; demoId: "LL_INSERT" | "BST_DELETE" | "HUFFMAN_BUILD" }
      | { type: "ResetStructure"; id: string }
      // playback/control commands may be separate, e.g.:
      | { type: "Playback"; action: "Play" | "Pause" | "StepForward" | "StepBack" | "Jump"; index?: number };
    
    export interface CommandContext {
      session: Session;
      playback: PlaybackController;
      // optional: demo registry
    }
    
    export function handleUICommand(ctx: CommandContext, cmd: UICommand): void {
      switch (cmd.type) {
        case "CreateStructure":
          ctx.session.addStructure(cmd.kind, cmd.id, cmd.payload);
          break;
        case "RunOperation":
          ctx.session.executeOperation(cmd.op);
          // maybe trigger playback of just the new entry or mark timeline dirty
          break;
        case "LoadDemo":
          // load preset operations & structures from a demo module
          break;
        case "ResetStructure":
          ctx.session.resetStructure(cmd.id);
          break;
        case "Playback":
          // delegate to playback controller
          break;
      }
    }
    ```
    
2. **Operation construction helpers**
    
    - Provide factory functions that UI can call to build strongly-typed `Operation`s:
        
        ```ts
        export function makeLinkedListInsertOp(id: string, index: number, value: number): Operation { ... }
        export function makeBSTDeleteOp(id: string, key: number): Operation { ... }
        // ...
        ```
        
    - Keep this in `core/commands.ts` or a separate `core/ops-factory.ts`.
        
3. **Demo registry**
    
    - A simple module `core/demos.ts` that exports known demo scripts:
        
        - For each demo:
            
            - Structures to create.
                
            - Operations sequence to run.
                
        - `handleUICommand` for `LoadDemo` can:
            
            - Reset Session.
                
            - Create required structures.
                
            - Run operations in order, filling timeline.
                
            - Renderer will later replay via Playback.
                
4. **Tests**
    
    - Command path tests that **don’t use React**:
        
        - Given a `SessionImpl`, `PlaybackController` (with mocked Renderer), and a `UICommand`:
            
            - `CreateStructure` then `RunOperation` yields changed snapshot and timeline entry.
                
            - `LoadDemo` sets up expected structures and timeline lengths.
                

**Acceptance checks**

- UI can be implemented by issuing `UICommand`s only; no direct Session/Model access is required.
    
- Request’s example flows (linked-list insert, BST delete, Huffman) can all be driven by `UICommand` sequences.
    

---

## 4.6 Step 5 — Glue it into a minimal UI (without full polishing)

**Goal:** Make sure the whole path actually works end-to-end, even before Phase 5’s full UI polish.

**Work items**

1. **Wire into an MVP page** (`pages/Sandbox.tsx`):
    
    - On mount:
        
        - Create `SessionImpl`, `RendererImpl`, `PlaybackControllerImpl`.
            
        - Store them in React state or context (but keep them as “services”).
            
    - Provide simple buttons:
        
        - “Load LinkedList Demo” → dispatch `UICommand { type: "LoadDemo", demoId: "LL_INSERT" }`.
            
        - “Play”, “Pause”, “Step Forward”, “Step Back” → dispatch `Playback` commands.
            
    - Canvas:
        
        - Renders `renderer.getState()` via existing `DemoCanvas`.
            
    - Subscribe to renderer changes via `onStepApplied` callback or via polling on each playback tick.
        
2. **Quick manual sanity tests**
    
    - Developer workflow:
        
        - Click “Load BST Delete Demo”.
            
        - Click “Play”.
            
        - Observe tree animation and timeline index changes.
            
        - Step back/forward and verify it behaves sensibly.
            

**Acceptance checks**

- End-to-end pipeline works with **real implementations**:
    
    - UICommand → Session.executeOperation → Timeline updated → PlaybackController → Renderer → Canvas.
        
- Headless tests still pass and don’t require React environment.
    

---

## 4.7 Phase 4 Done-ness Checklist

To declare Phase 4 complete:

-  `core/timeline.ts`
    
    -  Pure `TimelineState` with append/step/jump helpers.
        
    -  Unit tests cover multi-entry sequences and edge indices.
        
-  `core/session.ts`
    
    -  `SessionImpl` orchestrates structures and timeline.
        
    -  Headless tests with linked list, BST, Huffman examples.
        
    -  No UI/Renderer dependencies.
        
-  Model is expected to include snapshots on every OpStep; if any are missing, Session marks the entry non-reversible, patches the final step with a snapshot so playback can continue, and playback/UI should disable stepBack before that entry (replay is a fallback only).
        
    -  Error `OpStep` is surfaced without mutating state; timeline marks it and stops further append for that operation.
        
-  `core/playback.ts`
    
    -  PlaybackController with `play`, `pause`, `stepForward`, `stepBack`, `jumpTo`, `setSpeed`.
        
    -  StepBack uses a reliable mechanism (replay or snapshots) and passes tests.
        
-  `core/commands.ts`
    
    -  Command types and dispatcher for `CreateStructure`, `RunOperation`, `LoadDemo`, `ResetStructure`, `Playback`.
        
    -  Operation factory helpers for main structures.
        
-  Minimal UI page exists that:
    
    -  Loads at least one demo.
        
    -  Can play/pause/step the demo.
        
-  M-07 and M-09 requirements are verifiably satisfied:
    
    -  Timeline playback controls.
        
    -  Headless model+timeline usage (Renderer optional).
