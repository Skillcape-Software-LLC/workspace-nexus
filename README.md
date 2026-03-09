# Nexus

A self-hosted dashboard that brings GitHub CI, Google Workspace, and project notes into one dark-themed interface. Run it on your own hardware with Docker — no cloud accounts required beyond your own.

> **Screenshot placeholder** — add `docs/screenshot.png` after first deployment.

## What you get

| Panel | What it shows |
|-------|---------------|
| **Gmail** | Latest inbox threads with snippet previews |
| **Google Calendar** | Upcoming events for the next 7 days |
| **Google Chat** | Spaces with unread message counts |
| **GitHub CI** | Workflow run status for watched repos |
| **Notes** | Markdown notes with tags, search, and archive |
| **Settings** | Connect/disconnect integrations, manage watched repos |

Every integration is optional. Panels degrade gracefully when not configured — the app is usable from day one with zero setup beyond Docker.

---

## Quick start (2 minutes)

**You need:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)

```bash
# Download the compose file and env template
curl -O https://raw.githubusercontent.com/chad-hollenbeck/nexus/master/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/chad-hollenbeck/nexus/master/.env.example
mv docker-compose.prod.yml docker-compose.yml
cp .env.example .env
docker compose up -d
```

Open **http://localhost:4100** — you'll see the Hub with empty panels and a working Notes page.

That's it. Everything below is optional.

> **Building from source?** Clone the repo and run `docker compose up -d` instead — the default `docker-compose.yml` builds locally.

---

## Adding integrations

### Google (Gmail, Calendar, Chat)

<details>
<summary>Click to expand setup steps</summary>

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Enable three APIs under **APIs & Services > Library**:
   - Gmail API
   - Google Calendar API
   - Google Chat API
3. Go to **APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID**.
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:4100/api/google/auth/callback`
     *(replace `localhost:4100` with your actual `NEXUS_BASE_URL` if deployed elsewhere)*
4. Copy the **Client ID** and **Client Secret** into your `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   ```
5. Restart: `docker compose up -d`
6. In Nexus, go to **Settings > Google Account** and click **Connect Google Account**.
7. Grant consent in the Google popup — done.

Tokens are stored locally in SQLite and auto-refresh. Disconnect anytime from Settings.

> **Note:** No Google Workspace admin or service account is needed. Standard OAuth 2.0 user consent works with any Google account.
</details>

### GitHub CI monitoring

<details>
<summary>Click to expand setup steps</summary>

1. Go to [github.com/settings/developers](https://github.com/settings/developers) > **OAuth Apps** > **New OAuth App**.
2. Fill in:
   - **Application name:** `Nexus`
   - **Homepage URL:** `http://localhost:4100`
   - **Authorization callback URL:** `http://localhost:4100/api/github/oauth/callback`
     *(replace with your actual URLs if deployed elsewhere)*
3. Click **Register application**, then **Generate a new client secret**.
4. Copy both values into your `.env`:
   ```
   GITHUB_CLIENT_ID=Ov23li...
   GITHUB_CLIENT_SECRET=abc123...
   ```
5. Restart: `docker compose up -d`
6. In Nexus, go to **Settings > GitHub Account** and click **Connect GitHub Account**.
7. Authorize on GitHub — done.

Once connected, add repos to watch from the Settings page. Nexus polls GitHub for CI status every 5 minutes (configurable via `CI_POLLING_INTERVAL_MINUTES`).

> **Fallback:** You can set `GITHUB_PAT` in `.env` to use a Personal Access Token instead of OAuth. The OAuth token takes priority when both are present.
</details>

### GitHub webhooks (real-time CI updates)

<details>
<summary>Click to expand setup steps</summary>

Polling works out of the box. Webhooks are optional but give you instant CI status updates.

1. In your GitHub repo or org, go to **Settings > Webhooks > Add webhook**.
2. Set:
   - **Payload URL:** `https://your-host/api/github/webhook`
   - **Content type:** `application/json`
   - **Secret:** generate a random string, then add it to `.env`:
     ```
     GITHUB_WEBHOOK_SECRET=your-random-secret
     ```
   - **Events:** select **Workflow runs** only
3. Restart: `docker compose up -d`

If `GITHUB_WEBHOOK_SECRET` is not set, Nexus logs a warning and accepts webhooks without signature verification.
</details>

---

## Environment variables

All config lives in `.env`. See [`.env.example`](.env.example) for the full template with comments.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_PATH` | `/app/data/nexus.db` | SQLite file path inside container |
| `API_KEY` | *(empty)* | If set, all API requests require `X-API-Key` header |
| `NEXUS_BASE_URL` | `http://localhost:4100` | Base URL for OAuth redirect URIs |
| `NEXUS_FRONTEND_URL` | `http://localhost:4100` | Frontend URL (used for CORS and post-auth redirects) |
| `GOOGLE_CLIENT_ID` | | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | | Google OAuth Client Secret |
| `GITHUB_CLIENT_ID` | | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | | GitHub OAuth App Client Secret |
| `GITHUB_PAT` | | Personal Access Token (fallback if OAuth not configured) |
| `GITHUB_WEBHOOK_SECRET` | | HMAC secret for webhook signature verification |
| `CI_POLLING_INTERVAL_MINUTES` | `5` | GitHub CI polling frequency |
| `CLAUDE_API_KEY` | | Anthropic API key (roadmap: AI briefing) |
| `BRIEFING_SCHEDULE` | `30 7 * * *` | Cron schedule for briefing generation |

---

## Deploying to a server

Use the pre-built images (no cloning required):

```bash
# On your server
mkdir nexus && cd nexus
curl -O https://raw.githubusercontent.com/chad-hollenbeck/nexus/master/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/chad-hollenbeck/nexus/master/.env.example
mv docker-compose.prod.yml docker-compose.yml
cp .env.example .env
# Edit .env — set NEXUS_BASE_URL and NEXUS_FRONTEND_URL to your domain
docker compose up -d
```

**How it works:** All traffic goes through port `4100` (the web container). Its built-in nginx proxies `/api/` requests — including OAuth callbacks — to the API container internally. You only need to expose one port.

**Reverse proxy (production):** Point a single domain at port `4100` and set both env vars to match:

```env
NEXUS_BASE_URL=https://nexus.example.com
NEXUS_FRONTEND_URL=https://nexus.example.com
```

No subdomains or extra routing rules needed.

> Port `5100` (direct API access) is also exposed for debugging but isn't required for normal operation.

**Data persistence:** SQLite lives in `./data/` on the host (mounted as a volume). Back up this directory to preserve all data.

---

## Development

```bash
# Run both services with dev settings (Swagger UI enabled, hot reload ports)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or run individually:

# API (from api/)
dotnet run --project Nexus.API

# Frontend (from web/ — always use yarn, not npm)
yarn install
yarn start     # http://localhost:4200, proxies API calls to :5000
```

---

## Roadmap

- **AI Daily Briefing** — Claude-powered summary of your calendar, unread emails, and Chat activity. Cron-triggered, cached in SQLite.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
