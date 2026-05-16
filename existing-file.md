# KrishiSaathi AI — Existing File Functionality Inventory

> Generated for migration reference. Do not delete.

## Root Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Project manifest. Entry: `expo-router/entry`. Dependencies: Expo 55, React 19, NativeWind, TanStack Query, Zustand, Supabase, expo-router, i18next, lucide-react, motion, shadcn. |
| `app.config.ts` | Expo config. App name "KrishiSaathi AI", slug `krishi-sathi-ai`, dark UI theme, Android package `ai.krishisaathi.app`. Plugins: expo-router, expo-localization, expo-secure-store, expo-image-picker, expo-location. Extra: API base URL, Native Gemma toggle, Supabase creds, Google OAuth. |
| `tsconfig.json` | Extends `expo/tsconfig.base`. Strict mode. Path aliases: `@/app/*`, `@/features/*`, `@/shared/*`, `@/modules/*`. |
| `babel.config.js` | Babel config with `babel-preset-expo`, NativeWind plugin, `babel-plugin-module-resolver` for path aliases. |
| `metro.config.js` | Metro bundler with NativeWind. Includes `findExpoProjectRoot()` for Gradle cwd issues. |
| `tailwind.config.js` | Spotify-inspired dark theme: page `#121212`, card `#181818`, brand green `#1ed760`. Custom fonts, shadows, border radius. |
| `jest.config.js` | Two Jest projects: `unit-ts` (pure TS with `ts-jest` in Node) and `app` (TSX/JSX with `jest-expo`). Path alias mapping. |
| `eslint.config.js` | ESLint 9 flat config wrapping `eslint-config-expo`. |
| `global.css` | Tailwind directives: `@tailwind base/components/utilities`. |
| `nativewind-env.d.ts` | TypeScript reference for NativeWind types. |
| `.env.example` | Template for env vars: API base URL, Supabase URL/key, Google OAuth client IDs, Native Gemma toggle. |
| `eas.json` | Expo Application Services config. Development/preview/production builds targeting Android APK. |
| `components.json` | shadcn/ui config (radix-nova style, Tailwind, lucide icons). |
| `polyfills.js` | Empty fallback for platform-agnostic bundler. |
| `polyfills.native.js` | Polyfills `structuredClone`, `TextEncoderStream`, `TextDecoderStream` for React Native. |
| `polyfills.web.js` | Empty — web provides all needed APIs natively. |
| `feature_list.json` | Structured feature inventory for AI agents. |

---

## Entry Point & Routing (`app/`)

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | **Root layout**. Wraps everything in `RootProviders` (TanStack Query, i18n, Auth, Connectivity, fonts, DB init). Renders `expo-router Stack` with no headers and dark background. |
| `app/index.tsx` | **Splash/entry screen**. Waits for auth readiness, rehydrates onboarding state, routes to: `/(auth)/login` (no session), `/(tabs)/home` (signed in + onboarded), or `/(onboarding)/welcome` (signed in + not onboarded). |
| `app/auth-callback.tsx` | **OAuth callback handler**. Handles PKCE flow for Supabase auth. Parses URL params, creates session via `createSessionFromAuthUrl`, redirects to home. |

### Auth Screens `app/(auth)/`

| File | Purpose |
|------|---------|
| `_layout.tsx` | Stack layout for auth screens (headers hidden, dark background). |
| `login.tsx` | Login screen with email/password form. Uses `AuthScreenLayout`, calls `signInWithEmail`, links to signup. |
| `signup.tsx` | Signup screen with name/email/password form. Uses `AuthScreenLayout`, calls `signUpWithEmail`, links to login. |

### Onboarding Screens `app/(onboarding)/`

| File | Purpose |
|------|---------|
| `_layout.tsx` | Stack layout for onboarding screens. |
| `welcome.tsx` | Welcome/intro screen. App name "Krishi AI Saathi", tagline, tractor icon, feature badges. |
| `language.tsx` | Language selection (Hindi/English). Updates Zustand store and i18n on selection. |
| `location.tsx` | Farm details form: farmer name, state, district, village, land size, soil type, crops, GPS. |
| `model-download.tsx` | Downloads on-device Gemma LLM model. Shows progress bar. Checks WiFi. |
| `done.tsx` | Onboarding completion. Sets `hasCompletedOnboarding=true`, flushes storage, syncs twin. |

