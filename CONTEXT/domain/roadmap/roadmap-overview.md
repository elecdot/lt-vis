# Roadmap Execution Notes (read once)

- Treat `packages/shared` as the single source of truth for contracts and service ports (PersistenceService/NlpService). Do not introduce ad-hoc IO/NL interfaces in later phases.
- Commands listed per phase must exist in `package.json`; if missing, add or alias them before claiming a phase is done. Keep script names consistent across phases (e.g., vitest scopes like `-- --grep AVL` or named scripts like `test:viz`).
- Snapshot policy: every **OpStep** carries a snapshot (REQUEST §8.1 / DESIGN §7). stepBack is snapshot-first; replay-from-start is only a documented fallback if a step’s snapshot is intentionally omitted (must be explicitly called out in the phase).
- Hydration: each `Structure` must support `resetFromSnapshot` for persistence/import; tests should exercise round-trip snapshot restore.

# 1. Phase 0 — Repo & Monorepo Scaffolding (Pre-work)
    

---

**Goals**

- Set up a TypeScript monorepo that matches the architecture in REQUEST/DESIGN.
    
- Make `packages/shared` the single source of truth for core contracts.
    
- Ensure team can build, run, test from day 1.
    

**Work items**

- Create monorepo structure:
    
    - `apps/web` — React + Vite UI, Renderer, Layout
        
    - `packages/shared` — TS types: `StateSnapshot`, `VizEvent`, `OpStep`, `Operation`, `Structure`
        
    - `packages/model-ts` — core structures + algorithms
        
    - `examples` — runnable example scripts + snapshots
        
    - CI: lint + test (Vitest) on push
        
- Tooling:
    
    - Node 20 + pnpm workspace
        
    - TS config (path aliases to `@ltvis/shared`, `@ltvis/model`)
        
    - ESLint + Prettier
        
    - Vitest config and a trivial “smoke test” in each package
        

**Deliverables**

- Monorepo in Git with basic scripts:
    
    - `pnpm dev` → runs `apps/web`
        
    - `pnpm test` → runs all package tests
        
    - `pnpm -r lint`
        
- `packages/shared/src/types.ts` with **draft** interfaces exactly matching REQUEST.md §8.1.

- `package.json` includes script stubs/aliases for all roadmap-referenced commands so later phases don’t invent them:
    
    - `dev`, `build`, `test`, `lint`, `test:e2e`, `coverage` (root).
        
    - Scoped test scripts or documented Vitest filters aligned to roadmap commands: `test:viz`, `test:core`, `test:ui`, `test:nl`, `test:persistence`, `test:dsl`, `test:avl` (or `pnpm --filter ... test -- --grep ...` variants).
        
    - Docs scripts: `docs:dev`, `docs:build`.
        
    - Perf harness runner: `perf` (invokes `apps/web/scripts/perf.ts`).

**Commands to run**

- `pnpm install`
- `pnpm test`
- `pnpm --filter web dev` (smoke-check Vite shell compiles)
    

**Acceptance criteria**

- Any team member can clone → `pnpm i` → `pnpm test` → all green.
    
- Shared types compile and are imported by both `packages/model-ts` and `apps/web` without circular deps.
    
- A minimal `examples/linked_list_skeleton.ts` compiles and uses `Operation`, `OpStep`, `VizEvent` types (even if not implemented yet).

- `package.json` scripts for all roadmap commands are present (or aliased) and runnable: `dev`, `build`, `test`, `lint`, `test:e2e`, `coverage`, scoped test scripts/filters (`test:viz`, `test:core`, `test:ui`, `test:nl`, `test:persistence`, `test:dsl`, `test:avl`), `docs:dev`, `docs:build`, and `perf` for the harness.
    

# 2. Phase 1 — Requirements Consolidation & Shared Contracts
    

---

> Focus: **requirements → types**. Lock contracts before implementing logic.

**Goals**

- Translate REQUEST.md + DESIGN.md into precise TS types, comments and doc.
    
- Make Model/Renderer separation enforceable by type system.
    
- Provide acceptance examples as types + static data.
    

**Work items**

