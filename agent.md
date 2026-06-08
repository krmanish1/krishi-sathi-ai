# agent.md — Context and Guidelines for AI Coding Assistants

This document serves as the source of truth and context for AI coding agents (such as Gemini, Claude, Cursor, and others) working on the **Krishi AI Saathi** codebase.

---

## 📖 Project Overview

**Krishi AI Saathi** is a production-grade, offline-first mobile and web application built using **Expo SDK 55**. It is designed to assist farmers with mandi prices, crop planning, weather forecasts, and chatbot queries.

- **Target Platforms**: Android (native client with Gemma integration), iOS, and Web (React Native Web).
- **Core Feature Areas**:
  - **Local Gemma LLM**: Direct on-device inference via local Gemma C++ wrapper (`modules/gemma-llm`) for offline assistance.
  - **Mandi Price Analysis**: Farmer-oriented marketplace pricing information.
  - **Digital Twin**: Local cache and synchronization representing the farmer's land, crops, and status.
  - **Weather & Alert Service**: Smart notifications for local weather changes.
  - **Multilingual Support**: Dual-language parity in **English** and **Hindi** (en/hi).

---

## 🛠️ Technology Stack

| Component | Choice | Details |
| :--- | :--- | :--- |
| **Framework** | Expo SDK 55 | React 19.2.0, React Native 0.83.6, Expo Router ~55.0.14 |
| **Styling** | NativeWind 4 | Tailwind 3-compatible React Native styling + `global.css` |
| **Data Fetching** | TanStack Query v5 | Server state caching and queries |
| **Client State** | Zustand | Feature-scoped, lightweight stores |
| **Localization** | i18next | Dual-language keys under `src/shared/i18n/` |
| **On-device Storage** | SQLite / MMKV / SecureStore | `expo-sqlite` & `expo-secure-store` with web fallbacks |
| **Intents / Routing** | On-device vs Cloud | `askAgent` routes to local Gemma LLM or falls back to backend API |

---

## 📐 Architecture & Layering

We follow a strict **Feature-Sliced Design (FSD)** architecture. Dependencies **must flow downward only**:

```
[app/ (Thin Router)]
       │
       ▼
[src/features/ (Domain Slices)]
       │
       ▼
[src/shared/ (Cross-cutting Kernel)]
```

### 1. `app/` (Expo Router Screens)
- Keep route screens **extremely thin**.
- No business logic or state manipulation. Delegate all operations to custom hooks defined in `src/features/<name>/`.

### 2. `src/features/` (Domain-specific Slices)
- Slices: `chat`, `mandi`, `onboarding`, `twin`, `weather`, `voice`, `auth`, `user`.
- **Grow Rule**: Do not create empty folders speculatively.
  - Split into a `components/` subfolder only when the feature owns components.
  - Split into a `hooks/` subfolder only when the feature has $>3$ hooks.
  - Split into an `api/` subfolder only when it has its own endpoint module.
  - Every feature must have a clean `index.ts` barrel export defining its public API.

### 3. `src/shared/` (Cross-cutting Kernel)
- Reusable UI primitives (`src/shared/ui/primitives/`), theme configurations, api client, auth providers, storage interfaces, utilities, and localization files.

---

## 🔗 Import & Path Aliases

Always import from **barrel files** (`index.ts`) instead of internal nested paths to preserve clean layering.

| Alias | Target Directory |
| :--- | :--- |
| `@/app/*` | `app/*` |
| `@/features/*` | `src/features/*` |
| `@/shared/*` | `src/shared/*` |
| `@/modules/*` | `modules/*` |

*Example:*
```ts
// Do:
import { useSendChatMessage } from "@/features/chat";
import { Button } from "@/shared/ui/primitives";

// Do NOT:
import { useSendChatMessage } from "@/features/chat/hooks/useSendChatMessage";
import { Button } from "@/shared/ui/primitives/Button/Button";
```

---

## 📱 Platform-Specific Suffixes

Metro automatically resolves suffixes depending on the platform:
- `*.web.ts` — Web execution only.
- `*.native.ts` — Mobile execution only (Android + iOS).
- `*.ts` — Default fallback, used by unit tests and general routines.

> [!WARNING]
> Never import native-only libraries (e.g., `expo-sqlite`, `expo-secure-store`, `@react-native-community/netinfo`) in default or shared files. Use the facades in `@/shared/storage` and `@/shared/network/useConnectivity`.

---

## 🌍 Internationalization (i18n)

Every user-facing string must be translated.
- Languages: **English** (`src/shared/i18n/locales/en.json`) and **Hindi** (`src/shared/i18n/locales/hi.json`).
- Parity is strictly enforced by the unit test: `src/shared/i18n/localeKeys.test.ts`.

---

## 🚨 Common AI Pitfalls & Rules

- **UUIDs**: Use the wrapper `@/shared/utils/uuid` (which wraps `expo-crypto`) instead of importing external packages.
- **Storage**: Never import `expo-sqlite` or `expo-secure-store` directly; use `@/shared/storage` facades.
- **Connectivity**: Use `@/shared/network/useConnectivity` instead of NetInfo.
- **Component Placement**: Do not create a top-level `components/` folder at the repo root. UI elements go to `src/shared/ui/primitives/` or a feature's internal components.
- **Commits**: **Never commit unless the user explicitly asks.** Stage changes, write a summary, then wait for human approval.

---

## 🛠️ CLI Development Commands

Run these scripts from the root directory:

```bash
# Start the Expo Dev Server (Web/iOS/Android)
npm start

# Run iOS/Android development builds
npm run ios
npm run android

# Start web client directly
npm run web

# Quality Gates (must pass before completing a task)
npm run lint
npm run typecheck
npm test

# Verify Web Bundle Export
npx expo export -p web --output-dir /tmp/web-verify
```