### Tab Screens `app/(tabs)/`

| File | Purpose |
|------|---------|
| `_layout.tsx` | **Tab navigator**. 5 tabs: Home, Chats, New Chat, Mandi, Profile + hidden Chat tab. Custom `KrishiTabBar`. MaterialCommunityIcons. |
| `home.tsx` | **Home/dashboard**. Greeting, weather card, mandi prices, quick action buttons, expert advice card, sowing CTA. Supports online/offline modes. FAB mic button. |
| `chats.tsx` | **Chat sessions list**. FlatList of past conversations sorted by `updated_at`. Pull-to-refresh, delete confirmation. |
| `new-chat.tsx` | **New chat creator**. Creates a backend session, redirects to hidden chat screen. |
| `chat.tsx` | **Individual chat**. Full messaging UI: message bubbles, Markdown, image attachment, streaming, typing indicator, voice input, text-to-speech. |
| `mandi.tsx` | **Mandi prices**. FlatList of commodity prices from local sync bundle. Pull-to-refresh and initial sync. |
| `profile.tsx` | **Profile/settings**. Editable farm details, language toggle, app version, privacy policy, sign out. |

### Standalone Screens

| File | Purpose |
|------|---------|
| `app/scan.tsx` | **Crop image scanner**. Camera/gallery image picker, resize to 1024px JPEG, upload via `POST /api/v1/query/image` with purpose `crop_disease`, sends to chat. |

---

## Feature Modules (`src/features/`)

### `src/features/auth/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: exports `AuthScreenLayout`, `authFormStyles`, `useRedirectWhenAuthed`. |
| `authFormStyles.ts` | Shared style sheet for auth form elements. |
| `AuthScreenLayout.tsx` | Shared auth screen shell: dark gradient, orbital glow rings, tractor icon, headline/subtitle. |
| `useRedirectWhenAuthed.ts` | Hook that redirects authenticated users away from auth screens. |

### `src/features/chat/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: exports ~20 items. |
| `chatMessagesRepo.ts` | SQLite-based chat message repository: `appendMessage`, `clearThread`, `listThreadMessages`. |
| `chatStore.ts` | Zustand store for chat state: `conversationId`, `isCreatingConversation`. |
| `chatLocalCacheMigration.ts` | Migration for local chat cache schema. |
| `chatResumeSnap.ts` (+ `.native.ts`, `.web.ts`) | Platform-specific snapshot/restore for chat state on resume. |
| `formatStagePayload.ts` | Parses streaming stage payloads into UI data. |
| `guessDeviceIntent.ts` | Analyzes user text to determine intent (crop_disease, weather, market_price, etc.). |
| `guessImagePurpose.ts` | Determines image purpose from text context. |
| `hydrateConversationHistory.ts` | Merges server conversation history into local SQLite thread. |
| `parseConversationHistory.ts` | Parses raw API conversation history. |
| `thinkingStages.ts` | Defines streaming thought stages and their icons/labels. |
| `useChatSessionActions.ts` | Hook: `startNewSession`, `openSession`, `deleteSession`. |
| `useChatThread.ts` | TanStack Query hook for fetching chat thread messages. |
| `useConversation.ts` | Bootstraps a conversation session on mount. |
| `useConversationHistory.ts` | Fetches conversation history from backend. |
| `useFarmerConversations.ts` | Lists all conversations for a farmer. |
| `useImageAttachment.ts` | Hook for image picking (gallery/camera), upload, preview. |
| `useSendQuery.ts` | Hook for sending offline chat queries (on-device Gemma). |
| `useStreamChatMessage.ts` | Hook for streaming online chat messages (backend SSE). |
| `components/StreamingStatusBox.tsx` | Displays streaming status: thinking steps, reasoning text, stage events. |

