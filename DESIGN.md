# Smart Cosmetic AI — Frontend Design System

Mobile-first. Design at 390 px wide first, then enhance at `sm` (640), `md` (768) and `lg` (1024).
Everything below already exists in code; this file explains how to use it.

## 1. Tokens (`tailwind.config.js`)

| Token | Use | Notes |
|---|---|---|
| `brand-50` | Page background | |
| `brand-100` | Alternate section background, inset panels | |
| `brand-200`, `brand-300` | Borders, dividers, decoration | **Never for text** (contrast < 2:1) |
| `brand-400` | Muted text, inactive steps | 5.2:1 on `brand-50` |
| `brand-500` | Captions, hints, small print | 5.7:1 |
| `brand-600`–`700` | Body copy | |
| `brand-900` | Headings, primary buttons, dark sections | |
| `gold-700` | Small headings above sections (`.eyebrow`), accent text on light backgrounds | 5.4:1 on `brand-50` |
| `gold-300`, `gold-500` | Accents **on dark** backgrounds, decorative fills | Not for text on light backgrounds |
| `red-*`, `amber-*`, `emerald-*` | Error / warning-demo / success states only | via `.alert-*`, `.badge-demo`, `StatusBadge` |

**Rule:** small text must meet WCAG AA 4.5:1. `brand-400` and `gold-700` were darkened in Phase 1
for this reason (they were 3.8:1 and 3.6:1).

Typography: `font-display` (Cormorant Garamond) for headings via `.display`; `font-sans` (Manrope)
for everything else. Mobile heading sizes: page title `text-4xl`, section title `text-4xl`,
card title `text-2xl`/`text-3xl`. Increase at `sm:`.

## 2. Component classes (`src/app/globals.css`)

| Class | Purpose |
|---|---|
| `.btn-primary` / `.btn-secondary` / `.btn-gold` | One primary action per view. `.btn-gold` only on dark backgrounds. |
| `.card`, `.glass` | Content containers. |
| `.input`, `.label`, `.field-error` | Form fields. Every input needs a `<label htmlFor>`. |
| `.eyebrow`, `.display`, `.chip` | Small heading above a section, display type, small tag. |
| `.alert` + `.alert-error / -warning / -success / -info` | Messages. Prefer the `<Alert>` component. |
| `.badge-demo` | Marks anything from a development/mock provider. Prefer `<DemoBadge>`. |
| `.skip-link` | "Skip to content" link (in `layout.tsx`). |

`:focus-visible` gives every focusable element a gold focus ring. Don't remove outlines without a replacement.

## 3. React components

- `components/ui/States.tsx` — `Alert`, `Spinner`, `ErrorState` (with retry), `EmptyState`, `StatusBadge`, `DemoBadge`.
- `components/ui/PasswordField.tsx` — password input with show/hide and linked hint.
- `components/PageLoader.tsx` — full-page loading, or an error with retry.
- `components/home/ProductCard.tsx` — the product, from `GET /api/v1/products/{code}`.
- `components/assessment/AnalysisProgress.tsx` — real per-request progress.

## 4. States: every data screen renders exactly one of

1. **Loading** — `Spinner` or a skeleton (`aria-busy`).
2. **Error** — `ErrorState` with a "Try again" action, using `errorMessage()` from `lib/api.ts`. Never show raw server text.
3. **Empty** — `EmptyState` with a next step.
4. **Content**.

Never treat a failed request as "empty". Before Phase 1, the dashboard and orders list showed "No orders yet" when loading failed.

## 5. Copy rules (project brief §6)

Customer-facing text may only describe what the code really does.

- Product status flags live in `lib/siteStatus.ts`. Update them, and the copy that uses them, when the backend changes.
- Results from a provider named `mock*` must carry a `DemoBadge` (`isDemoProvider()` in `lib/diagnostic.ts`).
- Order wording lives only in `lib/orderStatus.ts`. A customer-submitted order is a **request**, never "confirmed".
- No animation may imply work that isn't happening (no scripted "detecting…" steps).
- Never invent products, prices, reviews, ratings, statistics, ingredients or benefits. Prices come only from the API.
- `src/copyClaims.test.ts` fails the test run if known unsupported phrases reappear.

## 6. Accessibility checklist

- One `<h1>` per page. Headings in order. Lists use `<ul>/<ol>`; label/value pairs use `<dl>`.
- Inputs: `label`, `autoComplete`, `aria-describedby` for hints and errors, `aria-invalid` when wrong.
- Errors use `role="alert"` (the `Alert` component does this).
- Never hide a focusable control with `display:none` (`hidden`). Use `sr-only` (see the photo upload input).
- Touch targets are at least 44 px (`h-11`).
- Status is never shown by colour alone; badges always include text.
- Animations respect `prefers-reduced-motion` (see the end of `globals.css`).
