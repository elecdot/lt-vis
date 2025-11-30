Nice, this is the “make it solid” phase. Let’s turn **Phase 6 — Testing, Performance & Quality Hardening** into something your team can actually execute.

---

## 6. Phase 6 — Testing, Performance & Quality Hardening

### 6.0 Goals

By the end of Phase 6, you want:

- Confidence that **core correctness** is enforced across:
    
    - Model (`packages/model-ts`)
        
    - Renderer (`viz/engine.ts`, `viz/layout.ts`)
        
    - Session + Timeline + Playback (`core/*`)
        
    - UI integration (`apps/web`)
        
- Basic **performance guarantees** for classroom-scale inputs.
    
- Clear **error behavior** and no “mystery crashes.”
    
- CI that runs the whole suite and gives visible coverage.
    

You’re not adding major new features here; you’re making the existing ones robust and measurably reliable.

---

## 6.1 Global Testing Strategy

**Goal:** Define what gets tested where, and how deep.

**Work items**

1. **Test layers & tools**
    
    - **Unit tests (Vitest)**:
        
        - Model, Renderer, Timeline, Session, Command, layout.
            
    - **Integration tests (Vitest)**:
        
        - Simulate full pipelines without UI (Model + Session + Renderer).
            
    - **E2E tests (Playwright/Cypress)**:
        
        - Run real browser, click through UI, assert DOM state.
            
    - **Property-based tests (optional, but very nice)**:
        
        - Use e.g. `fast-check` for model invariants: BST ordering, stack behavior, list equivalence to arrays.
            
2. **CI matrix**
    
    - On every push / PR:
        
        - `pnpm lint`
            
        - `pnpm test` (unit + integration)
            
        - `pnpm test:e2e` (headless browser)
            
    - Coverage report published (e.g. via Codecov, or stored as artifact).
        

**Acceptance criteria**

- Provide either a single alias (`pnpm test:all`) **or** a documented sequence (`pnpm lint && pnpm test && pnpm test:e2e`) to run the whole pipeline locally.
    
- CI status reflects **all** layers (failing E2E or model tests both block merges).
    

---

## 6.2 Model Layer Hardening (`packages/model-ts`)

**Goal:** Go from “works on examples” to “provably correct on many cases.”

**Work items**

1. **Extend example-based tests**
    
    - For each structure:
        
        - Add **edge-case tests**:
            
            - Empty structure operations (delete/pop/find on empty).
                
            - Single-element operations.
                
            - Boundary indices: `0`, `size-1`, `size`, `-1` (invalid).
                
            - Repeated inserts/deletes at same position.
                
        - For BST & Huffman:
            
            - Duplicates handling (whatever policy you chose – enforce it in tests).
                
            - Unbalanced extreme cases (sorted insertion).
                
2. **Property-based tests (fast-check)**
    
    - `SeqList` / `LinkedList` / `Stack`:
        
        - Generate random sequences of operations (insert/delete/push/pop) on an array and the structure in parallel.
            
        - Assert final content is equal.
            
    - `BST`:
        
        - Generate random insertion sequences:
            
            - Inorder traversal equals sorted unique keys.
                
        - For random delete sequences:
            
            - Inorder traversal after deletes = sorted(initial – deleted).
                
    - `Huffman`:
        
        - For small random weight maps (2–6 symbols):
            
            - Validate each internal node’s weight == sum of children.
                
            - Tree has exactly `n` leaves for `n` symbols.
                
3. **OpStep correctness checks**
    
    - Additional tests that inspect the **OpStep** stream, e.g.:
        
        - Every operation returns at least one step.
            
        - Error operations produce exactly one step with `error` set and **no structural VizEvents** (or only explanatory events).
            
        - Last step of success path has `snapshot` matching `Structure.snapshot()`.
            

**Acceptance criteria**

- Model coverage ≥ 90% (statements/branches).
    
- Property-based tests pass locally and in CI.
    
- Regression tests exist for all REQUEST examples (you already have these, but ensure they’re marked clearly).
    