### `src/features/mandi/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: exports `MANDI_QUERY_KEY`, `useMandiFromBundle`, `MandiPriceRow`. |
| `mandiFromBundle.ts` | Reads mandi prices from local sync bundle via TanStack Query. |

### `src/features/onboarding/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: exports 8 items. |
| `store.ts` | Zustand store for all onboarding state. Persists to storage per user. |
| `onboardingStorage.ts` | AsyncStorage-based persistence for onboarding data. |
| `useInitialSync.ts` | Downloads initial sync bundle from backend. |
| `useLocation.ts` | GPS location detection using `expo-location`. |
| `useModelDownload.ts` | Downloads Gemma model file, checks WiFi. |
| `useSyncTwin.ts` | Syncs onboarding data to farmer twin on backend. |
| `components/OnboardingShell.tsx` | Shared onboarding layout: dark green gradient, soft glows, step progress bar. |

### `src/features/twin/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: exports twin hooks and utilities. |
| `displayName.ts` | Utilities: `greetingFirstName`, `resolveDisplayName`. |
| `twinCache.ts` | In-memory cache for farmer twin data. |
| `useDisplayName.ts` | Hook that resolves display name from twin. |
| `useFarmerTwin.ts` | TanStack Query hooks: `useFarmerTwin` (GET), `useUpdateFarmerTwin` (PUT). |

### `src/features/user/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `userStore.ts` | Zustand store for user state (maps auth + onboarding → user). |
| `UserStoreSyncer.tsx` | Component that syncs auth session + onboarding into user store. |

### `src/features/weather/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `useFarmerWeather.ts` | TanStack Query hook for fetching weather data. |
| `weatherDisplayFromReport.ts` | Transforms raw weather API response into display-ready labels. |

---

## Shared Modules (`src/shared/`)

### `src/shared/api/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: exports all API types, endpoints, errors, utilities. |
| `client.ts` | `apiFetch<T>`: generic API fetch wrapper with timeout, AbortSignal, error handling. |
| `endpoints.ts` | All backend API endpoint functions: postQuery, postQueryImage, getSyncBundle, getFarmerWeather, getFarmerTwin, putFarmerTwin, getFarmerConversations, postConversation, deleteFarmerConversation, getConversationHistory, postSyncPush, getHealth. |
| `types.ts` | All TypeScript types: QueryRequest, QueryResponse, ImageUploadResponse, SyncBundle, FarmerWeatherReport, FarmerTwin, Conversation, ErrorEnvelope, etc. |
| `errors.ts` | `ApiError` class, `parseErrorResponse`, `mapError`. |
| `routing.ts` | Core query routing: tries on-device Gemma for supported intents, falls back to backend. |
| `streamTransport.ts` | SSE streaming transport for AI SDK. |
| `krishiCompatChatTransport.ts` | Compatibility transport for legacy chat format. |
| `legacyUiStreamNormalize.ts` | Normalizes legacy stream format to current UI model. |
| `twinWire.ts` | Twin data normalization between API and local formats. |
| `apiStatus.tsx` | `ApiStatusProvider` + `useApiStatus`: pings `/health` with retry logic. |
| `ServerWakingBanner.tsx` | Banner shown while server is starting up. |

### `src/shared/auth/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: exports provider, hooks, anonymous ID. |
| `AuthProvider.tsx` | Auth context provider. Manages Supabase session, provides signInWithOAuth, signInWithEmail, signUpWithEmail, signOutSocial. Exports hooks: `useFarmerId`, `useAuthReady`, `useSupabaseSession`, `useSupabaseAuth`. |
| `anonymous.ts` | Anonymous farmer ID generation for offline-first usage. |
| `clerk.ts` | Placeholder for future Clerk migration. |

### `src/shared/config/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: exports constants, env, Language type. |
| `constants.ts` | Timeout values, `CONFIDENCE_THRESHOLD_LOW = 0.7`, supported languages. |
| `env.ts` | `getApiBaseUrl()` — retrieves API base URL from `expo-constants` extra. |

### `src/shared/i18n/`

