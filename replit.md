# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## JobHunt — Job Aggregator

- Frontend: `artifacts/jobhunt` (React + Vite + Tailwind + shadcn) at `/`. Search form posts to `GET /api/jobs` via the generated `useSearchJobs` hook.
- Backend: `artifacts/api-server` exposes `GET /api/jobs` with Playwright scrapers for LinkedIn, Indeed, Naukri, and Google Jobs. Schema lives in `lib/api-spec/openapi.yaml` (`Job`, `JobSearchResponse`).
- Scrapers: `src/lib/jobs/scrapers/{linkedin,indeed,naukri,google}.ts`, orchestrated by `scraperService.ts` with in-memory `node-cache` (TTL via `CACHE_TTL_SECONDS`, default 300s). Optional proxy via `PROXY_HOST/PORT/USER/PASS` env vars.
- Working sites from this environment: LinkedIn (public guest search returns real listings). Indeed, Naukri, and Google often block datacenter IPs; supplying a residential proxy via the env vars above re-enables them.
- System libs required for headless Chromium were installed via Nix: glib, nss, nspr, atk, at-spi2-atk, at-spi2-core, cups, dbus, libdrm, expat, libxkbcommon, mesa, libgbm, gtk3, fontconfig, freetype, pango, cairo, alsa-lib, and xorg.{libxcb,libX11,libXcomposite,libXdamage,libXext,libXfixes,libXrandr,libXrender,libXi,libXtst,libXScrnSaver,libXcursor,libxshmfence,libxkbfile}.
- `app.set("trust proxy", 1)` is required because the workspace proxies requests through `X-Forwarded-For`.
