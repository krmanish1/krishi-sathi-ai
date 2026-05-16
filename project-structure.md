# KrishiSaathi AI — Target Project Structure (Sarthico_v1 Pattern)

> Restructured folder layout following sarthico_v1 conventions.
> All existing functionality preserved.

## Target Structure

```
krishi-sathi-ai/
│
├── app/                                    ← KEPT — Expo Router container (thin shell)
│   ├── _layout.tsx                         ← Provider shell + Stack + `import "reflect-metadata"`
│   ├── index.tsx                           ← Entry/splash → delegates to screen/
│   ├── auth-callback.tsx                   ← OAuth callback
│   ├── (auth)/                             ← Auth route group
│   ├── (onboarding)/                       ← Onboarding route group
│   └── (tabs)/                             ← Tab route group
│
├── assets/                                 ← Static assets (unchanged)
├── modules/                                ← Native modules (unchanged)
├── scripts/                                ← Utility scripts (unchanged)
├── maestro/                                ← E2E tests (unchanged)
│
├── components/                             ← Feature components + shared UI
│   ├── Root.tsx                            ← App root — auth gate / boot
│   ├── Loader.tsx                          ← Full-screen loading spinner
│   ├── Auth/                               ← Auth screens (from app/(auth)/ + src/features/auth/)
│   │   ├── LoginForm.tsx
│   │   ├── SignUpForm.tsx
│   │   └── AuthScreenShell.tsx
│   ├── Chat/                               ← Chat components (from src/features/chat/)
│   │   ├── ChatBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatList.tsx
│   │   └── StreamingStatusBox.tsx
│   ├── Home/                               ← Home dashboard (from app/(tabs)/home.tsx)
│   │   └── index.tsx
│   ├── Mandi/                              ← Mandi prices (from app/(tabs)/mandi.tsx)
│   │   └── index.tsx
│   ├── Onboarding/                         ← Onboarding screens
│   │   ├── WelcomeStep.tsx
│   │   ├── LanguageStep.tsx
│   │   ├── LocationStep.tsx
│   │   ├── ModelDownloadStep.tsx
│   │   ├── DoneStep.tsx
│   │   └── OnboardingShell.tsx
│   ├── Profile/                            ← Profile/settings (from app/(tabs)/profile.tsx)
│   │   └── index.tsx
│   ├── Twin/                               ← Twin display components
│   │   └── DisplayName.tsx
│   ├── Weather/                            ← Weather display
│   │   └── WeatherCard.tsx
│   ├── Scan/                               ← Crop scanner (from app/scan.tsx)
│   │   └── index.tsx
│   ├── Custom-Controls/                    ← Shared UI primitives (from src/shared/ui/primitives/)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── ListItem.tsx
│   │   ├── Textbox.tsx
│   │   └── CustomSelectBox.tsx
│   └── navigation/                         ← Navigation (migrated from Expo Router → @react-navigation)
│       ├── CustomNavigation.tsx            ← Root stack — auth-gated
│       ├── WithAuthScreens.tsx             ← Bottom tab navigator
│       ├── WithoutAuthScreens.tsx          ← Auth stack navigator
│       ├── CustomTabBar.tsx                ← Custom tab bar (from KrishiTabBar.tsx)
│       └── CustomTabBarButton.tsx          ← Tab bar button wrapper
│
├── screen/                                 ← Thin screen wrappers (delegate to components/)
│   ├── SplashScreen.tsx
│   ├── LoginScreen.tsx
│   ├── SignUpScreen.tsx
│   ├── HomeScreen.tsx
│   ├── ChatScreen.tsx
│   ├── ChatListScreen.tsx
│   ├── MandiScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── ScanScreen.tsx
│   ├── OnboardingScreen.tsx
│   └── AuthCallbackScreen.tsx
│
├── config/                                 ← App configuration + Inversify DI
│   ├── config.ts                           ← Environment vars (dev/staging/prod)
│   ├── ioc.ts                              ← Inversify Container — binds all services to Symbol.for() tokens
│   └── types.ts                            ← DI symbol constants using `Symbol.for()`
│
├── constants/                              ← Theme + app constants
│   ├── Colors.ts                           ← Color palette (from src/shared/ui/theme/tokens.ts)
│   ├── Theme.ts                            ← Extended theme tokens
│   └── Timeouts.ts                         ← API timeout values (from src/shared/config/constants.ts)
│
├── context/                                ← React contexts
│   ├── AuthContext.tsx                      ← Auth state (from src/shared/auth/AuthProvider.tsx)
│   ├── DependencyContext.tsx               ← `createContext(container)` — exports container directly
│   └── NavigationContext.tsx               ← Navigation ref context
│
├── dtos/                                   ← Data transfer objects (API response shapes)
│   ├── Response.ts                         ← Generic API response envelope
│   ├── QueryRequestDto.ts
│   ├── QueryResponseDto.ts
│   ├── ImageUploadResponseDto.ts
│   ├── SyncBundleDto.ts
│   ├── WeatherDto.ts
│   ├── FarmerTwinDto.ts
│   ├── ConversationDto.ts
│   └── ErrorDto.ts
│
├── models/                                 ← Frontend domain models
│   ├── UserModel.ts
│   ├── ChatModel.ts
│   ├── MessageModel.ts
│   ├── WeatherModel.ts
│   ├── MandiPriceModel.ts
│   ├── FarmerTwinModel.ts
│   └── OnboardingModel.ts
│
├── hooks/                                  ← Reusable custom hooks
│   ├── useColorScheme.ts
│   ├── useColorScheme.web.ts
│   ├── useThemeColor.ts
│   ├── useDebounce.ts
│   └── useNetworkStatus.ts
│
├── services/                               ← API service layer (all services @injectable())
│   ├── interfaces/                         ← Service contracts
│   │   ├── IHttpService.ts
│   │   ├── IAccountService.ts
│   │   ├── IChatService.ts
│   │   ├── IWeatherService.ts
│   │   ├── ITwinService.ts
│   │   ├── IMandiService.ts
│   │   ├── ISyncService.ts
│   │   └── IUnitOfService.ts
│   ├── HttpService.ts                      ← @injectable, no constructor deps (replaces apiFetch)
│   ├── AccountService.ts                   ← @injectable, injects IHttpService via container.get()
│   ├── ChatService.ts                      ← @injectable, injects IHttpService via container.get()
│   ├── WeatherService.ts                   ← Weather endpoints
│   ├── TwinService.ts                      ← Farmer twin endpoints
│   ├── MandiService.ts                     ← Mandi price endpoints
│   ├── SyncService.ts                      ← Sync bundle endpoints
│   ├── UnitOfService.ts                    ← @injectable, service facade with PascalCase public properties
│   ├── ErrorHandlerService.ts              ← @injectable, no constructor deps
│   └── service-hooks/                      ← React Query wrappers using container.get()
│       ├── useChatService.ts
│       ├── useWeatherService.ts
│       ├── useTwinService.ts
│       └── useMandiService.ts
│
├── types/                                  ← TypeScript type definitions
│   ├── RootStackParamList.ts               ← Navigation param types
│   ├── api.ts                              ← Shared API types
│   └── common.ts                           ← Common utility types
│
├── src/                                    ← KEPT — domain logic unchanged
│   ├── features/                           ← Business logic, hooks, stores (KEPT)
│   └── shared/                             ← Cross-cutting code (KEPT)
│       ├── providers/
│       │   └── RootProviders.tsx            ← Provider tree wraps <Provider container={container}>
│       ├── storage/
│       ├── i18n/
│       ├── network/
│       ├── ondevice/
│       ├── voice/
│       └── utils/
│
└── [root config files]                     ← package.json, tsconfig, etc. (unchanged)
```