| File | Purpose |
|------|---------|
| `index.ts` | Initializes i18next with `react-i18next`, auto-detects device language. |
| `localeKeys.test.ts` | Test enforcing key parity between `en.json` and `hi.json`. |
| `locales/en.json` | English translations (~290 keys). |
| `locales/hi.json` | Hindi translations (same keys). |

### `src/shared/network/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `ConnectivityProvider.ts` | Base provider. |
| `ConnectivityProvider.native.tsx` | Native impl using `@react-native-community/netinfo`. |
| `ConnectivityProvider.web.tsx` | Web impl using `navigator.onLine`. |
| `connectivityContext.ts` | React context + `useConnectivity` hook. |
| `mapNetInfoToConnectivity.ts` | Maps NetInfo state to Connectivity enum. |
| `NetworkBanner.tsx` | Banner shown when offline/degraded. |
| `subscribeNetInfoConnectivity.ts` | NetInfo subscription helper. |
| `useSyncOnResume.ts` | Triggers sync when connectivity transitions offline→online. |

### `src/shared/ondevice/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `gemma.ts` | `GemmaBackend` interface + `generate` function. |
| `mock.ts` | Mock Gemma backend for dev/testing. |
| `native-backend.ts` | Creates native backend using gemma-llm Expo module. |
| `modelState.ts` | Tracks model readiness state. |
| `onDeviceAgent.ts` | Full on-device agent: plans with tools, calls Gemma, synthesizes response. |
| `offlineFallback.ts` | Fallback response generation when offline. |
| `confidence.ts` | Confidence scoring utilities. |
| `prompts/planner.ts` | System prompt for planner LLM call. |
| `prompts/synthesizer.ts` | System prompt for synthesizer LLM call. |

### `src/shared/providers/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `RootProviders.tsx` | **Root provider composition**: GestureHandler, SafeArea, I18next, QueryClient, Connectivity, Auth, UserStoreSyncer, SyncOnResume, SyncPushScheduler, ApiStatus, StatusBar. Initializes DB, runs chat cache migration, sets up Gemma backend. |
| `SyncPushScheduler.tsx` | Schedules periodic sync push to backend. |

### `src/shared/storage/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `db.ts` | Base SQLite database interface. |
| `db.native.ts` | Native SQLite using `expo-sqlite`. |
| `db.web.ts` | Web SQLite implementation. |
| `db.types.ts` | Database table types. |
| `bundle.ts` | `saveBundle`, `loadBundleVersion`, `loadBundlePayload` — sync bundle in SQLite. |
| `secure.ts` | Base secure storage interface. |
| `secure.native.ts` | Native secure storage using `expo-secure-store`. |
| `secure.web.ts` | Web secure storage fallback. |
| `offlineData.ts` | Base offline data query interface. |
| `offlineData.native.ts` | Native offline data queries. |
| `offlineData.web.ts` | Web offline data queries. |
| `offlineDataNormalize.ts` | Normalizes offline data shapes. |

### `src/shared/supabase/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `client.ts` | Supabase client creation + configuration check. |
| `socialAuth.ts` | OAuth social auth: signInWithOAuthProvider, createSessionFromAuthUrl, signOutSocial. |
| `googleSignIn.web.ts` | Google sign-in (web): redirect-based OAuth. |
| `googleSignIn.native.ts` | Google sign-in (native): `@react-native-google-signin`. |
| `googleSignIn.d.ts` | Type declarations for Google sign-in. |
| `initAuthBrowser.ts` | Initializes Supabase auth browser dependencies. |

### `src/shared/ui/primitives/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `Button.tsx` | Reusable button with variants. |
| `Input.tsx` | Reusable text input. |
| `ListItem.tsx` | Reusable list item. |
| `KrishiTabBar.tsx` | Custom animated bottom tab bar with centered FAB button. |

### `src/shared/ui/theme/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `tokens.ts` | Design token constants (pageBg, surface, brand, ink, danger, etc.). |

### `src/shared/utils/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `guards.ts` | Type guard: `isNonEmptyString`. |
| `uuid.ts` | UUID generation wrapping `expo-crypto`. |

### `src/shared/voice/`

