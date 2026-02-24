# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (opens Expo Go QR code)
npm run start

# Run on specific platform
npm run android
npm run ios
npm run web
```

There are no lint or test scripts configured. TypeScript type-checking can be run via the IDE or `npx tsc --noEmit`.

## Architecture Overview

GymBro is an **Expo Router v6** React Native app (SDK 54) targeting iOS and Android. The project uses a file-based routing system rooted in `app/`, with all shared logic in `src/`.

### Routing Structure

- `app/_layout.tsx` — Root layout: initialises SQLite DB, loads settings, wraps everything in `GestureHandlerRootView` + `QueryClientProvider`
- `app/(tabs)/` — Bottom tab navigator with five tabs: Home, Workout, History, Calories, Profile
- All modal/push screens live in feature subdirectories under `app/`: `workout/`, `calories/`, `exercise/`, `food/`, `gym/`, `health/`, `barcode/`, `camera/`, `export/`

### State Management

Three Zustand stores (in `src/store/`):

| Store | Purpose |
|---|---|
| `workoutStore` | In-memory active workout state; persists to SQLite on every mutation |
| `calorieStore` | Current-day calorie entries + nutrition summary + micronutrient summary |
| `healthStore` | Weight logs, sleep logs, mood logs (last 90/30 days) |
| `settingsStore` | `UserSettings` row — loaded once at app start, updated via `update()` |

TanStack Query (`@tanstack/react-query`) is used for external API calls (barcode lookups). The `QueryClient` is instantiated in the root layout.

### Database Layer (SQLite via expo-sqlite)

- `src/db/index.ts` — Singleton `getDatabase()` with WAL mode + foreign keys enabled
- `src/db/migrations.ts` — Array of sequential migration functions (append-only). To add schema changes, push a new function onto the `migrations` array.
- `src/db/queries/` — One file per domain: `workouts.ts`, `sets.ts`, `calories.ts`, `exercises.ts`, `health.ts`, `settings.ts`, `photos.ts`, `videos.ts`, `customGyms.ts`
- `src/db/schema.sql.ts` — `SCHEMA_V1` string used in migration 1

**Migration rule:** Never modify existing migrations. Always append a new entry.

### External Integrations

- **Open Food Facts** (`src/utils/openFoodFacts.ts`) — Free barcode lookup API, no key required. Used via `useBarcodeProduct()` TanStack Query hook.
- **Overpass API** (`src/utils/overpass.ts`) — OpenStreetMap query for nearby gyms by GPS coordinates.
- **Firebase Firestore** (`src/config/firebase.ts`) — Used for gym community check-in counts. Requires manual setup (placeholder config). Anonymous auth enabled.
- **expo-camera** — Barcode scanning in `app/barcode/`
- **expo-image-picker + expo-media-library** — Progress photos
- **expo-video** — Exercise video recording/playback

### Styling

- No CSS-in-JS framework. All styles use `StyleSheet.create()` from React Native.
- NativeWind is installed but the primary styling system is the hand-rolled design tokens in `src/constants/theme.ts`: `Colors`, `Typography`, `Spacing`, `Radius`, `Shadows`.
- Tab bar uses `expo-blur` `BlurView` for a frosted-glass effect.
- Tab bar height constants (`TAB_BAR_HEIGHT = 84` iOS, `TAB_BAR_HEIGHT_ANDROID = 64`) must be accounted for with `SCROLL_BOTTOM_PADDING = 100` in scrollable screens.

### Key Conventions

- IDs are generated with `generateId()` from `src/utils/uuid.ts` (UUID v4 style)
- Dates stored as `YYYY-MM-DD` strings; timestamps as ISO 8601 strings
- Weight always stored internally as **kg**; the `weightUnit` setting (`'kg' | 'lbs'`) only affects display — use helpers in `src/constants/units.ts` for conversions
- `null` in nutrition fields means "not logged" (distinct from `0`)
- Components: shared UI primitives live in `src/components/ui/`, workout-specific components in `src/components/workout/`
- Firebase config in `src/config/firebase.ts` uses placeholder values — the gym community feature requires a real Firebase project to be wired up
