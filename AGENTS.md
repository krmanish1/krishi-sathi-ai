# AGENTS.md — Rules for AI coding agents

This file is read by Cursor, Claude, and similar tools before making changes. Follow it in addition to [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`README.md`](./README.md).

## First principles

1. **Respect the layering.** Screens in `app/` stay thin. Domain lives in `src/features/<name>/`. Cross-cutting code lives in `src/shared/*`. Dependencies flow **downward only**.
2. **Import from the barrel** (`@/features/<name>`, `@/shared/<area>`). Reach into internals only when there is a clear reason; never to work around a missing export.
3. **No file moves without a plan.** Structural refactors go in their own PR and must keep `tsc`, `lint`, `test`, and `expo export -p web` green.
4. **Platform files are sacred.** `*.web.ts` and `*.native.ts` exist to keep the web bundle free of native-only modules. Don't import `expo-sqlite`, `expo-secure-store`, or similar from shared/default files.
5. **Tests are part of the change.** If you touch domain logic, add or update a test in the same change.
6. **Never commit unless the user asks.** Stage, summarize, then wait.

## Where to put new code

| Adding…                                 | Destination                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| Route / screen                          | `app/...` (thin — delegate to a hook in `@/features/*`)         |
| Domain hook / store / repo              | `src/features/<name>/`                                          |
| Reusable UI primitive                   | `src/shared/ui/primitives/`                                     |
| API endpoint or type shared by features | `src/shared/api/`                                               |
| Cross-cutting provider                  | `src/shared/providers/`                                         |
| New locale string                       | `src/shared/i18n/locales/en.json` + `hi.json` (parity required) |
| Platform-only impl                      | Same basename with `.web.ts` / `.native.ts` next to the default |

## Grow rule for feature folders

Keep flat until it earns structure:

- Split into `components/` only when a feature owns >0 components.
- Split into `hooks/` only when a feature has >3 hooks.
- Split into `api/` only when the feature owns its own endpoint module.
- Each feature has an `index.ts` that **exports the feature's public API** — keep it tight.

## Quality gates (run before claiming done)

```bash
npm run lint
npm run typecheck
npm test
```

For web-impacting changes, additionally:

```bash
npx expo export -p web --output-dir /tmp/web-verify
```

## Things AI agents commonly get wrong here

- **Importing `uuid`** — use `@/shared/utils/uuid` which wraps `expo-crypto`.
- **Importing `expo-sqlite` or `expo-secure-store` directly** — use `@/shared/storage` facades.
- **Relying on NetInfo on web** — use `@/shared/network/useConnectivity` (the web impl already trusts `navigator.onLine`).
- **Hardcoding strings** — use `t("key")` with matching entries in both locale files.
- **Creating files outside the structure** — a loose `components/` at the repo root is not acceptable; put UI in `src/shared/ui/primitives/` or inside a feature's `components/` subfolder.
- **Over-bucketing** — don't create empty `api/`, `components/`, `hooks/`, `types/` folders "just in case." Follow the grow rule.

## Definition of done for an agent task

A change is done when:

1. Code is in the correct layer, imported through barrels.
2. i18n is updated in both languages (if user-facing strings changed).
3. `lint`, `typecheck`, `test` pass.
4. If web can run the change, it's verified with `expo export -p web`.
5. A short summary is written for the human: what changed, where, and why.

Do not commit or push without explicit approval.
