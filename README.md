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

This section walks you through creating a Google OAuth 2.0 application so Nexus can read your Gmail, Calendar, and Chat data. You do **not** need a Google Workspace admin account — any personal or Workspace Google account works.

#### Step 1 — Create a Google Cloud project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top-left of the page (next to the "Google Cloud" logo).
3. Click **New Project**.
4. Name it something like `Nexus Dashboard`, then click **Create**.
5. Make sure your new project is selected in the project dropdown before continuing.

#### Step 2 — Enable the required APIs

1. In the left sidebar, go to **APIs & Services → Library**.
2. Search for and enable each of these three APIs (click the API name, then click **Enable**):
   - **Gmail API**
   - **Google Calendar API**
   - **Google Chat API**

#### Step 3 — Configure the OAuth consent screen

1. In the left sidebar, go to **APIs & Services → OAuth consent screen**.
2. Click **Get started** (or **Configure consent screen** if you've done this before).
3. Fill in:
   - **App name:** `Nexus` (or whatever you like)
   - **User support email:** your email address
4. Under **Audience**, select **External** (unless your org requires Internal).
5. Click through the remaining steps — you can leave optional fields blank.
6. On the **Scopes** step, click **Add or remove scopes** and add these:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/chat.spaces.readonly`
   - `https://www.googleapis.com/auth/chat.messages.readonly`
   - `https://www.googleapis.com/auth/chat.memberships.readonly`
   - `email`
   - `profile`
7. Save and continue through to the summary page.

> **"Testing" mode:** New Google Cloud projects start in "Testing" mode, which limits consent to 100 test users. This is fine for personal/self-hosted use. If you see a warning about this, you can add your own Google email as a test user under **OAuth consent screen → Test users**.

#### Step 4 — Create OAuth credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Under **Authorized redirect URIs**, click **Add URI** and enter:

   | Scenario | Redirect URI |
   |----------|-------------|
   | Local / direct access | `http://localhost:4100/api/google/auth/callback` |
   | Behind a reverse proxy | `https://nexus.example.com/api/google/auth/callback` |

   Use whatever URL you access Nexus from in a browser — that is your redirect URI. The path must be exactly `/api/google/auth/callback`.

5. Click **Create**. Google will show you a **Client ID** and **Client Secret**. Copy both.

#### Step 5 — Configure Nexus

Open your `.env` file and fill in:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

Make sure `NEXUS_BASE_URL` matches the origin you used for the redirect URI:

```env
# Local access (default)
NEXUS_BASE_URL=http://localhost:4100

# Behind a reverse proxy — use the public URL
NEXUS_BASE_URL=https://nexus.example.com
```

Restart Nexus to pick up the changes:

```bash
docker compose up -d
```

#### Step 6 — Connect your account

1. Open Nexus in your browser and go to the **Settings** page.
2. Under **Google Account**, click **Connect Google Account**.
3. You'll be redirected to Google. Sign in and grant the requested permissions.
4. Google redirects you back to Nexus. If everything worked, the Settings page will show your connected email.

Tokens are stored locally in your SQLite database and auto-refresh. You can disconnect at any time from the Settings page.

---

### GitHub (CI monitoring)

This section walks you through creating a GitHub OAuth App so Nexus can read your repositories and CI status.

#### Step 1 — Create a GitHub OAuth App

1. Open [github.com/settings/developers](https://github.com/settings/developers).
   - If you want the OAuth App tied to a GitHub **organization** instead of your personal account, go to `https://github.com/organizations/YOUR-ORG/settings/applications` instead.
2. Click **OAuth Apps** in the left sidebar, then **New OAuth App**.
3. Fill in the form:

   | Field | Local access | Behind a reverse proxy |
   |-------|-------------|----------------------|
   | **Application name** | `Nexus` | `Nexus` |
   | **Homepage URL** | `http://localhost:4100` | `https://nexus.example.com` |
   | **Authorization callback URL** | `http://localhost:4100/api/github/oauth/callback` | `https://nexus.example.com/api/github/oauth/callback` |

   The callback path must be exactly `/api/github/oauth/callback`.

4. Click **Register application**.
5. On the next page, you'll see the **Client ID**. Click **Generate a new client secret** and copy the secret immediately — GitHub only shows it once.

#### Step 2 — Configure Nexus

Open your `.env` file and fill in:

```env
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=abc123def456...
```

Make sure `NEXUS_BASE_URL` matches the origin you used for the callback URL:

```env
# Local access (default)
NEXUS_BASE_URL=http://localhost:4100

# Behind a reverse proxy — use the public URL
NEXUS_BASE_URL=https://nexus.example.com
```

Restart Nexus:

```bash
docker compose up -d
```

#### Step 3 — Connect your account

1. Open Nexus and go to **Settings → GitHub Account**.
2. Click **Connect GitHub Account**.
3. GitHub will ask you to authorize the OAuth App. Click **Authorize**.
4. You'll be redirected back to Nexus. The Settings page will show your connected GitHub username.

#### Step 4 — Add repos to watch

Once connected, use the Settings page to add repositories. Nexus polls GitHub for CI workflow status every 5 minutes by default (configurable via `CI_POLLING_INTERVAL_MINUTES` in `.env`).

> **Fallback — Personal Access Token:** If you don't want to use OAuth, you can set `GITHUB_PAT` in `.env` with a [classic personal access token](https://github.com/settings/tokens) that has `repo` and `read:org` scopes. The OAuth token takes priority when both are present.

---

### GitHub webhooks (optional — real-time CI updates)

Polling works out of the box. Webhooks are optional but give you **instant** CI status updates instead of waiting for the next poll.

> **Requirement:** Webhooks require GitHub to reach your Nexus instance over the internet. This only works if Nexus is deployed on a publicly accessible server (or you use a tunnel like ngrok for local dev).

1. Generate a random secret (e.g. `openssl rand -hex 20`) and add it to your `.env`:
   ```env
   GITHUB_WEBHOOK_SECRET=your-random-secret-here
   ```
2. In the GitHub repo (or org) you want to monitor, go to **Settings → Webhooks → Add webhook**.
3. Fill in:
   - **Payload URL:** `https://nexus.example.com/api/github/webhook` (your public Nexus URL)
   - **Content type:** `application/json`
   - **Secret:** the same secret you put in `.env`
   - Under **Which events would you like to trigger this webhook?**, select **Let me select individual events**, then check only **Workflow runs**.
4. Click **Add webhook**.
5. Restart Nexus: `docker compose up -d`

GitHub will send a ping event to verify the connection. You can check the webhook delivery status on the GitHub webhook settings page.

> If `GITHUB_WEBHOOK_SECRET` is not set, Nexus logs a warning and accepts webhooks without signature verification — not recommended for production.

---

## Environment variables

All config lives in `.env`. See [`.env.example`](.env.example) for the full template with comments.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_PATH` | `/app/data/nexus.db` | SQLite file path inside container |
| `API_KEY` | *(empty)* | If set, all API requests require `X-API-Key` header |
| `NEXUS_BASE_URL` | `http://localhost:4100` | Base URL for OAuth redirect URIs — must match what you enter in Google/GitHub |
| `NEXUS_FRONTEND_URL` | `http://localhost:4100` | Frontend origin for CORS and post-auth redirects |
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
# Edit .env with your values (see next section)
docker compose up -d
```

Open **http://your-server-ip:4100** to verify Nexus is running.

**How it works:** All traffic goes through port `4100` (the web container). Its built-in nginx proxies `/api/` requests — including OAuth callbacks — to the API container internally. You only need to expose **one port**.

**Data persistence:** SQLite lives in a Docker volume (prod) or `./data/` on the host (dev). Back up this directory/volume to preserve all data.

---

## Reverse proxy setup

If you're running Nexus behind a reverse proxy (Caddy, nginx, Traefik, etc.) to get HTTPS and a clean domain name, follow these steps.

### How the architecture works

```
Internet → Your reverse proxy (443) → Nexus web container (4100) → Nexus API container (5000)
                                        ↑ nginx inside this container
                                          proxies /api/* to the API
```

Your reverse proxy only talks to the **web container** on port `4100`. The web container's built-in nginx handles forwarding `/api/` requests to the API container — you do **not** need to set up separate proxy rules for the API.

### Step 1 — Set your environment variables

Both `NEXUS_BASE_URL` and `NEXUS_FRONTEND_URL` must be set to your **public-facing URL** — the one users type into their browser:

```env
NEXUS_BASE_URL=https://nexus.example.com
NEXUS_FRONTEND_URL=https://nexus.example.com
```

These values control:
- **`NEXUS_BASE_URL`** — the redirect URIs sent to Google and GitHub during OAuth. If this doesn't match what you registered in their consoles, auth will fail with a "redirect_uri_mismatch" error.
- **`NEXUS_FRONTEND_URL`** — the allowed CORS origin and where the browser is sent after completing OAuth. If this is wrong, you'll see CORS errors in the browser console or a blank page after auth.

> Both values should be identical unless you have an unusual split-domain setup.

### Step 2 — Update your OAuth provider settings

When you move from `http://localhost:4100` to `https://nexus.example.com`, you **must** update the redirect/callback URLs in both Google and GitHub:

**Google Cloud Console:**
1. Go to **APIs & Services → Credentials** and click your OAuth client.
2. Under **Authorized redirect URIs**, change:
   - `http://localhost:4100/api/google/auth/callback` → `https://nexus.example.com/api/google/auth/callback`
3. Click **Save**. Changes take effect immediately.

**GitHub OAuth App:**
1. Go to [github.com/settings/developers](https://github.com/settings/developers) → your OAuth App.
2. Update:
   - **Homepage URL:** `https://nexus.example.com`
   - **Authorization callback URL:** `https://nexus.example.com/api/github/oauth/callback`
3. Click **Update application**.

### Step 3 — Configure your reverse proxy

Your reverse proxy should forward all traffic to port `4100`. Here are examples for common proxies:

**Caddy** (simplest — auto-HTTPS):
```
nexus.example.com {
    reverse_proxy localhost:4100
}
```

**nginx:**
```nginx
server {
    listen 443 ssl;
    server_name nexus.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed in the future)
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name nexus.example.com;
    return 301 https://$host$request_uri;
}
```

**Traefik** (Docker labels):
```yaml
# Add these labels to the nexus-web service in docker-compose.yml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.nexus.rule=Host(`nexus.example.com`)"
  - "traefik.http.routers.nexus.entrypoints=websecure"
  - "traefik.http.routers.nexus.tls.certresolver=letsencrypt"
  - "traefik.http.services.nexus.loadbalancer.server.port=80"
```

### Step 4 — Restart and verify

```bash
docker compose up -d
```

Test the full flow:
1. Open `https://nexus.example.com` — you should see the Nexus dashboard.
2. Go to **Settings** and connect Google and/or GitHub.
3. After granting permissions, you should be redirected back to `https://nexus.example.com/settings` with a success message.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| **"redirect_uri_mismatch"** from Google or GitHub | The callback URL registered in the provider doesn't match `NEXUS_BASE_URL` | Make sure the URI in Google/GitHub console is exactly `{NEXUS_BASE_URL}/api/google/auth/callback` (or `/api/github/oauth/callback`) |
| **CORS errors** in browser console | `NEXUS_FRONTEND_URL` doesn't match the URL in the browser's address bar | Set `NEXUS_FRONTEND_URL` to exactly what you see in the address bar (including `https://`, no trailing slash) |
| **Blank page after OAuth** | `NEXUS_FRONTEND_URL` is pointing to the wrong host | Double-check that `NEXUS_FRONTEND_URL` is your public URL, not `localhost` |
| **OAuth works but API calls fail** | Reverse proxy not forwarding `/api/` paths | Your proxy must forward **all** paths to port 4100 — don't try to split frontend/API routes at the proxy level |
| **502 Bad Gateway** on `/api/` routes | API container isn't running or hasn't passed healthcheck | Run `docker compose ps` and check if `nexus-api` is healthy. Check logs with `docker compose logs nexus-api` |
| **GitHub webhook returns 400/500** | `GITHUB_WEBHOOK_SECRET` in `.env` doesn't match the secret in GitHub | Make sure both sides use the exact same string — no trailing newline or whitespace |

### Optional: Restrict direct port access

Once your reverse proxy is confirmed working, you can stop exposing ports `4100` and `5100` to the outside world. Change the port bindings in `docker-compose.yml` to listen on localhost only:

```yaml
services:
  nexus-api:
    ports:
      - "127.0.0.1:5100:5000"   # Only accessible from the server itself
  nexus-web:
    ports:
      - "127.0.0.1:4100:80"     # Only accessible from the server itself
```

Your reverse proxy (running on the same server) can still reach `127.0.0.1:4100`, but external traffic must go through the proxy.

> Port `5100` (direct API access) is exposed for debugging but isn't required for normal operation. You can remove it entirely in production.

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
