---
name: krishi-sathi-ai-development
description: "Use when working on the Krishi AI Saathi codebase. Guides you on architecture, feature slices, path aliases, testing, and conventions."
metadata:
  author: Antigravity
  version: "1.0.0"
---

# Krishi AI Saathi Development Skill

This skill provides guidelines and context for developing, refactoring, and testing features within the Krishi AI Saathi workspace.

## Core Architecture

We follow a strict **Feature-Sliced Design (FSD)** architecture.

```
[app/ (Thin Router)]
       │
       ▼
[src/features/ (Domain Slices)]
       │
       ▼
[src/shared/ (Cross-cutting Kernel)]
```

### Layering Constraints
1. **`app/`**: Thin routes and screens only. Business logic or data hooks must be delegated to `src/features/<name>`.
2. **`src/features/`**: Folders structured by product feature (e.g., `chat`, `mandi`, `onboarding`, `twin`, `weather`, `voice`, `auth`, `user`).
   - Slices must remain flat until they exceed 3 hooks or 0 components.
   - Slices must expose their public API via a barrel `index.ts`.
3. **`src/shared/`**: Reusable elements like UI primitives, storage facades, API client, auth helpers, i18n, utilities, and theme tokens.

---

## Technical Guidelines

### 1. Platform-Specific Implementations
- Native packages (`expo-sqlite`, `expo-secure-store`, `@react-native-community/netinfo`) must **never** be imported directly into shared or default files.
- Use platform suffixes (e.g., `.web.ts`, `.native.ts`) to isolate platform dependencies, and consume them via the unified interfaces under `src/shared/storage/` or `src/shared/network/`.

### 2. Localization & i18n
- All user-facing strings must be localized.
- Maintain parity between English (`src/shared/i18n/locales/en.json`) and Hindi (`src/shared/i18n/locales/hi.json`).
- Verify translations via `npm test` or specifically:
  ```bash
  npx jest src/shared/i18n/localeKeys.test.ts
  ```

### 3. Common Development Pitfalls
- **UUIDs**: Use the wrapper `@/shared/utils/uuid` (which wraps `expo-crypto`) instead of external `uuid` packages.
- **Root-level Components**: Avoid creating loose components at the root directory level. Custom components must reside inside a feature or under `src/shared/ui/primitives/`.
- **Zustand Stores**: Keep stores small and feature-scoped rather than building one large global store.

---

## CLI Development Workflow

### Quality Gate Commands
Always run these checks before marking a task as complete:
```bash
# Run linting
npm run lint

# Run type check
npm run typecheck

# Run tests
npm test

# Verify Web Bundle compilation
npx expo export -p web --output-dir /tmp/web-verify
```
