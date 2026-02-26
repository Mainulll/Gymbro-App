# GymBro — Developer Reference

> Last updated: 2026-02-25
> Stack: Expo SDK 54 · React Native 0.81.5 · React 19.1 · Expo Router v6

---

## Quick start - ALWAYS PUSH TO GIT AUTOMATICALLY AFTER EVERY CHANGE.

```bash
cp .env.example .env          # fill in Supabase keys
npm install
npm run start                 # Expo Go / dev client
npm run android
npm run ios
```

TypeScript check (no test runner configured):
```bash
npx tsc --noEmit
npx expo-doctor               # 17/17 checks should pass
```

---

## Repository layout

```
gymbro/
├── app/                     # Expo Router file-based routes
│   ├── _layout.tsx          # Root layout: DB init, settings load, QueryClient, StatusBar
│   ├── (tabs)/              # Bottom tab navigator (5 tabs)
│   │   ├── _layout.tsx      # BlurView tab bar
│   │   ├── index.tsx        # Home / dashboard
│   │   ├── workout.tsx      # Active workout screen
│   │   ├── history.tsx      # Workout history list
│   │   ├── calories.tsx     # Calorie & macro tracker
│   │   └── profile.tsx      # User profile & settings
│   ├── workout/             # new · [id] · complete
│   ├── exercise/            # select · [id] (detail + chart)
│   ├── calories/            # add (food entry form) · micros breakdown
│   ├── food/                # search · select
│   ├── gym/                 # select (OSM + custom gyms)
│   ├── health/              # weight · sleep · photos
│   ├── barcode/             # scan
│   ├── camera/              # record (exercise video)
│   └── export/              # CSV export
│
├── src/
│   ├── db/
│   │   ├── index.ts         # Singleton SQLite DB (WAL + FK enabled)
│   │   ├── migrations.ts    # Append-only migration array
│   │   ├── schema.sql.ts    # SCHEMA_V1 string
│   │   └── queries/         # One file per domain
│   │       ├── workouts.ts  calories.ts  exercises.ts  sets.ts
│   │       ├── health.ts    settings.ts  photos.ts     videos.ts
│   │       └── customGyms.ts
│   │
│   ├── store/               # Zustand stores
│   │   ├── workoutStore.ts  # In-memory active workout → persists to SQLite
│   │   ├── calorieStore.ts  # Today's entries + macro/micro summaries
│   │   ├── healthStore.ts   # Weight / sleep / mood (last 90/30 days)
│   │   └── settingsStore.ts # UserSettings row (loaded once at boot)
│   │
│   ├── lib/
│   │   └── supabase.ts      # Supabase client (AsyncStorage session, no URL detection)
│   │
│   ├── hooks/
│   │   └── useSupabaseSession.ts  # Auth state subscriber → {session, loading}
│   │
│   ├── queries/
│   │   └── useUserProfile.ts      # Example TanStack hook reading Supabase profiles table
│   │
│   ├── utils/
│   │   ├── openFoodFacts.ts  # lookupBarcode · barcodeQueryKey · useBarcodeProduct · prefetchBarcodeProduct · scaleNutrition · hasVitaminData
│   │   ├── caloriePrefill.ts # setPendingCaloriePrefill / consumePendingCaloriePrefill
│   │   ├── csv.ts            # generateAndShareCSV
│   │   ├── date.ts           # formatDateISO · getWeekStart · getWeekLabel etc.
│   │   ├── gymCommunity.ts   # Firebase check-in helpers
│   │   ├── overpass.ts       # OSM nearby gym search
│   │   └── uuid.ts           # generateId() — UUID v4
│   │
│   ├── components/
│   │   ├── ui/               # Card · Badge · Button · Input · BottomSheet · Divider
│   │   │                     # EmptyState · ProgressBar · ProgressRing
│   │   └── workout/          # ExerciseCard · HistoryCard · RestTimer · SetRow · WorkoutTimer
│   │
│   ├── constants/
│   │   ├── theme.ts          # Colors · Typography · Spacing · Radius · Shadows · TAB_BAR_HEIGHT
│   │   ├── units.ts          # toDisplayWeightNumber · kg↔lbs converters
│   │   ├── exercises.ts      # MUSCLE_GROUP_LABELS + built-in exercise list
│   │   └── progressionInsights.ts  # analyzeTrend · getProgressionAdvice · calcRepRecords · COACHING_TIPS
│   │
│   ├── config/
│   │   └── firebase.ts       # Firebase app + Firestore (placeholder config — needs real project)
│   │
│   └── types/                # Shared TypeScript interfaces (WorkoutSession, CalorieEntry, etc.)
│
├── global.css                # @tailwind base/components/utilities
├── tailwind.config.js        # NativeWind preset + full custom color/spacing theme
├── babel.config.js           # jsxImportSource: nativewind · nativewind/babel
├── metro.config.js           # withNativeWind(config, { input: './global.css' })
├── app.json                  # Expo app config
├── .env.example              # Public/private env var placeholders
└── .gitignore                # Excludes .env* (not .env.example) and Supabase local dirs
```