| File | Purpose |
|------|---------|
| `index.ts` | Barrel. |
| `voiceClient.ts` | Speech-to-text and text-to-speech via `expo-speech-recognition` and `expo-speech`. |
| `useVoice.ts` | React hook: `startListening`, `stopListening`, `speak`, `cancelSpeech`. |

---

## Native Modules (`modules/`)

| File | Purpose |
|------|---------|
| `modules/gemma-llm/package.json` | Expo module package for Gemma LLM native integration. |
| `modules/gemma-llm/src/index.ts` | Native module bridge: `loadModel`, `generateText`, `generateTextWithImage`, `cancelGeneration`. |
| `modules/gemma-llm/android/.../GemmaLlmModule.kt` | Kotlin implementation of Gemma LLM for Android. |

---

## Tests

| File | Purpose |
|------|---------|
| `src/productionInstallContract.test.ts` | Production install smoke test. |
| `src/features/chat/formatStagePayload.test.ts` | Tests for stage payload formatting. |
| `src/features/chat/guessDeviceIntent.test.ts` | Tests for device intent guessing. |
| `src/features/chat/guessImagePurpose.test.ts` | Tests for image purpose guessing. |
| `src/features/chat/hydrateConversationHistory.test.ts` | Tests for conversation history hydration. |
| `src/features/chat/parseConversationHistory.test.ts` | Tests for conversation history parsing. |
| `src/features/chat/thinkingStages.test.ts` | Tests for thinking stages. |
| `src/features/chat/useSendQuery.offline.e2e.test.tsx` | E2E offline test for send query. |
| `src/features/onboarding/onboardingRouting.test.ts` | Tests for onboarding routing. |
| `src/features/onboarding/onboardingStorage.test.ts` | Tests for onboarding storage. |
| `src/features/onboarding/useInitialSync.test.ts` | Tests for initial sync. |
| `src/features/onboarding/useLocation.test.ts` | Tests for location. |
| `src/features/onboarding/useSyncTwin.test.ts` | Tests for twin sync. |
| `src/features/twin/displayName.test.ts` | Tests for display name. |
| `src/features/weather/weatherDisplayFromReport.test.ts` | Tests for weather display. |
| `src/shared/api/apiStatus.test.tsx` | Tests for API status. |
| `src/shared/api/client.test.ts` | Tests for API client. |
| `src/shared/api/endpoints.test.ts` | Tests for API endpoints. |
| `src/shared/api/errors.test.ts` | Tests for API errors. |
| `src/shared/api/legacyUiStreamNormalize.test.ts` | Tests for legacy stream normalization. |
| `src/shared/api/routing.test.ts` | Tests for query routing. |
| `src/shared/api/twinWire.test.ts` | Tests for twin wire. |
| `src/shared/config/env.test.ts` | Tests for env config. |
| `src/shared/i18n/localeKeys.test.ts` | Tests for locale key parity. |
| `src/shared/network/mapNetInfoToConnectivity.test.ts` | Tests for connectivity mapping. |
| `src/shared/ondevice/gemma.test.ts` | Tests for Gemma backend. |
| `src/shared/supabase/socialAuth.test.ts` | Tests for social auth. |
| `src/shared/ui/primitives/Button.test.tsx` | Tests for Button component. |
| `src/shared/utils/guards.test.ts` | Tests for type guards. |
| `tests/**` | Various test files. |

---

## Navigation Architecture

The app uses **Expo Router** (file-based routing):

```
Root (_layout.tsx) — Stack
├── index.tsx                          → / (splash → redirect)
├── auth-callback.tsx                  → /auth-callback
├── scan.tsx                           → /scan
├── (auth)/                            → Auth Stack
│   ├── login.tsx                      → /(auth)/login
│   └── signup.tsx                     → /(auth)/signup
├── (onboarding)/                      → Onboarding Stack
│   ├── welcome.tsx                    → /(onboarding)/welcome
│   ├── language.tsx                   → /(onboarding)/language
│   ├── location.tsx                   → /(onboarding)/location
│   ├── model-download.tsx             → /(onboarding)/model-download
│   └── done.tsx                       → /(onboarding)/done
└── (tabs)/                            → Tab Navigator
    ├── home.tsx                       → Tab: Home
    ├── chats.tsx                      → Tab: Chats
    ├── new-chat.tsx                   → Tab: New Chat
    ├── mandi.tsx                      → Tab: Mandi Markets
    ├── profile.tsx                    → Tab: Profile
    └── chat.tsx                       → Hidden tab (href: null)
```

