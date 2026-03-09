# Contributing to Nexus

Thanks for your interest in contributing. This document covers everything you need to get started.

---

## Project Structure

```
nexus/
├── api/
│   ├── Nexus.sln
│   ├── Nexus.API/          # ASP.NET Core Web API — controllers, middleware, program.cs
│   ├── Nexus.Core/         # Models, DTOs, repository interfaces
│   └── Nexus.Infrastructure/ # Dapper repositories, Google services, GitHub service, background services
├── web/
│   └── src/app/
│       ├── core/           # API services, models, interceptors
│       ├── features/       # Page-level components (quick-links, hub, notes, settings)
│       ├── layout/         # Shell, topbar
│       └── panels/         # Gmail, Calendar, Chat, GitHub panels
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

---

## Running Locally

### API

```bash
cd api
cp ../.env.example .env   # or set environment variables in launchSettings.json
dotnet run --project Nexus.API
# API available at http://localhost:5000
# Swagger at http://localhost:5000/swagger
```

The SQLite database is created automatically on first run at the path in `DATABASE_PATH` (defaults to `./nexus.db` in dev).

### Frontend

```bash
cd web
yarn install
yarn start
# App at http://localhost:4200, proxied to API at :5000
```

---

## Branch Naming

| Prefix | Use |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `chore/` | Tooling, CI, dependency updates |

Example: `feature/briefing-card`, `fix/ci-badge-not-updating`

---

## Pull Request Guidelines

- One feature or fix per PR — keep diffs reviewable.
- Fill out the PR template completely.
- Include a description of what changed and why.
- If your PR adds a new API endpoint, update `.env.example` if a new env var is introduced.
- PRs that break the Docker build or Angular build will not be merged.

---

## Adding a New Panel (Angular + API)

1. **API**: Add a controller in `Nexus.API/Controllers/`. Return `503` with `{ error: "..." }` if the required credentials aren't configured so the frontend degrades gracefully.
2. **Service**: Add an HTTP service in `web/src/app/core/api/`.
3. **Component**: Create a standalone panel component in `web/src/app/panels/<name>/`.
4. **Hub**: Add the panel to `HubComponent` inside a `@defer` block with a loading fallback.
5. **Model**: Add TypeScript interfaces in `web/src/app/core/models/`.

---

## Code Style

**C#**: Standard .NET conventions. No EF Core — use Dapper with raw SQL. No test project.

**Angular**: Standalone components only, no NgModules. Use Angular Signals and `computed()` for reactive state. Use `@for`, `@if`, `@defer` control flow syntax (not `*ngFor`/`*ngIf` directives). Bootstrap 5 for layout and components.

**Package manager**: `yarn` — never `npm`.