1. **Finalize shared contracts in `packages/shared`**
    
    - `ID`, `NodeState`, `EdgeState`, `StateSnapshot`
        
    - `VizEvent` union: `CreateNode`, `RemoveNode`, `Link`, `Unlink`, `Move`, `Highlight`, `Compare`, `Swap`, `Rotate`, `Rebalance`, `Tip`
        
    - `OpStep` with `events`, `explain?`, `snapshot?`, `error?`
        
    - `Operation` union: `Create/Insert/Delete/Find/Push/Pop/BuildHuffman`
        
    - `Structure` interface: `kind`, `id`, `snapshot()`, `reset()`, `apply(op)`
        
2. **Document invariants & conventions (in code comments)**
    
    - ID format (prefix namespace, unique IDs)
        
    - Event idempotence rule
        
    - Error behavior (`OpStep.error` stops further steps, internal state unchanged)
        
    - `snapshot` semantics (partial vs full)
        
3. **Encode the two core examples from REQUEST.md as TypeScript artifacts**
    
    - `examples/linkedList_insert_example.ts` — `[1,3,4]` insert `2` at index `1`
        
    - `examples/bst_delete_example.ts` — build `[5,3,7,2,4,6,8]` delete `7`
        
    
    For now, these can be **static JSON-ish data** with “expected” `OpStep[]` shape.
    

**Deliverables**

- `packages/shared/src/types.ts` with full doc comments.
    
- `examples/types.ts` importing from `@ltvis/shared`.
    
- Example files referenced in REQUEST.md created and compiling.
    

**Acceptance criteria**

- Another developer can open `types.ts` and implement a replay pipeline in 1–2 pages (REQUEST §2, interface contract draft).
    
- `pnpm test` includes a small “schema check” that validates example JSON against the shared types (using e.g. `zod` or TS typings only).
    
- The two examples instantiate **valid** `OpStep[]` and `VizEvent[]` according to the shared types.

**Commands to run**

- `pnpm --filter shared test`
- `pnpm --filter examples test`
    

# 3. Phase 2 — Core Model: Structures & OpStep/VizEvent Generation
    

---

> Focus: **M-01 – M-05**. No UI/Renderer yet; just headless model with unit tests.

**Goals**

- Implement core data structures & operations in `packages/model-ts`.
    
- For each Operation, return semantically correct `OpStep[]` sequences.
    
- Achieve ≥80% unit test coverage for the model layer (target higher later).
    

**Work items**

1. **Internal structures**
    
    - `SeqList` (array list)
        
    - `LinkedList` (singly, possibly doubly)
        
    - `Stack` (array-based)
        
    - `BinaryTree` (generic, supports traversals)
        
    - `BST` (insert/find/delete, three deletion cases)
        
    - `HuffmanTree` (build from weight map via min-heap)
        
    
    Each implements `Structure` interface and uses shared types.
    
2. **Operation → OpStep mapping**
    
    For each structure, define **pure** functions:
    
    ```ts
    function applySeqListOp(state: InternalSeqList, op: Operation): Iterable<OpStep> { ... }
    ```
    
    and wrap them into `Structure.apply()` implementations.
    
    - Ensure that OpSteps include at least:
        
        - `Highlight` for the “current” node or index
            
        - `CreateNode/RemoveNode` when elements appear/disappear
            
        - `Link/Unlink` for edge/top/next changes
            
        - `Move` for layout-relevant shifts
            
        - `Tip` and `explain` for step descriptions
            
        - `error` OpStep for invalid operations
            
3. **Unit tests (Vitest + fast-check where useful)**
    
    - **For M-01** (lists):
        
        - Insert/delete reference behavior compared against plain JS array.
            
        - Example `[1,3,4] insert(1,2)` → final snapshot `[1,2,3,4]`.
            
    - **For M-02** (stack):
        
        - push/pop order; error on empty pop.
            
        - Check that OpStep sequence contains expected events (`CreateNode`, `RemoveNode`, `Tip`).
            
    - **For M-03 / M-04** (BT/BST):
        
        - BST invariants via inorder traversal.
            
        - Each delete case (leaf, one child, two children) leads to correct structure.
            
        - Deletion example `[5,3,7,2,4,6,8] delete 7` matches expected end state.
            
    - **For M-05** (Huffman):
        
        - Total cost matches reference greedy implementation for `{a:5,b:9,...,f:45}`.
            
        - Generated tree structure is valid (parent.weight = sum(children)).
            
