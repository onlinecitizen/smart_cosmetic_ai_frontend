# Smart Cosmetic AI — Frontend

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS. Talks to the FastAPI backend
(`smart_cosmetic_ai_backend`) through `src/lib/api.ts`.

Design conventions, tokens and copy rules: see [`DESIGN.md`](./DESIGN.md).

## Local development

Requires Node.js 22 LTS and a running backend (default `http://localhost:8000`).

```bash
npm ci
cp .env.example .env.local   # sets NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev                  # http://localhost:3000
```

The backend must allow this origin: set `FRONTEND_ORIGIN=http://localhost:3000` on the backend.

## Checks

```bash
npm test            # Vitest unit + component tests
npx tsc --noEmit    # type check
npm run lint        # ESLint
npm run build       # production build
```

## Environment variables (build time)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL. On Netlify this is the site's own URL; `netlify.toml` proxies `/api/*` to the backend. An empty value falls back to `http://localhost:8000`. |
| `NEXT_PUBLIC_SHOW_DEMO_LOGIN` | `true` shows the demo-customer login hint on `/login`. Off by default. Only use it when the backend runs with `SEED_DEMO_DATA=true`. |

## Deployment

Deployed on Netlify. Build settings live in the Netlify dashboard; `netlify.toml` only contains the `/api/*` proxy.