---

## 6.3 Renderer & Layout Hardening (`apps/web/src/viz`)

**Goal:** Ensure `VizEvent` → `ViewState` → React Flow mapping is predictable and robust.

**Work items**

1. **Renderer engine tests**
    
    For `engine.ts`:
    
    - For each `VizEvent` type:
        
        - Test **idempotence**:
            
            - `applyEvent(state, e)` called twice results in the same `ViewState` as once.
                
        - Test **basic semantics**:
            
            - `CreateNode`: node appears with correct props and coordinates.
                
            - `RemoveNode`: node disappears, related edges are handled (either removed or ignored).
                
            - `Link`/`Unlink`: edges appear/disappear as expected.
                
            - `Swap`: labels/props of nodes swap; edges remain consistent.
                
            - `Tip`: updates `meta.currentTip`.
                
    - Test `applyStep`:
        
        - All events are applied.
            
        - `meta.stepIndex` set correctly.
            
        - If step has `explain`, it’s stored in `meta.currentTip`.
            
2. **Layout tests**
    
    For `layout.ts`:
    
    - **Linear layout**:
        
        - On a sequence of nodes with `props.index`, after `layoutLinear`:
            
            - Nodes with lower index have smaller x (or y), depending on direction.
                
            - Distances between consecutive nodes around `nodeSpacing`.
                
            - No two nodes share identical `(x, y)` unless explicitly allowed.
                
    - **Tree layout**:
        
        - On a small balanced BST:
            
            - Root `y` < children `y`.
                
            - Left subtree nodes’ x < root.x < right subtree nodes’ x.
                
        - On unbalanced tree (e.g. degenerate chain):
            
            - Layout doesn’t overlap nodes; children still below parents.
                
    - **Pinned nodes**:
        
        - Mark some nodes as `pinned=true`.
            
        - After running layout again:
            
            - Pinned nodes keep coordinates.
                
            - Other nodes reposition around them.
                
3. **Renderer/Model compatibility tests (integration)**
    
    - For each canonical example (linked list insert, BST delete, Huffman):
        
        - Load the `OpStep[]` from the model tests.
            
        - Run `applySteps(createEmptyViewState(), steps)`.
            
        - Snapshot-test the resulting `ViewState` (allowing some tolerance if positions are derived).
            

**Acceptance criteria**

- Renderer tests do not require React imports (pure TS).
    
- Layout is deterministic for given inputs.
    
- No crashes for missing IDs or unexpected event sequences (handled gracefully in tests).
    

---

## 6.4 Timeline, Session, Playback Hardening (`apps/web/src/core`)

**Goal:** Make sure the “pipeline brain” behaves correctly and doesn’t desync.

**Work items**

1. **Timeline tests (pure)**
    
    - Test `appendEntry`:
        
        - `totalSteps` increments correctly.
            
        - Entries preserve insertion order.
            
    - Test `stepForward` / `stepBack` / `jumpTo`:
        
        - Index never goes below -1 or above `totalSteps-1`.
            
        - Sequence of forward/back/jump operations produce expected indices.
            
2. **Session tests**
    
    - For simple scenarios:
        
        - Create a Session with one structure.
            
        - Call `addStructure`, `executeOperation`:
            
            - Check timeline entries and final snapshot.
                
        - Execute multiple operations:
            
            - Ensure entries count matches operations.
                
            - Flattened steps equal concatenation of each entry’s steps.
                
    - Error cases:
        
        - `executeOperation` with non-existent structure id:
            
            - Timeline gets one entry with one error OpStep.
                
            - Internal structures map remains unchanged.
                
