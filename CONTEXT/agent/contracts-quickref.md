# LT-Vis Agent Contracts Quickref

Use this as a checklist of mandatory contracts/dependencies before writing or reviewing patches. Do not diverge from the canonical files linked below.

## Canonical Sources (load first)
- Requirements/Design: `CONTEXT/domain/request.md`, `CONTEXT/domain/design.md`
- Roadmap: `CONTEXT/domain/roadmap/roadmap-overview.md` (+ phase files; DSL spec is `phase9-dsl.alpha.md`, beta file is pointer only)
- Agents handbook: `AGENTS.md`
- Ports/Schema: `packages/shared/src/types.ts`, `packages/shared/src/types/project.ts` (ProjectJSON), `packages/shared/src/ports/persistence.ts`

## Shared Contracts (must stay in sync)
- Types: `ID`, `NodeState`, `EdgeState`, `StateSnapshot`, `VizEvent` (CreateNode/RemoveNode/Link/Unlink/Move/Highlight/Compare/Swap/Rotate/Rebalance/Tip), `OpStep` (events, explain?, snapshot?, error?), `Operation` (Create/Insert/Delete/Find/Traverse/Attach/Push/Pop/BuildHuffman; extend with AVL in Phase 8), `Structure` (kind, id, snapshot, resetFromSnapshot, apply).
- Snapshot policy: model should emit per-step snapshots; if any are missing, Session patches final step, marks entry `nonReversible`, and playback/UI must disable stepBack before that entry (replay is fallback only).
- Renderer: idempotent `applyEvent`; use helper `applyStep`/`applySteps`; renderer may expose `applyStep(step, idx)` for playback to call; ViewState IDs mirror shared IDs.
- Session/Timeline: timeline entries `{id, steps, label, opMeta.nonReversible}`; executeOperation appends entries (Create included) and enforces snapshot policy; playback supports play/pause/step/jump/speed; stepBack uses snapshots first, replay only if needed.
- Persistence: `ProjectJSON` schema in shared types; export/import preserves structures, timeline, layout/pinned, viewport, meta; hydrate via `resetFromSnapshot`; replay only when snapshots absent; non-reversible entries must disable stepBack pre-entry.
- DSL: canonical grammar/AST/semantics in `phase9-dsl.alpha.md`; targets are structure IDs only; TypeName list includes list-seq/list-linked/stack/bst/btree/huffman (extend for AVL in Phase 8); compile produces `Operation[]` (+ optional viz commands).
- AVL (Phase 8): extend Operation structure kind and `Rotate`/`Rebalance` event fields in shared types; update DSL/commands before model/UI work.

## Authority & Order
- Authority order: human-edited files → `CONTEXT/domain/` → `CONTEXT/agent/experts/` → `CONTEXT/agent/` → chat.
- Update shared types first, then model (`packages/model-ts`), then renderer/UI; keep REQUEST/DESIGN aligned.
- Persistence/NLP ports reuse shared `ProjectJSON`; avoid parallel schemas/names.

## Commands (may start as stubs)
- Root scripts expected: `dev`, `build`, `test`, `lint`, `test:e2e`, `coverage`, `test:viz`, `test:core`, `test:ui`, `test:nl`, `test:persistence`, `test:dsl`, `test:avl`, `docs:dev`, `docs:build`, `perf`. Stubs/no-ops acceptable early; wire real behavior in later phases.