---

## State Management

| Tool | Purpose |
|------|---------|
| **Zustand** | Local UI state: onboarding (`src/features/onboarding/store.ts`), chat (`src/features/chat/chatStore.ts`), user (`src/features/user/userStore.ts`) |
| **TanStack Query** | Server state: weather, twin, conversations, mandi prices, API status |
| **React Context** | Auth (`src/shared/auth/AuthProvider.tsx`), Connectivity (`src/shared/network/connectivityContext.ts`) |

---

## Data Flow

```
User Action → Screen (app/) → Feature Hook (src/features/) → Shared API/Storage (src/shared/)
                                                                   ↓
                                                            Backend API (HuggingFace)
                                                            Supabase (Auth + DB)
                                                            Local SQLite
```

- **Offline-first**: On-device Gemma LLM for offline queries, SQLite local cache
- **Auth**: Supabase Auth with email/password and Google OAuth
- **Streaming**: AI SDK streaming via `streamTransport.ts`
- **Platform files**: `.native.ts` / `.web.ts` variants for storage, network, connectivity

---

## New Sarthico_v1-Style Files (Added During Restructure)

### `config/` — DI Container & Configuration

| File | Purpose |
|------|---------|
| `config.ts` | Environment vars (dev/staging/prod) mapped from `expo-constants` |
| `ioc.ts` | Inversify Container — binds all service interfaces to implementations in singleton scope |
| `types.ts` | DI token constants using `Symbol.for()` (matching sarthico_v1) |

### `constants/` — Theme & App Constants

| File | Purpose |
|------|---------|
| `Colors.ts` | Color palette from `src/shared/ui/theme/tokens.ts` |
| `Theme.ts` | Extended theme tokens (spacing, borderRadius, fontSize, fontFamily) |
| `Timeouts.ts` | API timeout values, confidence thresholds, supported languages |

### `types/` — TypeScript Definitions

| File | Purpose |
|------|---------|
| `RootStackParamList.ts` | Navigation param types for @react-navigation stacks |
| `api.ts` | Shared API types (Connectivity, DeviceIntent, ErrorCode, etc.) |
| `common.ts` | Utility type helpers (Nullable, DeepPartial, etc.) |

### `dtos/` — Data Transfer Objects

| File | Purpose |
|------|---------|
| `Response.ts` | Generic API response wrapper (`ApiResponse<T>`, `ApiErrorDto`) |
| `QueryRequestDto.ts` | Query request shape matching backend OpenAPI |
| `QueryResponseDto.ts` | Query response + image upload response shapes |
| `FarmerTwinDto.ts` | Farmer twin API shape |
| `WeatherDto.ts` | Weather current + forecast API shapes |
| `ConversationDto.ts` | Conversation + sync bundle API shapes |
| `ErrorDto.ts` | Error envelope DTO |

### `models/` — Frontend Domain Models

| File | Purpose |
|------|---------|
| `UserModel.ts` | User + auth state models |
| `ChatModel.ts` | Chat session, message, and state models |
| `FarmerTwinModel.ts` | Farmer twin frontend model |
| `WeatherModel.ts` | Weather display models |
| `OnboardingModel.ts` | Onboarding data model |
| `MandiPriceModel.ts` | Mandi price entry model |

### `hooks/` — Reusable Custom Hooks

| File | Purpose |
|------|---------|
| `useColorScheme.ts` | Re-exports `useColorScheme` from react-native |
| `useThemeColor.ts` | Returns theme color tokens |

### `services/` — API Service Layer (All `@injectable()`)