3. **Playback tests**
    
    - Use fake timers:
        
        - `play()` on a small timeline:
            
            - Applies all steps in order to a fake Renderer (mock methods).
                
            - Respects `speed` multiplier.
                
            - Updates internal `PlaybackState` correctly.
                
        - `pause()` mid-play:
            
            - Stops additional steps.
                
            - Status becomes `"paused"`.
                
        - `stepForward` / `stepBack` / `jumpTo`:
            
            - After some operations, renderer state matches “reference state” obtained by replaying appropriate prefix using pure `applySteps`.
                
    - Ensure “replay-from-scratch for stepBack/jump” path is stable and tested:
        
        - This matches our earlier design decision to favor correctness over micro-optimization.
            

**Acceptance criteria**

- Timeline and playback logic have clear unit tests for normal and edge cases.
    
- No off-by-one bugs when stepping/jumping around the end or beginning.
    
- Session+Playback integration tests pass and are deterministic.
    

---

## 6.5 UI-Level & E2E Hardening (`apps/web`)

**Goal:** Verify that the UI wired to the core behaves correctly as a whole.

**Work items**

1. **Component-level tests (React Testing Library)**
    
    - **Command Panel**:
        
        - Fill linked list form with `1,3,4`, click “Create” → Session has structure, op executed.
            
        - Fill insert form (`index=1, value=2`), click “Insert”:
            
            - Session timeline entries increase.
                
            - Optionally check that Explain panel shows something like “Insert 2 at index 1”.
                
    - **Timeline Bar**:
        
        - Clicking Play calls `PlaybackController.play`.
            
        - Clicking StepBack/StepForward calls appropriate methods.
            
        - Slider drag calls `jumpTo` with correct index.
            
    - **Explain Panel**:
        
        - Given a fake `viewState` with `meta.currentTip` and error, display them correctly.
            
2. **E2E tests (Playwright/Cypress)**
    
    Pick 2–3 “happy-path” flows:
    
    - **Linked list demo**:
        
        - Visit app.
            
        - Click “Load Linked List Insert Demo”.
            
        - Click “Play”.
            
        - Wait for animation completion.
            
        - Assert DOM contains nodes labeled `1`, `2`, `3`, `4` in canvas.
            
        - Optionally check that the Explain panel showed the expected final message.
            
    - **BST delete demo**:
        
        - Load BST demo.
            
        - Step through using StepForward button.
            
        - After completion, assert tree labels `5,3,2,4,6,8` but no `7`.
            
    - **Huffman demo**:
        
        - Load Huffman demo.
            
        - Play.
            
        - Assert final canvas has a root node with weight equal to sum of all weights.
            
    
    Edge case E2E:
    
    - Perform an invalid operation from UI:
        
        - e.g., delete index 10 on a list of size 3.
            
        - Assert an error message appears and canvas isn’t corrupted.
            

**Acceptance criteria**

- Core user flows are covered by at least one E2E test each.
    
- No uncaught exceptions appear in browser console during E2E runs (treat them as failures where possible).
    

---

## 6.6 Performance Checks & Basic Profiling

**Goal:** Confirm the app performs well enough for typical course scenarios.

Think in terms of **small to moderate sizes** (n ≈ 10–100 nodes), not thousands.

**Work items**

1. **Define test scenarios**
    
    - For lists:
        
        - SeqList/LinkedList with up to 50 elements.
            
        - Random sequences of 50–100 operations (insert/delete/find).
            
    - For BST:
        
        - ~50 nodes (from random unique keys).
            
        - Mix of insert/delete operations.
            
    - For Huffman:
        
        - 20–30 symbols with random weights.
            
2. **Measure key metrics (manual or scripted)**
    
    - **Model latency**:
        
        - Time from `executeOperation` call to `OpStep[]` produced.
            
        - Acceptable: < 50–100ms typical.
            
    - **Renderer latency**:
        
        - Time to apply a single `OpStep` to `ViewState`.
            
        - Acceptable: a few ms.
            
- **Playback smoothness**:
    
    - With ~100 steps, ensure no visible stutter on 1x speed.
        
