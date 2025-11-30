# LT-Vis Dev Environment Playbook

> Compact, copy-pasteable commands and checks for getting a working
> LT-Vis dev environment. This extends the overview in
> [`AGENTS.md`](../../AGENTS.md).

---

## 1. First-Time Setup

Run these from the repo root (`lt-vis/`).

### 1.1 Install toolchain (Node + pnpm via Volta)

```bash
# Install Volta (once per machine)
curl https://get.volta.sh | bash

# Open a new shell, then pin tools
volta install node@latest
volta install pnpm
```

Verify:

```bash
node -v
pnpm -v
```

### 1.2 Install dependencies

```bash
# From repo root
pnpm install
```

If `pnpm` is not found, re-open your shell so Volta is on `PATH`.

---

## 2. Everyday Commands

From the repo root:

```bash
# Build all packages/apps (once they exist)
pnpm build

# Run dev server (apps/web)
pnpm dev

# Run all unit tests
pnpm test

# Run E2E tests (Playwright or similar)
pnpm test:e2e

# Lint & format
pnpm lint
pnpm format        # or: pnpm lint:fix

# Storybook / docs (if configured)
pnpm storybook     # or: pnpm docs:dev
```

Always prefer the exact scripts defined in `package.json` over guessing.

---

## 3. Targeted Testing Patterns

Once packages exist (`packages/shared`, `packages/model-ts`, `apps/web`),
use these patterns to narrow test runs.

### 3.1 Model-layer only (structures, OpStep/VizEvent)

Examples (subject to actual script names):

```bash
# Run only model tests (if a dedicated script exists)
pnpm test:model

# Or use a workspace filter (pnpm -r)
pnpm -r --filter @ltvis/model test

# Run a single test file via Vitest directly
pnpm vitest packages/model-ts/**/*.test.ts
```

### 3.2 Shared types only

```bash
# Type / contract tests for packages/shared
pnpm -r --filter @ltvis/shared test
```

### 3.3 Web / UI only

```bash
# Unit/integration tests scoped to apps/web
pnpm -r --filter @ltvis/web test

# Single-browser E2E run
pnpm test:e2e -- --project=chromium
```

If these scripts do not exist yet, propose adding small, explicit scripts
in `package.json` instead of inventing ad-hoc commands.

---

## 4. Common Errors & Quick Fixes

### 4.1 `pnpm: command not found`

- Ensure Volta is installed and on `PATH`.
- Open a new shell or source your shell rc file.
- Re-run:

  ```bash
  volta install pnpm
  ```

### 4.2 Node version mismatch

Symptoms:
- Tooling complains about unsupported Node version.

Fix:

```bash
volta install node@latest
# Or a specific version once the project pins it
# volta install node@20.x
```

### 4.3 Type errors or failing tests after pull

Symptoms:
- `pnpm test` or `pnpm build` fails immediately after `git pull`.

Checklist:

```bash
# 1. Refresh deps
pnpm install

# 2. Run lint + tests explicitly
pnpm lint
pnpm test
```

If failures persist:
- Check recent changes (`git status`, `git diff`).
- Capture failing test names and errors.
- Log them in `tmp/dev-healthcheck.md` and, if you are an agent, propose a
  focused fix instead of skipping tests.

### 4.4 Playwright / browser errors

Symptoms:
- `pnpm test:e2e` fails due to missing browsers.

Fix (pattern, actual command may differ):

```bash
# Install browsers once
pnpm exec playwright install

# Re-run specific project
pnpm test:e2e -- --project=chromium
```

---

## 5. Recommended Local Workflow

1. **Sync and install**
   - `git pull`
   - `pnpm install`
2. **Quick health check**
   - `pnpm lint`
   - `pnpm test` (or a narrower scope when iterating)
3. **Make changes**
   - Keep diffs small and scoped.
   - Use `git status` and `git diff` to review.
4. **Validate**
   - Re-run relevant tests and/or `pnpm build`.
5. **Document**
   - Update `CONTEXT/` or `tmp/` as needed when behavior or expectations
     change.

This playbook is intentionally brief; for higher-level guidance, see
[`AGENTS.md`](../../AGENTS.md) and [`CONTEXT/README.md`](../README.md).
