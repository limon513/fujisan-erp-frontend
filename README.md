# Real Estate ERP — Frontend

Next.js 16 (App Router, JavaScript), Tailwind CSS 4, shadcn/ui (Radix), TanStack Query.
Backend: `fujisan-erp-backend`. Design docs live in the backend repo under `docs/`.

## Setup

```bash
npm install
cp .env.example .env.local    # BACKEND_URL defaults to http://localhost:4000
npm run dev                   # http://localhost:3000 (start the backend too)
```

Browser requests go to `/api/v1/*` on this origin and are rewritten to `BACKEND_URL`
(`next.config.mjs`), so auth cookies stay first-party. In production Nginx does the same.

## Structure

```
src/
  app/
    (erp)/              authenticated ERP area (sidebar + header layout)
      dashboard/
      [...slug]/        placeholder for modules not built yet (shows roadmap phase)
    providers.js        React Query, theme, tooltips, toasts
  components/
    ui/                 shadcn components (generated: `npx shadcn@latest add <name>`)
    layout/             sidebar, header, theme toggle, API status
    common/             shared building blocks (PageHeader, ...)
  config/navigation.js  menu definition: module, permission, roadmap phase
  lib/                  api client (axios + envelope unwrap + ApiError), BD formatters
  modules/<module>/     per-module api/hooks/components (mirrors backend modules)
```

## Next.js 16 notes

- Read the version-matched docs in `node_modules/next/dist/docs/` (see `AGENTS.md`).
- `cacheComponents` is enabled: components using `usePathname`/`useSearchParams` must be inside
  `<Suspense>`; no `Math.random()`/`Date.now()` during render in prerendered components.
- Route protection uses `proxy.js` (the old `middleware.js` name is deprecated).
