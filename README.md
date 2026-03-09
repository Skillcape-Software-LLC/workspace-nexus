# Nexus

A self-hosted unified dashboard for software engineers and small business owners. Nexus brings your GitHub CI status, Google Workspace (Gmail, Calendar, Chat), and project notes into a single dark-themed interface — zero cloud accounts required beyond your own.

> **Screenshot placeholder** — add `docs/screenshot.png` after first deployment.

---

## Features

- **Quick Links** — bookmark any URL as a card, grouped by category, drag-and-drop reordered. Repo links show live CI status badges.
- **GitHub CI Monitoring** — track workflow run status across individual repos or entire GitHub accounts/orgs via webhook + polling.
- **Google Workspace Hub** — read-only Gmail inbox, Google Calendar events, and Google Chat spaces via OAuth 2.0 user consent.
- **Project Notes** — append-only markdown notes scoped to any Quick Link card, shared across all users of the instance.
- **Settings & Health** — display name, watched GitHub accounts, and integration status at a glance.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker + Docker Compose CLI)
- Google account *(optional — app runs without it; no admin/Workspace required)*
- GitHub account *(optional — CI features require a PAT and webhook)*
- Claude API key *(optional — reserved for the AI briefing feature on the roadmap)*

---

## Quick Start

```bash
git clone https://github.com/your-org/nexus.git
cd nexus
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
docker compose up -d
# Open http://localhost:4100
```

The app starts immediately. Google, GitHub, and AI panels degrade gracefully when not configured.

---

## Google OAuth Setup

Required for Gmail, Calendar, and Chat panels. Uses standard OAuth 2.0 user consent — no Workspace admin or service account needed.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a project.
2. Enable these APIs under **APIs & Services → Library**:
   - Gmail API
   - Google Calendar API
   - Google Chat API
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
   - Application type: **Web application**
   - Add an **Authorized redirect URI**: `{NEXUS_BASE_URL}/api/google/auth/callback`
     - Local default: `http://localhost:5100/api/google/auth/callback`
4. Copy the **Client ID** and **Client Secret** into your `.env`.
5. Start Nexus, navigate to **Settings → Google Account**, and click **Connect Google Account**.
6. Grant consent — you'll be redirected back to Settings with the account shown as connected.

Tokens are stored in the local SQLite database and auto-refreshed. To disconnect, click **Disconnect** in Settings.

---

## GitHub Webhook Setup

Required for real-time CI status updates on repo Quick Link cards.

1. In your GitHub repository (or organization), go to **Settings → Webhooks → Add webhook**.
2. Set:
   - **Payload URL**: `http://your-host:5000/api/github/webhook`
   - **Content type**: `application/json`
   - **Secret**: any random string — copy it to `GITHUB_WEBHOOK_SECRET` in `.env`
   - **Events**: select **"Workflow runs"** only
3. Set `GITHUB_PAT` in `.env` to a personal access token with `repo` (read) scope for polling fallback and account-level monitoring.

---

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_PATH` | No | SQLite file path inside container | `/app/data/nexus.db` |
| `API_KEY` | No | Enables `X-API-Key` header auth on all endpoints. Leave blank to disable. | `mysecretkey` |
| `GOOGLE_CLIENT_ID` | For Google panels | OAuth 2.0 Client ID from Google Cloud Console | `123....apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | For Google panels | OAuth 2.0 Client Secret | `GOCSPX-...` |
| `NEXUS_BASE_URL` | For Google OAuth | Public base URL of the API (must match the redirect URI in Google Cloud Console) | `http://localhost:5100` |
| `NEXUS_FRONTEND_URL` | For Google OAuth | Public base URL of the frontend (post-auth redirect target) | `http://localhost:4100` |
| `GITHUB_PAT` | For GitHub features | Personal Access Token (`repo` read scope) | `ghp_...` |
| `GITHUB_WEBHOOK_SECRET` | For webhooks | HMAC secret matching your GitHub webhook config | `randomstring` |
| `CI_POLLING_INTERVAL_MINUTES` | No | How often to poll GitHub for CI updates | `5` |
| `CLAUDE_API_KEY` | No | Anthropic Claude API key (roadmap: AI briefing) | `sk-ant-...` |
| `BRIEFING_SCHEDULE` | No | Cron schedule for daily briefing generation | `30 7 * * *` |

---

## Development Setup

```bash
# Start with source mounts for live reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or run services individually:

# API (from api/)
dotnet run --project Nexus.API

# Frontend (from web/)
yarn install
yarn start   # serves at http://localhost:4100 with proxy to API on :5000
```

---

## Roadmap

- **AI Daily Briefing** — Claude-powered morning briefing summarizing your calendar, unread emails, and Chat activity. Triggered on a cron schedule, cached in SQLite, regeneratable on demand. *(Design complete, implementation deferred.)*

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
