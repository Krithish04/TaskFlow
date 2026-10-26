# TaskFlow Phase 2 Progress

## Task 23: Design tokens and theme per DESIGN.md
- Configured CSS design tokens in `src/app/globals.css` for light and dark themes (foundations, surface/surface-raised, border, radius 8px/12px, tabular-nums, reduced motion, 8 project palette colors, status and priority colors).
- Added `src/lib/design-tokens.ts` with typed helpers for `PROJECT_COLOR_PALETTE`, `STATUS_CONFIG`, and `PRIORITY_CONFIG`.
- Added shared UI components: `Card` (styled to 8px radius), `Badge` (with status/priority variants), `Avatar` (with `AvatarStack`), `EmptyState`, `Skeleton`, `Toast` (with `Toaster` mounted in `layout.tsx`), and `Tabs` (with line and pill variants).
- Test script status: Skipped `npm test` as test scripts were removed during cleanup; verified `npm run lint`, `npm run typecheck`, and `npm run build` all pass cleanly with 0 errors.
- Next run (Task 24): App shell layout with sidebar, breadcrumbs, user menu, theme toggle, and restyling existing screens and dialogs to the new tokens.

## Task 24: App shell and restyled existing views
- Built `AppShell` (`src/components/layout/app-shell.tsx`), `ThemeProvider` (`src/components/theme-provider.tsx`), and `ThemeToggle` (`src/components/theme-toggle.tsx`) supporting light, dark, and system themes with hydration-safe `useSyncExternalStore`.
- Restyled Login page, User/PM/Admin dashboards, Kanban board, Task drawer, Task comments, and AI breakdown dialog to use the new design tokens, Badges, Avatars, Skeletons, and EmptyStates with 0 horizontal overflow.
- Passed `npm run lint`, `npm run typecheck`, and `npm run build` with 0 errors and 0 warnings.
- Tested all screens at 375 px and 1280 px in both light and dark modes with browser automation.
- Next run (Task 25): [review] Data model v2: Project `color`, `key`, `nextTaskNumber`; Task `number` and `completedAt`. Add `scripts/migrate-v2.ts` and `npm run migrate:v2`. Tests for numbering and completedAt.
