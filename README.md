# LT-Vis (Scaffold)

Linear & Tree Data Structure Visualizer (LT-Vis) monorepo scaffold. This repo will grow into the visualization tool described in `CONTEXT/domain/request.md` and `CONTEXT/domain/design.md`.

## Layout
- `packages/shared/` — shared TypeScript contracts (Structure, Operation, OpStep, VizEvent, StateSnapshot, ProjectJSON, ports).
- `packages/model-ts/` — model-layer implementations (stubbed).
- `apps/web/` — React/Vite UI and renderer (stubbed).
- `examples/` — example operations/fixtures (stubbed).
- `CONTEXT/` — canonical docs (requirements, design, roadmap, agents).

## Getting Started
```bash
pnpm install
pnpm lint      # typecheck all packages
pnpm test      # stubbed vitest runs
```

## CI
GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint (typecheck) and tests on push/PR.

## Notes
- Scripts are currently stubs; see `CONTEXT/domain/roadmap/` for implementation phases.
- Use `CONTEXT/agent/contracts-quickref.md` and `AGENTS.md` for mandatory contracts and agent workflow.*** End Patch