---

## Environment variables

Copy `.env.example` → `.env` and fill in:

| Variable | Scope | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Client bundle | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client bundle | Supabase anon/public key |
| `SUPABASE_DB_URL` | Server only | Direct DB URL for migrations (never used in mobile app) |

`EXPO_PUBLIC_*` vars are inlined at build time by Metro. The `SUPABASE_DB_URL` is private and only referenced by server-side tooling.

---

## Styling system

**Primary:** NativeWind v4 with `className` on all RN components.
**Never use:** `StyleSheet.create()` — zero occurrences remain in the codebase.

### Spacing → Tailwind mapping
| Token | px | Tailwind |
|---|---|---|
| xs | 4 | `p-1 m-1 gap-1` |
| sm | 8 | `p-2 m-2 gap-2` |
| md | 12 | `p-3 m-3 gap-3` |
| base | 16 | `p-4 m-4 gap-4` |
| lg | 20 | `p-5 m-5 gap-5` |
| xl | 24 | `p-6 m-6 gap-6` |
| xxl | 32 | `p-8 m-8 gap-8` |
| xxxl | 48 | `p-12 m-12 gap-12` |

### Radius → Tailwind mapping
| Token | px | Tailwind |
|---|---|---|
| xs | 4 | `rounded` |
| sm | 8 | `rounded-lg` |
| md | 12 | `rounded-xl` |
| lg | 16 | `rounded-2xl` |
| xl | 20 | `rounded-[20px]` |
| xxl | 24 | `rounded-3xl` |
| full | 9999 | `rounded-full` |

### Typography → Tailwind
`xs=text-[11px]` · `sm=text-[13px]` · `base=text-[15px]` · `lg=text-[20px]` · `xl=text-[24px]` · `xxl=text-[28px]`

### When to keep `style={{}}` instead of className
- `Animated.Value` transforms — must be style prop
- `CameraView` — external component, use style prop for absoluteFill
- SVG element props (width, height, fill, stroke)
- `rgba()` values not in the Tailwind config
- `textShadow`, `fontVariant`, `fontFamily` (platform-specific)
- Hairline borders: `style={{ borderTopWidth: 0.5, borderTopColor: Colors.border }}`
- Runtime `Dimensions`-computed sizes (e.g. PHOTO_SIZE)

---

## Database

### Rules
- **Never modify** existing migrations. Always append a new function to the `migrations` array.
- Foreign keys are enabled. Always insert parent rows before children.
- All IDs are UUID v4 strings from `generateId()`.
- Dates stored as `YYYY-MM-DD`; timestamps as ISO 8601.
- Weight always stored as **kg**; display unit toggled via `settingsStore.weightUnit`.
- `null` in nutrition fields = "not logged" (distinct from `0`).

