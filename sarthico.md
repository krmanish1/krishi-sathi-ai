# Sarthico_v1 — Folder Structure Reference

> Reference document for KrishiSaathi AI restructuring. Do not modify sarthico_v1.

## Root Structure

```
sarthico_v1/
├── app/                              (Expo Router entry — thin shell)
│   ├── _layout.tsx                   (Providers wrapper, no navigation)
│   ├── +html.tsx                     (Web-only HTML root)
│   ├── +not-found.tsx                (404 screen)
│   └── (tabs)/
│       └── explore.tsx               (Dead code — from template)
├── assets/                           (Fonts + images)
│   ├── fonts/
│   └── images/
├── components/                       (Feature components + shared UI)
│   ├── Root.tsx                      (App root — auth loading check)
│   ├── Loader.tsx                    (Full-screen modal loader)
│   ├── NotificationHandler.tsx       (Notification tap responder)
│   ├── Profile.tsx                   (Profile placeholder)
│   ├── Custom-Controls/              (Reusable form controls)
│   │   ├── Textbox.tsx               (react-hook-form text input)
│   │   └── CustomSelectBox.tsx       (Dropdown/multi-select)
│   ├── ForgotPassword/               (Forgot password form)
│   │   └── index.tsx
│   ├── Home/                         (Home component)
│   │   └── index.tsx
│   ├── Login/                        (Login form)
│   │   └── index.tsx
│   ├── navigation/                   (Navigation structure)
│   │   ├── CustomNavigation.tsx      (Root stack — auth-gated)
│   │   ├── WithAuthScreens.tsx       (Bottom tab navigator)
│   │   ├── WithoutAuthScreens.tsx    (Auth stack navigator)
│   │   ├── CustomTabBar.tsx          (Custom tab bar)
│   │   └── CustomTabBarButton.tsx    (Tab bar button wrapper)
│   ├── SignUp/                       (Sign up form)
│   │   └── index.tsx
│   └── ValidateOTP/                  (OTP validation form)
│       └── index.tsx
├── config/                           (App configuration / DI)
│   ├── config.ts                     (Environment vars — dev/staging/prod)
│   ├── ioc.ts                        (Inversify DI container)
│   └── types.ts                      (Symbol constants for DI)
├── constants/                        (Theme constants)
│   └── Colors.ts                     (Light/dark color palette)
├── context/                          (React contexts)
│   ├── AuthContext.tsx               (Auth state: token, login, logout)
│   ├── DependencyContext.tsx         (DI container context)
│   └── NavigationContext.tsx         (Navigation ref context)
├── dtos/                             (Data transfer objects)
│   ├── NotificationForAppDto.ts
│   ├── ProjectDto.ts
│   ├── Response.ts                   (Generic API response wrapper)
│   ├── RoleDto.ts
│   └── UserDto.ts
├── hooks/                            (Custom hooks)
│   ├── useColorScheme.ts
│   ├── useColorScheme.web.ts         (Web stub)
│   ├── useNotifications.ts
│   └── useThemeColor.ts
├── models/                           (Frontend model interfaces)
│   ├── LoginModel.ts
│   ├── NotificationForAppModel.ts
│   └── SignUpModel.ts
├── screen/                           (Thin screen wrappers)
│   ├── ForgotPasswordScreen.tsx
│   ├── HomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── SignUpScreen.tsx
│   ├── SplashScreen.tsx
│   └── ValidateOTPScreen.tsx
├── scripts/                          (Utilities)
│   └── reset-project.js
├── services/                         (Service layer)
│   ├── AccountService.ts             (Login, change password)
│   ├── DateTimeService.ts            (Timezone conversion)
│   ├── ErrorHandlerService.ts        (Axios error parsing)
│   ├── HttpService.ts                (Axios wrapper + interceptors)
│   ├── MiscellaneousService.ts       (Network, media, string utilities)
│   ├── NotificationService.ts        (Notification API)
│   ├── UnitOfService.ts              (Service facade)
│   ├── UserService.ts                (User API calls)
│   ├── interfaces/                   (Service contracts)
│   │   ├── IAccountService.ts
│   │   ├── IDateTimeService.ts
│   │   ├── IErrorHandlerService.ts
│   │   ├── IHttpService.ts
│   │   ├── IMiscellaneousService.ts
│   │   ├── INotificationService.ts
│   │   ├── IUnitOfService.ts
│   │   └── IUserService.ts
│   └── service-hooks/                (React Query wrappers)
│       └── useUserService.ts
├── types/                            (Type definitions)
│   └── RootStackParamList.tsx         (Navigation param types)
└── [config files]                    (package.json, app.json, tsconfig, etc.)
```

---

## Key Architectural Patterns

### 1. Two-Layer Screen Pattern
```
screen/LoginScreen.tsx → components/Login/index.tsx
```
Screens are thin wrappers; logic lives in components.

### 2. Dependency Injection (Inversify)
- `config/ioc.ts` creates Inversify Container with `.bind().to().inSingletonScope()`
- `config/types.ts` defines DI tokens using `Symbol.for()`
- Services are decorated with `@injectable()` from `inversify`
- Constructor injection via default params: `constructor(x = container.get<I>(TYPES.X))`
- `import "reflect-metadata"` in root layout (required for decorators)
- `src/shared/providers/RootProviders.tsx` wraps tree with `<Provider container={container}>` from `inversify-react`
- Components resolve via `container.get<IUnitOfService>(TYPES.IUnitOfService)` in hooks

### 3. Unit of Service Facade
```
UnitOfService.ts aggregates:
  ├── HttpService        (Axios HTTP)
  ├── AccountService     (Auth)
  ├── UserService        (User ops)
  ├── DateTimeService    (Timezone)
  ├── MiscellaneousService (Utils)
  ├── NotificationService (Notifications)
  └── ErrorHandlerService  (Error parsing)
```

### 4. HTTP Layer (Axios)
- Base URL from `config/config.ts` based on `__DEV__`
- Client ID header on all requests
- Request interceptor: attaches Bearer token
- Response interceptor: handles 401, 403, 4xx errors

### 5. Auth Flow
- `AuthContext` manages token state + AsyncStorage persistence
- `Root.tsx` reads stored token on startup
- `CustomNavigation.tsx` conditionally renders auth/non-auth stacks

### 6. Navigation (React Navigation, not Expo Router)
- `@react-navigation/stack` for root + auth stacks
- `@react-navigation/bottom-tabs` for main tabs
- Expo Router `app/` is just a provider shell

### 7. Naming Conventions
- Folders: `screen/` (singular), `components/` (plural), `config/` (singular)
- Feature components: PascalCase folders with `index.tsx`
- Interfaces: PascalCase with `I` prefix
- DTOs: PascalCase with `Dto` suffix
- Models: PascalCase with `Model` suffix

### 8. No Barrel Exports
- Components import via relative paths: `../Custom-Controls/Textbox`
- Some use `@/` path aliases: `@/types/RootStackParamList`
- No `index.ts` barrel files within component folders