| File | Purpose |
|------|---------|
| `interfaces/IHttpService.ts` | HTTP service contract (`get`, `post`, `put`, `delete`) + `HttpOptions` type |
| `interfaces/IAccountService.ts` | Account service contract (signIn/signUp/signOut) |
| `interfaces/IChatService.ts` | Chat service contract (query, twin, weather, conversations, sync) |
| `interfaces/IUnitOfService.ts` | Unit of service facade contract |
| `interfaces/IErrorHandlerService.ts` | Error handler contract |
| `HttpService.ts` | `@injectable()` — fetch-based HTTP client replacing `apiFetch` |
| `AccountService.ts` | `@injectable()` — auth endpoints wrapping Supabase, injects `IHttpService` |
| `ChatService.ts` | `@injectable()` — all chat/query/twin/weather/conversation endpoints, injects `IHttpService` |
| `UnitOfService.ts` | `@injectable()` — facade aggregating all services (PascalCase props + lowercase getters) |
| `ErrorHandlerService.ts` | `@injectable()` — error parsing utility |
| `service-hooks/useChatService.ts` | Uses `container.get<IUnitOfService>(TYPES.IUnitOfService)` directly |

### `context/` — React Contexts

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | Auth context wrapping `src/shared/auth/AuthProvider` |
| `DependencyContext.tsx` | `createContext(container)` — exports Inversify container directly |
| `NavigationContext.tsx` | Navigation ref context for @react-navigation |

### `components/` — Feature Components + Navigation

| File | Purpose |
|------|---------|
| `Root.tsx` | App root — auth gate that renders CustomNavigation |
| `Loader.tsx` | Full-screen loading spinner |
| `Auth/LoginForm.tsx` | Re-exports `app/(auth)/login` |
| `Auth/SignUpForm.tsx` | Re-exports `app/(auth)/signup` |
| `Auth/AuthScreenShell.tsx` | Re-exports `AuthScreenLayout` from features |
| `Chat/ChatBubble.tsx` | Chat bubble UI component |
| `Home/index.tsx` | Re-exports `app/(tabs)/home` |
| `Mandi/index.tsx` | Re-exports `app/(tabs)/mandi` |
| `Profile/index.tsx` | Re-exports `app/(tabs)/profile` |
| `Scan/index.tsx` | Re-exports `app/scan` |
| `navigation/CustomNavigation.tsx` | Root stack navigator (auth-gated) using @react-navigation |
| `navigation/WithAuthScreens.tsx` | Bottom tab navigator for authenticated users |
| `navigation/WithoutAuthScreens.tsx` | Stack navigator for unauthenticated users |
| `navigation/CustomTabBar.tsx` | Custom animated tab bar (migrated from KrishiTabBar) |
| `navigation/CustomTabBarButton.tsx` | Tab bar button wrapper |

### `screen/` — Thin Screen Wrappers

| File | Purpose |
|------|---------|
| `SplashScreen.tsx` | Splash/loading screen |
| `LoginScreen.tsx` | Delegates to `app/(auth)/login` |
| `SignUpScreen.tsx` | Delegates to `app/(auth)/signup` |
| `HomeScreen.tsx` | Delegates to `app/(tabs)/home` |
| `ChatScreen.tsx` | Delegates to `app/(tabs)/chat` |
| `ChatListScreen.tsx` | Delegates to `app/(tabs)/chats` |
| `MandiScreen.tsx` | Delegates to `app/(tabs)/mandi` |
| `ProfileScreen.tsx` | Delegates to `app/(tabs)/profile` |
| `ScanScreen.tsx` | Delegates to `app/scan` |
| `OnboardingScreen.tsx` | Redirects to Expo Router onboarding |

### Config Files Modified

| File | Change |
|------|--------|
| `tsconfig.json` | Added `"experimentalDecorators": true` + path aliases for new directories |
| `babel.config.js` | Added module-resolver aliases for new directories |
| `jest.config.js` | Added moduleNameMapper entries for new directories |
| `app/_layout.tsx` | Added `import "reflect-metadata"` |
| `src/shared/providers/RootProviders.tsx` | Wrapped provider tree with `<Provider container={container}>` |