---

## Migration Map

| From (Existing) | To (New) | Strategy |
|-----------------|----------|----------|
| `app/_layout.tsx` | `app/_layout.tsx` (kept) + `components/Root.tsx` (new) | RootLayout keeps provider shell, delegates boot logic to Root |
| `app/index.tsx` | `screen/SplashScreen.tsx` + `components/Root.tsx` | Splash/boot logic moves to Root |
| `app/(auth)/login.tsx` | `screen/LoginScreen.tsx` → `components/Auth/LoginForm.tsx` | Screen wraps component |
| `app/(tabs)/home.tsx` | `screen/HomeScreen.tsx` → `components/Home/index.tsx` | Screen wraps component |
| `app/(tabs)/chat.tsx` | `screen/ChatScreen.tsx` → `components/Chat/` | Screen wraps component |
| `src/shared/api/client.ts` | `services/HttpService.ts` | Axios-based replacement |
| `src/shared/api/endpoints.ts` | `services/*Service.ts` | Split by domain |
| `src/shared/api/types.ts` | `dtos/` + `types/` + `models/` | Split by concern |
| `src/shared/auth/AuthProvider.tsx` | `context/AuthContext.tsx` | Direct migration |
| `src/shared/providers/RootProviders.tsx` | `components/Root.tsx` + `context/` | Split providers |
| `src/shared/ui/theme/tokens.ts` | `constants/Colors.ts` + `constants/Theme.ts` | Direct migration |
| `src/shared/ui/primitives/` | `components/Custom-Controls/` | Direct migration |
| `src/shared/config/` | `config/` + `constants/` | Split by concern |
| `app/(tabs)/_layout.tsx` | `components/navigation/WithAuthScreens.tsx` | Expo Router Tabs → @react-navigation bottom tabs |
| `src/shared/ui/primitives/KrishiTabBar.tsx` | `components/navigation/CustomTabBar.tsx` | Direct migration |
| — | `config/types.ts` | DI tokens use `Symbol.for()` — new Inversify DI |
| — | `config/ioc.ts` | Inversify Container with `.bind().to().inSingletonScope()` — new |
| — | `services/*.ts` | All services decorated with `@injectable()` — new Inversify pattern |
| — | `app/_layout.tsx` | Added `import "reflect-metadata"` — new |
| — | `src/shared/providers/RootProviders.tsx` | Wrapped with `<Provider container={container}>` — new |
| — | `context/DependencyContext.tsx` | `createContext(container)` — simplified |