- You can use:
    
    - `performance.now()` around critical paths.
        
    - DevTools Performance panel for rough checking.
        
    - Maintain a small harness script (e.g., `apps/web/scripts/perf.ts`) to run timing on fixed datasets; wire it to CI or manual runs and keep results comparable over time.
        
    - Perf harness location/usage:
        
        - Keep the script at `apps/web/scripts/perf.ts` and run it via a package script (e.g., `pnpm perf`) or `pnpm ts-node apps/web/scripts/perf.ts`; store or log results for comparison.
        
    - Minimal pass criteria for fixtures (e.g., 50-node BST, ~100 steps):
        
        - Model Operation → OpStep p95 < 200ms.
            
        - Renderer applyStep average < 5ms on dev hardware.
            
    - If the perf harness is too slow for CI, run it locally or in a non-blocking CI job and store results for comparison.
            
3. **Micro-optimizations (only if needed)**
    
    - If performance is poor:
        
        - Avoid unnecessary cloning of `ViewState` during playback—clone only when passing to React.
            
        - Debounce React updates if they’re too frequent (e.g., update canvas every k steps during fast playback).
            
        - Optimize layout calls:
            
            - Do not recompute full layout on each minor event; only for structural events (insert/delete/rotation).
                

**Acceptance criteria**

- For typical classroom demos (<= ~50 nodes, <= ~200 total steps):
    
    - End-to-end operations feel responsive (<200ms).
        
    - Playback at 1x looks smooth enough (no obvious judder).
        
- Profiling doesn’t show pathological behavior (no O(n²) surprises in common paths).
    

---

## 6.7 Error Handling, Logging & Developer Diagnostics

**Goal:** Make debugging and classroom use less painful when something goes wrong.

**Work items**

1. **Consistent error handling**
    
    - From Model (`error` field in `OpStep`):
        
        - UI must display a clear message in Explain panel or form area.
            
    - From Session/Renderer/Playback:
        
        - Wrap controller methods with `try/catch` and log errors via a small logging util.
            
2. **Debug tools**
    
    - Extend the **debug panel** from Phase 3/5:
        
        - Show:
            
            - Current `TimelineState` summary.
                
            - Current `PlaybackState`.
                
            - Current `ViewState` node/edge counts.
                
        - Provide “Export state as JSON” button (useful for bug reports or regression tests).
            
3. **No-hard-crash policy**
    
    - Any unexpected exception in core logic should:
        
        - Not break the whole app.
            
        - Show a simple fallback message (“Something went wrong; see console/log”).
            
        - Keep app responsive (user can reload demo, etc.).
            

**Acceptance criteria**

- Invalid operations produce controlled errors, not crashes.
    
- A developer can reproduce and debug issues using exported JSON and debug panel.
    
- At least one test asserts that an invalid operation yields `OpStep.error` and stable UI behavior.
    

---

## 6.8 Phase 6 Done-ness Checklist

You can call Phase 6 “done” when:

-  Model:
    
    -  ≥ 90% coverage, including property-based tests for the core structures.
        
    -  All REQUEST examples are tests, not just manual demos.
        
-  Renderer/Layout:
    
    -  Unit tests for all `VizEvent` handlers and layout behaviors.
        
    -  Idempotence tested for key events.
        
-  Timeline/Session/Playback:
    
    -  Pure functions thoroughly tested (timeline).
        
    -  Session+Playback integration tested for core scenarios.
        
-  Persistence/DSL:
    
    -  Export→import round-trip tests pass for sample projects (including layout/pinned flags).
        
    -  DSL compile+execute path covered in unit/integration tests (NL remains optional/stubbed unless enabled).
        
-  UI/E2E:
    
    -  At least 2–3 happy-path E2E flows (list, BST, Huffman).
        
    -  At least one error-path E2E (invalid operation).
        
-  Performance:
    
    -  Manual or scripted measurement for typical scenarios with acceptable latencies.
        
    -  No obvious perf regressions discovered in dev tools.
        
-  Error handling:
    
    -  Errors surface as messages, not crashes.
        
    -  Debug panel or state export exists.

**Commands to run**

- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm --filter web test -- viz`
- `pnpm --filter web test -- core`
