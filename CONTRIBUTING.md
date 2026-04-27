# Contributing

Thanks for working on Krishi AI Saathi. This doc is the short version; the architecture, folder layout, and per-folder conventions live in the main [`README.md`](./README.md).

## Setup

```bash
cp .env.example .env
npm install
npm start          # a = Android, i = iOS, w = web
```

See the README's "Getting started" for native builds (Android prebuild, Gemma dev client, etc.).

## Branching

- `main` is protected; open PRs from short-lived branches.
- Branch names: `feat/<area>-<short>`, `fix/<area>-<short>`, `chore/<short>`, `docs/<short>`.
  - Examples: `feat/chat-low-confidence-cta`, `fix/web-netinfo-offline`.

## Commits

- Follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`.
- Types we use: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.
- Subject in imperative, lowercase, no trailing period. Examples:
  - `feat(chat): add low-confidence escalation CTA`
  - `fix(web): use navigator.onLine for connectivity`

## Code placement

Follow the **Conventions** table in the README — it's the single source of truth. Short version:

- **New screen / route** → `app/`
- **Domain hook, store, or repo** → `src/features/<name>/`
- **Cross-feature UI** → `src/shared/ui/primitives/`
- **Cross-feature infra** (API, storage, i18n, providers) → `src/shared/*`
- **Platform-only code** → `*.web.ts` / `*.native.ts` next to the default file

### Public API rule

Screens and cross-feature code import from the **barrel**:

```ts
// good
import { useSendChatMessage } from "@/features/chat";
import { Button } from "@/shared/ui/primitives";

// avoid (reaching into internals) unless you have a real reason
import { useSendChatMessage } from "@/features/chat/useSendQuery";
```

### Grow rule

Keep feature folders **flat** until they're doing too much:

- Add `components/` only when the feature owns >0 feature-scoped components.
- Add `hooks/` only when a feature has >3 hooks.
- Add `api/` only when a feature owns its own endpoint module.
- Split to subfolders as soon as a feature exceeds ~6 files; do it in a dedicated `refactor(...)` PR, never mixed with feature work.

## Before you open a PR

```bash
npm run format      # prettier
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # jest (unit + app projects)
```

CI runs the same commands. If your PR touches web, also sanity-check:

```bash
npx expo export -p web --output-dir /tmp/web-verify
```

## Testing

- Unit tests for logic live next to source as `*.test.ts` (run by `ts-jest`, no RN modules).
- Component/RN tests as `*.test.tsx` (run by `jest-expo`).
- Please add or update a test whenever you touch domain logic (hooks, repos, intent guesses, reducers).

## i18n

All user-facing copy goes through `react-i18next`. Add new keys to **both** `src/shared/i18n/locales/en.json` and `hi.json`. The parity test (`src/shared/i18n/localeKeys.test.ts`) will fail if structures diverge.

## Secrets and env

- Only variables prefixed with `EXPO_PUBLIC_` are allowed in client code.
- Never commit `.env` (it's git-ignored).
- Don't log tokens, headers, or PII in production.

## Platform-specific code

See "Platform-specific code" in the README. On web, do **not** import `expo-sqlite`, `expo-secure-store`, or other native-only modules directly; use the shared facades (`@/shared/storage`, `@/shared/network`).

## Accessibility

- Add `accessibilityRole` / `accessibilityLabel` to tappable elements.
- Ensure color contrast passes on the brand green and wheat surfaces.
- Keyboard navigation works on web (Tab/Enter activate `Pressable`).

## Reviews

- Keep PRs small and focused. Aim for < ~400 lines of diff when possible.
- Describe **why**, not just what. Link the issue or plan section.
- A reviewer approval + green CI is required to merge.