### Adding a migration
```ts
// src/db/migrations.ts
migrations.push(async (db) => {
  await db.runAsync(`ALTER TABLE my_table ADD COLUMN new_col TEXT;`);
});
```

---

## TanStack Query

Setup in `app/_layout.tsx`:
- `QueryClient`: retry=2, staleTime=30s, gcTime=24h
- Persisted to AsyncStorage key `GYMBRO_REACT_QUERY_CACHE` (buster `v1`)
- Wrapped by `PersistQueryClientProvider`

Barcode lookups use `useBarcodeProduct(barcode)` from `src/utils/openFoodFacts.ts`:
- staleTime: 24h · gcTime: 7 days
- Query key: `['openFoodFacts', 'barcode', barcode]` via `barcodeQueryKey()`

---

## Supabase

Client: `src/lib/supabase.ts`
- `react-native-url-polyfill/auto` must be the first import
- `AsyncStorage` for session persistence
- `detectSessionInUrl: false` (required for React Native)

Auth hook: `src/hooks/useSupabaseSession.ts`
```ts
const { session, loading } = useSupabaseSession();
```

Example query hook: `src/queries/useUserProfile.ts` — reads from `profiles` table.

Firebase config (`src/config/firebase.ts`) uses **placeholder values**. The gym community check-in feature requires a real Firebase project wired up with Firestore and anonymous auth enabled.

---

## Barcode scanner

`app/barcode/scan.tsx` — fixes in place:
| Protection | Implementation |
|---|---|
| Duplicate scan within 2s | `lastScanRef` compares barcode + timestamp |
| Concurrent lookup | `scanLockRef` boolean, reset by `safeExit` and `resumeScanningWithDelay` |
| "Scan Again" bounce | 800ms delay via `setTimeout(() => setScanning(true), delayMs)` |
| Not found alert fires once | `alertedRef` tracks last alerted barcode |

---

## Calories tab architecture

Food entry uses a **full-screen push navigation** pattern (no BottomSheet/Modal):

| Action | Implementation |
|---|---|
| "Add" button on meal card | `router.push('/calories/add', { meal, date })` |
| Scan Barcode (from meal card) | `router.push('/barcode/scan', { meal })` → re-staged prefill auto-navigates to add screen |
| Search Food (from meal card) | `router.push('/food/search', { meal })` → re-staged prefill auto-navigates to add screen |
| Scan Barcode (from add screen) | `router.push('/barcode/scan', { meal })` → `useFocusEffect` in add screen consumes prefill |
| Search Food (from add screen) | `router.push('/food/search', { meal })` → `useFocusEffect` in add screen consumes prefill |
| Log entry | `addEntry()` + `router.back()` |

**Why no BottomSheet:** iOS `UIVisualEffectView` (BlurView) must never be inside a container with `alpha < 1`. The opacity animation in `Modal`-backed BottomSheet triggered a main-thread hang on iOS, freezing the app on button press.

**Prefill flow:** `caloriePrefill.ts` is a module-level singleton. Barcode/search screens call `setPendingCaloriePrefill()` then `router.back()`. The receiving screen's `useFocusEffect` calls `consumePendingCaloriePrefill()` and populates form fields.

---

## Known issues / backlog

See bug report in project memory. Top priority items:
1. Streak calculation in `src/db/queries/workouts.ts` always returns `0` — needs implementation
2. History screen N+1 query — `getWorkoutExercises` called once per session row
3. Calorie store race condition — UI state updates before DB confirmation
4. Migration version INSERT/UPDATE logic — condition checked inside loop (should be before)
5. Firebase config is placeholder — community features non-functional

---

## Git workflow

```bash
git add <files>
git commit -m "type: short description"
git push origin master
```

Remote: `https://github.com/Mainulll/Gymbro-App.git`

Do **not** commit:
- `.env` or any `.env.*` (except `.env.example`)
- `.claude/settings.local.json`
- `node_modules/`, `ios/`, `android/`
