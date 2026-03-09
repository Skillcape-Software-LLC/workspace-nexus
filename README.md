# Nexus

A self-hosted unified dashboard for software engineers and small business owners. Nexus brings your GitHub CI status, Google Workspace (Gmail, Calendar, Chat), and project notes into a single dark-themed interface — zero cloud accounts required beyond your own.

> **Screenshot placeholder** — add `docs/screenshot.png` after first deployment.

---

## Features

- **Quick Links** — bookmark any URL as a card, grouped by category, drag-and-drop reordered. Repo links show live CI status badges.
- **GitHub CI Monitoring** — track workflow run status across individual repos or entire GitHub accounts/orgs via webhook + polling.
- **Google Workspace Hub** — read-only Gmail inbox, Google Calendar events, and Google Chat spaces via service account delegation.
- **Project Notes** — append-only markdown notes scoped to any Quick Link card, shared across all users of the instance.
- **Settings & Health** — display name, watched GitHub accounts, and integration status at a glance.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker + Docker Compose CLI)
- Google Workspace account with admin access *(optional — app runs without it)*
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
# Open http://localhost:4200
```

The app starts immediately. Google, GitHub, and AI panels degrade gracefully when not configured.

---

## Google Service Account Setup

Required for Gmail, Calendar, and Chat panels.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. Enable the following APIs:
   - Gmail API
   - Google Calendar API
   - Google Chat API
3. Navigate to **IAM & Admin → Service Accounts** and create a new service account.
4. Grant the service account **domain-wide delegation**:
   - Open the service account → **Keys** → **Add Key** → JSON. Save the file.
   - In the service account details, copy the **Client ID**.
5. Go to **Google Workspace Admin** → **Security → API Controls → Domain-wide Delegation**.
   Add a new entry with the Client ID and these OAuth scopes:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/chat.messages.readonly
   https://www.googleapis.com/auth/chat.spaces.readonly
   ```
6. Place the downloaded JSON key at `./credentials/service-account.json` (the `credentials/` directory is git-ignored and volume-mounted into the container).
7. Set `GOOGLE_CREDENTIALS_PATH=/app/credentials/service-account.json` and `GOOGLE_IMPERSONATE_USER=you@yourdomain.com` in your `.env`.

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
| `GOOGLE_IMPERSONATE_USER` | For Google panels | Email of the user to impersonate | `you@company.com` |
| `GOOGLE_CREDENTIALS_PATH` | For Google panels | Path to service account JSON inside container | `/app/credentials/service-account.json` |
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
yarn start   # serves at http://localhost:4200 with proxy to API on :5000
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