4. **OpStep content sanity checks**
    
    - For each operation, OpStep list is **non-empty**.
        
    - Last OpStep’s `snapshot` (if provided) matches `Structure.snapshot()`.
        

**Deliverables**

- `packages/model-ts` with:
    
    - `SeqList`, `LinkedList`, `Stack`, `BinaryTree`, `BST`, `Huffman` classes (or modules).
        
    - Exported factory: `createStructure(kind, id, initialPayload?)`.
        
- Unit test suite documenting behavior and OpStep patterns.
    

**Acceptance criteria**

- All M-01 – M-05 **logic** demonstrably correct in tests; outputs reproducible.
    
- Model layer does **not** import React, DOM, or any rendering library.
    
- Given the example operations, unit tests assert that:
    
    - Final snapshots match expected structures.
        
    - OpStep streams include appropriate `Highlight/Link/Unlink/CreateNode/RemoveNode/Move/Tip` events.
        
- Coverage report for `packages/model-ts` ≥ 80% (to be pushed towards 90% later).

**Commands to run**

- `pnpm --filter model-ts test`
- `pnpm --filter model-ts test -- --coverage` (coverage gate)
    

# 4. Phase 3 — Renderer Core & Layout Engine MVP
    

---

> Focus: **Viz.Engine + Viz.Layout**, still minimal UI (just a canvas with basic controls). Targets M-06 and part of M-07.

**Goals**

- Implement an idempotent Renderer that consumes `VizEvent[]`.
    
- Provide layout helpers for linear and tree structures.
    
- Demonstrate that Model → Renderer produces coherent animations for small examples.
    

**Work items**

1. **Renderer core (`apps/web/src/viz/engine.ts`)**
    
    - In-memory “view state”:
        
        ```ts
        interface ViewState {
          nodes: Map<ID, NodeState>;
          edges: Map<ID, EdgeState>;
          meta: { selection?: ID | null; step?: number; [k: string]: unknown };
        }
        ```
        
    - Implement `applyEvent(state, event)` with **idempotent** semantics.
        
    - Implement `applyOpStep(state, step)` and `applySteps(state, steps, options)` for playback.
        
    - Integration with React Flow:
        
        - Map NodeState/EdgeState → React Flow nodes/edges.
            
        - On each state update, feed React Flow components.
            
2. **Layout engine (`apps/web/src/viz/layout.ts`)**
    
    - Implement:
        
        - `layoutLinear(nodes, options)` for SeqList/LinkedList/Stack.
            
        - `layoutTree(nodes, edges, options)` using d3-hierarchy or elkjs.
            
    - Support pinned nodes (basic: if `node.pinned`, do not move it).
        
    - Provide simple layout options for:
        
        - Horizontal list layout (for lists/stack).
            
        - Top-down tree layout (for BT/BST/Huffman).
            
3. **Animation scheduler**
    
    - Simple first: event-by-event animation with a base duration.
        
    - Later: refine with speed control (tied to Phase 4 timeline).
        
4. **Dev demo**
    
    - Hard-code OpStep[] from examples and feed into Renderer.
        
    - Show:
        
        - Node creation/removal.
            
        - Link/unlink.
            
        - Move transitions.
            
        - Highlights and tip text.
            

**Deliverables**

- `viz/engine.ts` with `applyEvent` & `playSteps`.
    
- `viz/layout.ts` with `layoutLinear` and `layoutTree`.
    
- A minimal React page `DemoRenderer` that runs the BST/linked list example UI-less.
    

**Acceptance criteria**

- For n ≤ 15 (lists or trees), auto-layout produces non-overlapping nodes with reasonable spacing (M-06).
    
- Re-running the same OpStep sequence produces the same final view state (idempotence).
    
- Renderer compiles and can run **without** the full app shell (good for isolation).

**Commands to run**

- `pnpm --filter web test -- viz`
- `pnpm --filter web dev` and load `/renderer-demo` for manual smoke test
    

# 5. Phase 4 — Timeline, Session, and Command Path
    

---

> Focus: **timeline playback + Session/VM**, fulfilling M-07 + M-09.

**Goals**

- Introduce a `Session` that manages structures, operations, timeline, and playback.
    
- Implement a replayable timeline with play/pause/step/back/jump/speed.
    
