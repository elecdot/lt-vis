# Phase 0 – Repo & Monorepo Scaffolding (Quick Guide)

Goal: get a runnable monorepo with scripts aligned to the roadmap.

Checklist
- Install pnpm + Node 20.
- Scaffold dirs: `apps/web`, `packages/shared`, `packages/model-ts`, `examples` (add `packages/lang-dsl` and `docs/` when those phases start).
- Add workspace config (pnpm-workspace.yaml), root tsconfig base, path aliases (note future additions: `packages/lang-dsl`, `docs/` when those phases start).
- Set up lint/format/test: ESLint, Prettier, Vitest smoke test per package.
- Add script stubs in `package.json`: `dev`, `build`, `test`, `lint`, `test:e2e`, `coverage`, scoped tests (`test:viz`, `test:core`, `test:ui`, `test:nl`, `test:persistence`, `test:dsl`, `test:avl`), docs (`docs:dev`, `docs:build`), `perf` (runs `apps/web/scripts/perf.ts`). Stubs may be no-ops early (e.g., `true`/`echo "TODO"`) so phases are unblocked until real commands exist.
- Optionally add `test:all` alias (`pnpm lint && pnpm test && pnpm test:e2e`) so later phases can reference a single command.
- Create `packages/shared/src/types.ts` draft matching REQUEST §8.1.
- Add minimal `examples/linked_list_skeleton.ts` using shared types.

Commands
- `pnpm install`
- `pnpm test`
- `pnpm --filter web dev` (smoke-check)

Acceptance
- Fresh clone → `pnpm i` → `pnpm test` succeeds.
- Shared types import cleanly in `packages/model-ts` and `apps/web` (no circular deps).
- All roadmap commands have scripts/aliases in `package.json` and run (even as stubs/no-ops until later phases wire real behavior).