---

## Inversify DI Integration

### Architecture (matching sarthico_v1)

```
config/types.ts              → Symbol.for() tokens (e.g. Symbol.for('IHttpService'))
config/ioc.ts                → Container from inversify, binds interfaces → implementations
services/interfaces/         → I*Service contracts (e.g. IHttpService, IAccountService)
services/*Service.ts         → @injectable() classes with constructor injection
app/_layout.tsx              → import "reflect-metadata" (decorator polyfill)
src/shared/providers/        → <Provider container={container}> wraps the provider tree
context/DependencyContext.tsx → createContext(container) — direct container export
services/service-hooks/      → container.get<IUnitOfService>(TYPES.IUnitOfService)
```

### Token Pattern (`config/types.ts`)
```ts
export const TYPES = {
  IHttpService: Symbol.for('IHttpService'),
  IAccountService: Symbol.for('IAccountService'),
  IChatService: Symbol.for('IChatService'),
  IUnitOfService: Symbol.for('IUnitOfService'),
  IErrorHandlerService: Symbol.for('IErrorHandlerService'),
};
```

### Container Setup (`config/ioc.ts`)
```ts
const container = new Container();
container.bind<IHttpService>(TYPES.IHttpService).to(HttpService).inSingletonScope();
container.bind<IAccountService>(TYPES.IAccountService).to(AccountService).inSingletonScope();
container.bind<IChatService>(TYPES.IChatService).to(ChatService).inSingletonScope();
container.bind<IErrorHandlerService>(TYPES.IErrorHandlerService).to(ErrorHandlerService).inSingletonScope();
container.bind<IUnitOfService>(TYPES.IUnitOfService).to(UnitOfService).inSingletonScope();
```

### Service Pattern (e.g. `AccountService.ts`)
```ts
@injectable()
export class AccountService implements IAccountService {
  private readonly httpService: IHttpService;
  constructor(httpService = container.get<IHttpService>(TYPES.IHttpService)) {
    this.httpService = httpService;
  }
}
```

### UnitOfService Facade
Maps between PascalCase (inversify resolution) and lowercase getters (consumers):
```
Service Properties:  HttpService, AccountService, ChatService, ErrorHandlerService
Getter Aliases:      http, account, chat, errorHandler
```

### Provider Chain (`RootProviders.tsx`)
```
QueryClientProvider
  └── Provider container={container}     ← inversify-react
       └── ConnectivityProvider
            └── AuthProvider
                 └── children
```

---

## Navigation Migration

### Current (Expo Router)
```
app/_layout.tsx (Stack) → app/(auth)/_layout.tsx → login, signup
                        → app/(onboarding)/_layout.tsx → welcome, language, etc.
                        → app/(tabs)/_layout.tsx → home, chats, new-chat, mandi, profile, chat
```

### Target (@react-navigation)
```
components/navigation/
├── CustomNavigation.tsx       → Root stack: auth-gated
│   ├── WithoutAuthScreens    → Auth stack: Login, SignUp, ForgotPassword
│   ├── WithAuthScreens       → Bottom tabs: Home, Chats, NewChat, Mandi, Profile
│   └── StackScreens          → Modal stack: Scan, ProfileEdit
```

---

## What Stays Unchanged

These are NOT moved (to preserve existing functionality):

| Path | Reason |
|------|--------|
| `src/features/` | Business logic, Zustand stores, hooks — referenced by screens |
| `src/shared/storage/` | SQLite + SecureStore facades — complex platform files |
| `src/shared/i18n/` | i18n setup with locale files |
| `src/shared/ondevice/` | On-device Gemma agent logic |
| `src/shared/network/` | Connectivity platform providers |
| `src/shared/voice/` | Voice input/output |
| `src/shared/utils/` | Utility functions |
| `src/shared/supabase/` | Supabase client + social auth |
| `src/shared/api/errors.ts` | ApiError class (used everywhere) |
| `src/shared/api/routing.ts` | Core query routing (used by hooks) |
| `src/shared/api/twinWire.ts` | Twin data normalization |
| `src/shared/api/streamTransport.ts` | SSE streaming transport |
| `modules/` | Native module code |
| `assets/` | Images and fonts |
| All test files | Stay with their source modules |