- Ensure Model core logic is fully usable **without** UI (MVC separation).
    

**Work items**

1. **Session module (`apps/web/src/core/session.ts`)**
    
    - Responsibilities:
        
        - Manage a set of `Structure` instances (`Map<id, Structure>`).
            
        - Store `timeline: OpStep[]` + `currentIndex`.
            
        - `execute(op: Operation): void`:
            
            - Calls `structure.apply(op)` → `OpStep[]`.
                
            - Appends to timeline.
                
            - Optionally attaches snapshots for key steps.
                
        - Provide `getCurrentSnapshot()` returning `StateSnapshot` for Renderer.
            
2. **Timeline controller**
    
    - API:
        
        ```ts
        interface TimelineController {
          play(): void;
          pause(): void;
          stepForward(): void;
          stepBack(): void;
          jumpTo(index: number): void;
          setSpeed(multiplier: number): void;
        }
        ```
        
    - Implementation:
        
        - Maintains playback state machine (Idle/Playing/Paused/Stepping).
            
        - Uses `Session` + `Renderer` to apply/revert steps:
            
            - Prefer using `OpStep.snapshot` for stepBack.
                
            - If snapshot missing, mark the step as non-reversible and disable stepBack beyond that point (with UI hint).
                
3. **ViewModel / Command bus (`apps/web/src/core/commands.ts`)**
    
    - Translate UI intents into Operations:
        
        - e.g., `onLinkedListInsert(id, pos, value)` → `Operation{kind:'Insert', target:id, pos, value}`.
            
        - `onExecuteOperation(op)` dispatches to Session.
            
4. **Tests for MVC separation**
    
    - Headless tests running Session + Model without Renderer:
        
        - Given `Operation[]`, produce an `OpStep[]` timeline and final snapshot.
            
        - Confirm JSON serializability.
            

**Deliverables**

- `Session` and `TimelineController` implementations.
    
- Integration tests verifying that playing and stepping through the timeline yields consistent snapshots.
    
- Documentation section: “How to use Session + Model in headless mode”.
    

**Acceptance criteria**

- M-09: With Renderer disabled (or mocked), `Session` + `packages/model-ts` can generate an `OpStep[]` timeline and `StateSnapshot` in tests.
    
- M-07: Timeline supports play/pause/step forward/step back/jump/speed with tests for:
    
    - StepBack correctness on steps with snapshots.
        
    - Play speed affecting animation durations but not event order.

- Snapshot policy: final OpStep of every `apply(op)` carries a snapshot; stepBack uses that snapshot when available, and replay-from-zero is only an explicit fallback for steps that lack snapshots.

**Commands to run**

- `pnpm --filter web test -- core`
- `pnpm --filter web test -- timeline`
        

# 6. Phase 5 — UI Shell: Panels, Canvas, Controls
    

---

> Focus: completing the MVP UI for core use cases: M-01 – M-08.

**Goals**

- Build the `apps/web` React UI: canvas, timeline control bar, command panel, explain panel.
    
- Enable classroom and self-study flows end-to-end.
    

**Work items**

1. **App layout**
    
    - Left: **Command Panel**
        
        - Choose structure: SeqList / LinkedList / Stack / BinaryTree / BST / Huffman.
            
        - Forms for operations:
            
            - List: create from `[1,3,4]`, insert/delete by index.
                
            - Stack: push/value, pop.
                
            - BST: create from list, find, delete.
                
            - Huffman: create from `{char:weight}`.
                
    - Center: **Canvas**
        
        - React Flow canvas integrating `ViewState`.
            
        - Zoom, pan, node drag (set `pinned`).
            
    - Bottom or right: **Timeline Controls + Explain Panel**
        
        - Play/pause/step/back/jump/slider for index.
            
        - Speed control slider or dropdown.
            
        - Current OpStep `explain` text + `Tip` list.
            
2. **Interaction wiring**
    
    - UI → Command bus → Session → Renderer → Canvas.
        
    - Node drag updates `NodeState.x,y` and `pinned=true`.
        
    - Zoom/pan configured via React Flow.
        
3. **Presets and quick demos**
    
    - Buttons: “Load LinkedList Demo” (M-01), “Load BST Delete Demo” (M-04 example), “Load Huffman Demo” (M-05).
        
    - Executing demos should:
        
        - Build initial structure.
            
        - Run a predefined sequence of Operations.
            
        - Show timeline ready for replay.
            
