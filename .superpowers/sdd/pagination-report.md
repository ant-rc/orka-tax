# Pagination Implementation Report

## Pagination Component (`components/dashboard/pagination.tsx`)

Pure presentational `'use client'` component with interface `{ page, totalPages, onPageChange }`.

**Page window algorithm:** Builds the set `{1, totalPages, page-1, page, page+1}` clamped to `[1, totalPages]`, sorts ascending, walks and inserts a `…` span between non-consecutive numbers. Renders each page as a `size-8 rounded-md` button; active page uses `bg-vert-400 text-cyprus-900 font-medium` (lime highlight matching Figma). Prev/Next buttons use `ChevronLeft`/`ChevronRight` from lucide-react, disabled with `opacity-40 cursor-not-allowed` at bounds.

## Page / Clamp Logic (both panels)

- `const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))`
- `const safePage = Math.min(page, totalPages)` — pure derivation, no effect needed; handles filter/search changes that reduce totalPages automatically
- `visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)`
- `setPage(1)` called in pageSize dropdown onClick (event handler only — avoids `setState-in-effect` lint error)
- Footer left: `"1-10 sur 45 lots"` format (or `"0"` when empty); center: `<Pagination />`; right: existing page-size dropdown

## Mock Data Counts

- `MOCK_LOTS`: **45 entries** (5 pages at default size 10, ellipsis window exercised from page 4+)
- `MOCK_BIENS`: **45 entries** (5 pages at default size 10)
- Both generated via small pure functions with typed seeds/cycles, zero `any`, all existing exports preserved

## Build / Lint / Test

- `npm run build`: compiled successfully (Next.js 16.2.9 Turbopack)
- `npm run lint`: 0 errors, 6 warnings (all pre-existing `<img>` warnings, not introduced by this change)
- `npm run test`: 6 test files, 11 tests — all passed
