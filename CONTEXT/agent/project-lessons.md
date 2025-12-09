# LT-Vis Project Lessons & Guidance (for restart or handoff)

Use this as a high-level playbook if the project restarts or when onboarding. It’s independent of current progress and captures patterns, pitfalls, and conventions.

## Architecture & Contracts
- Strict separation: model emits logical topology and OpSteps; renderer/layout owns positioning/animation; UI consumes renderer state only. See `CONTEXT/agent/model-renderer-contract.md`.
- Shared contracts live in `packages/shared/src/types.ts` (Structure, Operation, OpStep, VizEvent, StateSnapshot, ProjectJSON). Do not add UI concerns to model contracts.
- Create-before-ops: every structure must be created before other ops; demos/commands should ensure this.
- IDs: structure-prefixed node IDs; edge IDs `src->dst[:label]`.

## Model Layer (packages/model-ts)
- Snapshots: topology only (id, value/label, props, edges, meta); no x/y for non-pinned nodes.
- OpSteps: logical events (Highlight/Compare/Link/Unlink/Create/Remove/Tip/Rotate/Rebalance/Error) with per-step snapshots; errors include current snapshot and do not mutate state.
- Operations: multi-step sequencing for insert/delete/traverse/find/build; duplicate/missing-key errors must leave state unchanged.
- Tests: cover traversal orders, delete cases, duplicates, missing keys, resetFromSnapshot round-trips, and per-step snapshots.

## Renderer/Layout (apps/web/src/viz)
- Recompute layout after each step from topology; ignore snapshot coords for non-pinned nodes.
- LayoutLinear: position by index/order with safe spacing; no overlap.
- LayoutTree: width-aware spacing (Reingold–Tilford–like) to avoid overlap; configurable layer/sibling gaps; honor pinned nodes.
- Animation: renderer handles tweening of Move/links/highlights; provide instant mode for tests; idempotent applyEvent/applyStep.

## Timeline/Session/Playback (apps/web/src/core)
- Timeline helpers are pure; manage append/flatten/step/jump with currentStepIndex/totalSteps.
- Session executes ops via model, enforces per-step snapshots, appends timeline entries; errors should not advance renderer state.
- Playback consumes flattened steps, keeps indices in sync, supports play/pause/step/jump/speed; snapshot-first stepBack, replay fallback.
- Commands: route all UI actions through Session/Playback; demos use real Operation sequences (include Create).

## UI
- Keep core logic React-free; UI renders renderer ViewState only.
- Surface errors without mutating renderer/timeline; provide reset for session/renderer/timeline.
- Playback controls should update view during play; index display should reflect timeline.

## Persistence
- ProjectJSON in shared types/ports is the single persistence contract; export/import must preserve structures, timeline, layout/pinned, viewport, meta.

## Common Pitfalls
- Mixing layout coords into model snapshots causes overlap; avoid.
- Bypassing timeline/playback leads to desyncs and skipped animations.
- Sparse OpSteps or missing per-step snapshots break stepBack/playback.
- Missing Create before ops yields “structure not found” errors (e.g., Huffman demos).

## Working Practice
- Always consult `AGENTS.md`, `CONTEXT/domain/request.md`, `design.md`, and the current roadmap phase before changes.
- Update docs/prompts when contracts change (especially model/renderer separation).
- Keep tests green; add tests when changing step sequencing or layout defaults.