4. **Keyboard shortcuts & minimal accessibility**
    
    - Space: play/pause.
        
    - Arrow left/right: step back/forward.
        

**Deliverables**

- Fully functional `apps/web` MVP.
    
- Predefined demo scenes aligned with REQUEST scenarios A–D (BST deletion, linked list insert, Huffman).
    

**Acceptance criteria**

- M-01 – M-05: all core operations are performable via UI and visualized.
    
- M-06: Layouts are stable; trees/lists up to ~15 nodes display without overlaps.
    
- M-07: Playback controls usable and correct; stepBack works for demo operations.
    
- M-08: Users can drag nodes (pinned), zoom, and pan; interactions feel responsive.
    
- UX check: a new user can complete linked list insert and BST delete demos in ≤5 minutes with only minimal guidance (REQUEST §4.1).

**Commands to run**

- `pnpm --filter web dev` (manual demo)
- `pnpm --filter web test -- ui`
    

# 7. Phase 6 — Testing, Performance & Quality Hardening
    

---

> Focus: bring system to “feature complete & robust” for all M-requirements.

**Goals**

- Strengthen tests across model, Renderer, Session, and UI.
    
- Validate non-functional requirements: performance, reliability, maintainability.
    

**Work items**

1. **Unit & integration tests**
    
    - Extend model tests to target ≥90% coverage.
        
    - Renderer tests:
        
        - Given a sequence of `VizEvent`, verify final `ViewState`.
            
        - Ensure idempotence (`applyEvent` twice produces same state).
            
    - Session + timeline integration tests:
        
        - Simulate complete flows (linked list, BST delete, Huffman) in headless mode.
            
2. **E2E tests (Playwright)**
    
    - Scripts to:
        
        - Open app → select BST demo → run delete 7 → step through timeline → verify final snapshot (via exported JSON or DOM attributes).
            
        - Linked list demo: check final displayed labels.
            
3. **Performance checks**
    
    - Measure FPS and Operation latency for n~50:
        
        - Ensure average FPS ≥ 30.
            
        - Model Operation → OpStep < 200ms.
            
4. **Error handling**
    
    - Demonstrate error OpSteps:
        
        - Out-of-bounds index for lists.
            
        - Pop on empty stack.
            
        - BST delete non-existent key.
            
        - UI shows `explain` + error message clearly.
            

**Deliverables**

- Test reports (coverage, basic perf metrics).
    
- Documentation: “How to run tests & interpret metrics”.
    

**Acceptance criteria**

- All M-01–M-09 acceptance checks from REQUEST.md satisfied and reproducible.
    
- CI pipeline green, including unit + E2E tests.
    
- Documented evidence (screenshots/JSON) for at least:
    
    - Linked list insertion example.
        
    - BST delete example.
        
    - Huffman cost verification.

**Commands to run**

- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`
        

# 8. Phase 7 — Persistence: Save/Open Sessions (S-10)
    

---

> First extension: **project save/open**, but **do not block** v1.0 core if time is tight.

**Goals**

- Serialize/restore structures, timeline, and layout as JSON.
    
- Implement autosave draft and recovery.
    

**Work items**

1. **Persistence schema implementation**
    
    - Implement schema from REQUEST §10:
        
        ```json
        {
          "meta": { "version": "1.0.0", ... },
          "structures": [ { "id": "BST", "kind": "BST", "state": SnapshotJSON } ],
          "timeline": [ { "step": 0, "events": [...], "explain": "..." } ],
          "layout": { "nodes": { "BST:n5": { "x": 123, "y": 456 } } }
        }
        ```
        
    - IO functions in `apps/web/src/infra/persistence.ts`:
        
        - `exportProject(Session): ProjectJSON`
            
        - `importProject(ProjectJSON): Session`

    - Hydration contract:
        
        - Add `resetFromSnapshot(snapshot: StateSnapshot)` (or equivalent helper) to each `Structure` in `packages/model-ts` and expose shared typing in `packages/shared` so import can restore model state without replaying operations when snapshots are present.
        
        - Document snapshot shape per structure to keep export/import deterministic.
            
2. **UI integration**
    
    - “Save project” button → download JSON.
        
    - “Open project” button → file picker → load & restore.
        
3. **Autosave**
    
    - Periodic draft save (e.g., `localStorage`):
        
        - Every 30s or after k operations.
            
    - On load: prompt user to restore/discard draft.
        
4. **Validation**
    
    - Schema validation (e.g., `zod`) to ensure:
        
        - node/edge ID consistency.
            
        - event parseability.
            
        - meta.step range correctness.
            

**Deliverables**

- `IO.Persistence` module + tests.
    
- UI hooks for save/open/autosave.
    

**Acceptance criteria**

- S-10: user can save a project and reopen it with timeline and layout intact (Scenario C).
    
- Draft recovery works: after forced reload, app offers restore and correctly restores last draft.
    
- Import path documented: if snapshots exist, hydration restores state without full replay; replay-from-zero is used only as a documented fallback.

- Snapshot-first import is tested: export → import round-trip uses `resetFromSnapshot` when snapshots are present; replay fallback is covered as a secondary path.

**Commands to run**

- `pnpm --filter web test -- persistence`
- `pnpm --filter web test:e2e -- --project=chromium`
    

# 9. Phase 8 — AVL Rotations & Tree Extensions (S-11)
    

---

> Second extension: **AVL tree visualizations**, building on BST and Rotate/Rebalance events.

**Goals**

- Implement AVL variant of BST with insert/delete rotations.
    
- Visualize LL/RR/LR/RL rotations and rebalance steps.
    

**Work items**

1. **AVL structure in `packages/model-ts`**
    
    - Either:
        
        - `AVLTree` extending `BST`, or
            
        - `BST` with a “balancing strategy” plugin.
            
    - Store height/balance factor in internal nodes and/or `NodeState.props`.
        
2. **Operation mapping**
    
    - Reuse `Operation` kind `'Create'|'Insert'|'Delete'`.
        
    - Emit `Rotate` and `Rebalance` VizEvents during rebalancing.
        
3. **Renderer support**
    
    - Extend Renderer to interpret `Rotate`/`Rebalance` events with appropriate animations (subtree moves).
        
4. **UI**
    
    - Add “AVL” as a structure type in the command panel.
        
    - Provide a preset example showing all rotation types.
        

**Deliverables**

- AVL implementation and unit tests verifying tree invariants.
    
- Demo scene for AVL insertion/deletion with visible rotations.
    

**Acceptance criteria**

- S-11: instructor can demonstrate at least one example of each rotation type.
    
- Inorder traversal remains sorted; heights/balance factors within {-1,0,1}.

**Commands to run**

- `pnpm --filter model-ts test -- --grep AVL`
- `pnpm --filter web test -- viz`
    

# 10. Phase 9 — DSL v0.1 (S-12)
    

---

> Third extension: **script-driven rendering** using DSL → Operation[].

**Goals**

- Implement DSL parser and semantic checker per REQUEST §11.
    
- Allow instructors to define scripts that generate structures and operations.
    

**Work items**

1. **DSL grammar & parser**
    
    - Implement EBNF in Chevrotain (`packages/lang-dsl` or within `apps/web/lang`):
        
        - `create list linked L [1,3,4]`
            
        - `insert L at 1 value 2`
            
        - `create bst T [5,3,7,2,4,6,8]`
            
        - `delete T key 7`
            
        - `build huffman H {a:5,b:9,...}`
            
2. **AST design**
    
    - AST node types for `Create`, `Insert`, `Delete`, `BuildHuffman`, etc.
        
    - Map AST → `Operation[]` (using shared types).
        
3. **Semantic validation**
    
    - Check target IDs, payload correctness, duplicate definitions.
        
    - On error, produce line/column + friendly messages.
        
4. **UI editor**
    
    - DSL editor panel with:
        
        - Text area (or code editor).
            
        - “Validate” button → parse and show errors or operation summary.
            
        - “Execute” button → run `Operation[]` via Session.
            
5. **Tests**
    
    - Round-trip tests:
        
        - DSL → AST → Operation[] → timeline → final snapshot match pre-existing tests (linked list & BST examples).
            

**Deliverables**

- `Lang.DSL` module + tests.
    
- DSL editor in UI integrated with same command/Session path.
    

**Acceptance criteria**

- S-12: instructor can reproduce the LinkedList and BST examples solely by writing DSL script and clicking “Execute”.
    
- Syntax errors show helpful, line-based messages.
    
- Generated `Operation[]` sequences are identical (or semantically equivalent) to UI-generated sequences.

**Commands to run**

- `pnpm --filter lang-dsl test`
- `pnpm --filter web test -- dsl`
    

# 11. Phase 10 — Natural Language → DSL (C-13) & Research Hooks
    

---

> Optional research/extension phase; **must not** compromise core stability.

**Goals**

- Provide NL → DSL prototype with **human confirmation**.
    
- Log NL, DSL candidates, and chosen scripts for future analysis.
    

**Work items**

1. **NLP adapter interface**
    
    - Define API (even if stubbed / mocked):
        
        ```ts
        interface NLService {
          generateCandidates(input: string): Promise<{dsl: string; score?: number}[]>;
        }
        ```
        
    - Implementation can call external LLM or local prompt (configurable).

    - Reuse the shared `NlpService` port (see Phase 12) so UI/DSL can swap between stubs and HTTP adapters without new interfaces.
        
2. **Validation + confirmation flow**
    
    - Pipeline:
        
        - NL text → DSL candidates (max 3).
            
        - For each candidate: parse + semantic check.
            
        - Show candidate DSL + Operation summary + first few OpSteps preview.
            
        - User manually selects candidate or edits DSL.
            
3. **Provenance logging**
    
    - Log:
        
        - Original NL.
            
        - Candidate DSLs.
            
        - Selected DSL.
            
        - Timestamp + optional user ID.
            
4. **UI integration**
    
    - Simple “NL prompt” input box above DSL editor:
        
        - “Generate script” → pre-fill DSL editor with top candidate.
            

**Deliverables**

- `AI.NLP` (adapter) with configuration and documentation.
    
- NL → DSL flow integrated, but optional (user can ignore it completely).
    

**Acceptance criteria**

- C-13: user can input “Create BST [5,3,7,2,4] and delete 7”, see a DSL candidate, correct it if needed, and execute.
    
- NL feature is **non-blocking**; if NLP fails or is disabled, DSL UI still works.

**Commands to run**

- `pnpm --filter web test -- nl`
- `pnpm --filter web test:e2e -- --project=chromium`
    

# 12. Phase 11 — Documentation & Final Packaging
    

---

**Goals**

- Provide complete documentation for users (teachers/students) and developers.
    
- Package demos and evidence for course checks.
    

**Work items**

1. **User docs (VitePress or similar)**
    
    - “Quick start for teachers”
        
    - “Quick start for students”
        
    - “How to use DSL scripting”
        
    - “How to use AVL/Huffman demos”
        
2. **Developer docs**
    
    - Overview of architecture (linking REQUEST + DESIGN).
        
    - How to add a new structure:
        
        - Implement `Structure` + tests.
            
        - Emit appropriate `VizEvent`s.
            
        - Integrate into UI.
            
3. **Examples & demo assets**
    
    - Record short GIFs/videos for:
        
        - Linked list insertion.
            
        - BST deletion (three cases).
            
        - Huffman construction.
            
        - AVL rotations (if implemented).
            
4. **Release packaging**
    
    - Build web app (Vite).
        
    - Optional: wrap with Tauri for desktop demo.
        

**Deliverables**

- `docs/` site.
    
- Demo recordings and example DSL scripts in `examples/`.
    

**Acceptance criteria**

- All M-requirements satisfied and **traceable** to tests/demos (use the traceability matrix from REQUEST).
    
- Teacher can use docs to run a BST deletion demo **without** reading source code.
    
- Developer can follow “add a new structure” doc and successfully plug in a toy structure (e.g., “Queue”) within a day.

**Commands to run**

- `pnpm build`
- `pnpm --filter docs dev` (or site build command once defined)

> Phase 12 is optional; do not include in CI expectations.

# 13. Phase 12 — Backend/API Ports (Optional)

See `phase12-backend-api.md` for the optional post-v1 backend and service-port plan (PersistenceService/NlpService). Treat this as an extension after core UI/DSL features are stable.

> DSL note: `phase9-dsl.alpha.md` is the canonical DSL spec. `phase9-dsl.beta.md` remains only as a pointer and should not be edited.
