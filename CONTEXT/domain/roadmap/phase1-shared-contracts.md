# Phase 1 – Shared Contracts & Requirements (Quick Guide)

Goal: lock shared types and examples so Model/Renderer/UI can implement against stable contracts.

Checklist
- Re-read REQUEST.md §8 and DESIGN.md core contracts.
- Implement `packages/shared/src/types.ts` with: `ID`, `NodeState`, `EdgeState`, `StateSnapshot`, `VizEvent` union, `OpStep`, `Operation`, `Structure` interface (including `resetFromSnapshot(snapshot: StateSnapshot)` to support persistence/import), error types. Operation union must include `Create/Insert/Delete/Find/Traverse/Attach/Push/Pop/BuildHuffman` (add `AVL`/rotation fields later in Phase 8 when enabled).
- Document invariants in comments: ID format, event idempotence, error OpStep rules, snapshot semantics.
- Clarify Operation conventions: `Create` uses `id` + `structure`; all other ops use `target: StructureID`. Note future structure kinds (e.g., `AVL`) will extend the union when Phase 8 starts. When new contract fields are added (e.g., `Rotate`/`Rebalance` VizEvents or new Operation variants), update REQUEST/DESIGN to match.
- Add examples:
  - `examples/linkedList_insert_example.ts` ([1,3,4] insert 2 at index 1)
  - `examples/bst_delete_example.ts` (build [5,3,7,2,4,6,8], delete 7)
- Wire `examples/types.ts` to import shared types.
- Ensure script coverage: `pnpm --filter shared test`, `pnpm --filter examples test` (or equivalent alias in package.json).

Commands
- `pnpm --filter shared test`
- `pnpm --filter examples test`

Acceptance
- Types sufficient for a developer to build a replay pipeline in 1–2 pages.
- Schema check validates examples against shared types.
- Examples instantiate valid `OpStep[]`/`VizEvent[]` per contracts.
