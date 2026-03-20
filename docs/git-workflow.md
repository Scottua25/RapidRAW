# Git Workflow

This fork works best with a simple two-lane branch model:

- `main`: stable branch, kept close to `upstream/main` plus the long-term fork features we want to carry
- `feature/...`: focused work we expect to keep
- `lab/...`: experiments and risky ideas that should not destabilize `main`
- `sync/...`: temporary upstream-integration branches
- `backup/...`: recovery points before large merges or rebases

## Daily flow

1. Start from a clean `main`.
2. Create a topic branch for each change.
3. Keep the branch scoped to one concern.
4. Merge back into `main` only after it builds and typechecks cleanly.

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feature/my-change
```

## Before merging

Run the checks that keep local work sane without forcing repo-wide cleanup:

```bash
npx tsc --noEmit
npm run build
npm run lint:changed
```

If Rust code changed, also run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## Syncing upstream

Keep upstream sync work isolated so it is easy to reason about:

```bash
git checkout main
git fetch upstream
git checkout -b sync/upstream-vX.Y.Z
git merge --ff-only upstream/main
```

If the sync looks good, fast-forward `main` to that result.

## Branch naming

- `feature/before-after-split-view`
- `feature/collections-followups`
- `lab/tonemapper-v2`
- `sync/upstream-v1.5.3`
- `backup/pre-sync-2026-03-20`

## Rules of thumb

- Do not do exploratory work directly on `main`.
- Avoid mixing refactors with feature work unless the refactor is required.
- Keep experiments on `lab/...` branches until they prove themselves.
- Prefer smaller, understandable merges over long-lived stacked branches.
