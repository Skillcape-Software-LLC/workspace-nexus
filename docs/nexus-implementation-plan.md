# Nexus — Phased Implementation Plan
### For use with Claude Code

---

## How to Use This Document

Feed each phase to Claude Code as a discrete session. Each phase is self-contained with explicit acceptance criteria. Complete and verify all criteria before moving to the next phase.

**Stack reference:**
- Backend: .NET Core 8 Web API, Entity Framework Core, SQLite
- Frontend: Angular 19, standalone components, Signals, Angular CDK
- Containerization: Docker, Docker Compose
- Google APIs: Service account + domain-wide delegation (read-only)
- GitHub: Personal Access Token + webhook receiver
- AI: Claude API (`claude-sonnet-4-6`)
- ORM: Dapper (lightweight, no migrations — raw SQL schema init)
- Architecture: Repository pattern, Options pattern, IHostedService

---

## Phase 1 — Solution Scaffold + Docker + Quick Links API

### Goal
A running Docker Compose stack with a .NET Core API that persists Quick Links to SQLite and serves them over HTTP.

### Prompt for Claude Code

```
Scaffold a new solution called Nexus with the following structure:

SOLUTION STRUCTURE:
nexus/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
├── README.md
├── api/
│   ├── Dockerfile
│   ├── Nexus.sln
│   ├── Nexus.API/
│   ├── Nexus.Core/
│   ├── Nexus.Infrastructure/
│   └── Nexus.Tests/
└── web/
    └── (placeholder index.html for now)

REQUIREMENTS:

1. Nexus.Core (class library)
   - Models: QuickLink, Note, CiStatus, Briefing, AppConfig
   - QuickLink properties: Id (Guid), Name, Url, Category, Description, SortOrder (int),
     IsRepo (bool), RepoOwner, RepoName, CreatedAt, UpdatedAt
   - Note properties: Id (Guid), QuickLinkId (Guid FK), Body (markdown string),
     AuthorName, CreatedAt
   - Interfaces: IQuickLinksRepository, INotesRepository
   - IQuickLinksRepository: GetAllAsync, GetByIdAsync, CreateAsync, UpdateAsync,
     DeleteAsync, ReorderAsync(List<Guid> orderedIds)
   - DTOs: QuickLinkDto, CreateQuickLinkRequest, UpdateQuickLinkRequest,
     ReorderQuickLinksRequest

2. Nexus.Infrastructure (class library, references Nexus.Core)
   - Dapper + Microsoft.Data.Sqlite (no EF, no migrations)
   - DbInitializer: static class, CREATE TABLE IF NOT EXISTS for all tables on startup
   - QuickLinksRepository : IQuickLinksRepository using Dapper
   - Connection string derived from NexusOptions.DatabasePath, injected directly

3. Nexus.API (web API, references both)
   - Program.cs: minimal hosting, register services, EF Core, repositories
   - Apply migrations on startup
   - QuickLinksController: full CRUD + reorder endpoint
     - GET    /api/quick-links
     - GET    /api/quick-links/{id}
     - POST   /api/quick-links
     - PUT    /api/quick-links/{id}
     - DELETE /api/quick-links/{id}
     - POST   /api/quick-links/reorder  (body: { ids: [guid, guid, ...] })
   - CORS: allow all origins in development, configurable in production
   - ApiKeyMiddleware: if API_KEY env var is set, validate X-API-Key header on all
     requests; return 401 if missing/invalid. Skip if API_KEY is not configured.
   - Swagger/OpenAPI enabled in development
   - NexusOptions bound from config:
       DatabasePath, ApiKey, GoogleImpersonateUser, GoogleCredentialsPath,
       GitHubPat, GitHubWebhookSecret, ClaudeApiKey, BriefingSchedule

4. Docker
   - api/Dockerfile: multi-stage build (sdk → runtime), exposes port 5000
   - web/Dockerfile: placeholder nginx serving index.html, exposes port 80
   - docker-compose.yml:
       nexus-api: build ./api, port 5000:5000, volumes ./data:/app/data
         and ./credentials:/app/credentials, env_file .env
       nexus-web: build ./web, port 4200:80, depends_on nexus-api
   - docker-compose.dev.yml: overrides for local development with source mounts
   - .env.example: all NexusOptions keys documented with comments

6. .gitignore: exclude .env, *.db, credentials/, bin/, obj/, node_modules/

ACCEPTANCE CRITERIA:
- docker compose up builds and runs without errors
- GET /api/quick-links returns 200 with empty array on fresh start
- POST /api/quick-links creates a record, GET returns it
- DELETE removes it
- POST /api/quick-links/reorder updates sort order
- If API_KEY is set in .env, requests without X-API-Key header return 401
- Swagger UI accessible at http://localhost:5000/swagger in development
```

---

## Phase 2 — Angular 19 App Shell + Quick Links Dashboard UI

### Goal
A fully functional Quick Links dashboard served by the Angular app, talking to the Phase 1 API. No Google integrations yet — just the shell, navigation, and Quick Links CRUD with drag-and-drop reorder.

### Prompt for Claude Code

```
Scaffold the Angular 19 application inside nexus/web/ replacing the placeholder.
The API runs at http://localhost:5000 in development.

REQUIREMENTS:

1. Angular setup
   - Angular 19, standalone components only, no NgModules
   - Routing via provideRouter
   - HttpClient via provideHttpClient
   - Angular CDK (drag-and-drop)
   - Signals and computed() for all reactive state
   - Tailwind CSS is NOT used — use a single global styles.scss with CSS custom
     properties matching the Nexus design system (see Design Tokens below)

2. Design tokens (CSS custom properties in styles.scss)
   --bg-base: #0e0f11
   --bg-panel: #141518
   --bg-raised: #1c1d21
   --bg-hover: #22232a
   --border: #2a2b32
   --border-bright: #3a3b45
   --accent: #f4922a
   --accent-dim: #7a4215
   --accent-glow: rgba(244,146,42,0.15)
   --green: #3ddc84
   --red: #ff5b5b
   --blue: #4fa8e8
   --yellow: #f4c842
   --text-primary: #e8e9ed
   --text-secondary: #8b8d99
   --text-dim: #4e5060
   --font-display: 'Syne', sans-serif
   --font-mono: 'IBM Plex Mono', monospace
   --font-body: 'IBM Plex Sans', sans-serif
   Google Fonts import for Syne (700,800) + IBM Plex Mono (400,500) + IBM Plex Sans (400,500)

3. Core structure
   src/app/
   ├── core/
   │   ├── api/
   │   │   ├── api.config.ts          # API base URL from environment
   │   │   ├── api-key.interceptor.ts # Injects X-API-Key header if configured
   │   │   └── quick-links.service.ts # HTTP calls for Quick Links CRUD + reorder
   │   └── models/
   │       └── quick-link.model.ts    # TypeScript interfaces matching API DTOs
   ├── layout/
   │   ├── topbar/                    # Top navigation bar component
   │   └── shell/                     # Main layout shell component
   ├── features/
   │   └── quick-links/
   │       ├── quick-links-dashboard/ # Main dashboard component
   │       ├── quick-link-card/       # Individual card component
   │       ├── quick-link-form/       # Create/edit form (inline or modal)
   │       └── quick-links.routes.ts
   └── app.routes.ts

4. Top bar (matches mockup)
   - Left: NEXUS logo (Syne font, amber), logo-mark box
   - Center nav tabs: Hub, Links, Notes, Settings (router links)
   - Right: animated status dot, live clock (updates every second), avatar initials
   - Height: 48px, bg-panel, bottom border

5. Quick Links Dashboard
   - Cards grouped by Category with collapsible section headers
   - Each card shows: name, URL (opens in new tab), description, category tag
   - IsRepo cards show a CI status badge placeholder (---, not wired yet)
   - Add button per category + global add button
   - Drag-and-drop reorder within categories using Angular CDK, calls reorder API
     on drop
   - Edit and delete actions on each card (inline or context menu)
   - CreateQuickLinkRequest form fields: Name, Url, Category (text + existing
     category suggestions), Description, IsRepo toggle, RepoOwner + RepoName
     (shown only when IsRepo is true)
   - Empty state: helpful prompt to add first link
   - Loading and error states handled gracefully

6. environments/
   environment.ts:      { apiBaseUrl: 'http://localhost:5000', apiKey: '' }
   environment.prod.ts: { apiBaseUrl: 'http://nexus-api:5000', apiKey: '' }

7. web/Dockerfile update
   - Multi-stage: node build stage → nginx serving dist/
   - nginx.conf: serve index.html for all routes (SPA fallback)

ACCEPTANCE CRITERIA:
- docker compose up serves Angular app at http://localhost:4200
- Quick Links dashboard loads, shows empty state on fresh install
- Can create a quick link with all fields
- Cards render grouped by category
- Drag-and-drop reorder works and persists after page refresh
- Edit and delete work
- IsRepo toggle shows/hides repo fields
- All API errors display a user-facing message (not a blank screen)
- App shell (topbar, nav, clock) renders correctly
```

---

## Phase 3 — Google Service Account Auth + Gmail, Chat, Calendar Panels

### Goal
All three Google Workspace panels functional, pulling live data via the service account credentials file mounted into the container.

### Prompt for Claude Code

```
Implement Google API integration in the Nexus .NET Core API and wire up the
Gmail, Google Chat, and Google Calendar panels in Angular.

REQUIREMENTS:

1. Google Auth service (Nexus.Infrastructure/GoogleServices/GoogleAuthService.cs)
   - Load service account credentials from NexusOptions.GoogleCredentialsPath
   - Use GoogleCredential.FromFile() with CreateScoped() for read-only scopes:
       https://www.googleapis.com/auth/gmail.readonly
       https://www.googleapis.com/auth/chat.messages.readonly
       https://www.googleapis.com/auth/chat.spaces.readonly
       https://www.googleapis.com/auth/calendar.readonly
   - CreateWithUser() to impersonate NexusOptions.GoogleImpersonateUser
   - Register as singleton in DI — credential is reused across requests
   - If credentials file does not exist, log a warning and return null credentials
     (app should still start; Google endpoints return 503 with clear message)
   - NuGet packages: Google.Apis.Gmail.v1, Google.Apis.Calendar.v3,
     Google.Apis.HangoutsChat.v1, Google.Apis.Auth

2. Gmail API service (Nexus.Infrastructure/GoogleServices/GmailService.cs)
   - GetInboxAsync(int maxResults = 20): returns list of message summaries
     - Fields: id, threadId, from, subject, date, isUnread (UNREAD label check)
   - Return type: List<EmailSummaryDto>
   - EmailSummaryDto: Id, ThreadId, From, Subject, ReceivedAt, IsUnread

3. Google Calendar service
   - GetUpcomingEventsAsync(int days = 7): events from now through next N days
   - Return type: List<CalendarEventDto>
   - CalendarEventDto: Id, Title, StartAt, EndAt, Attendees (List<string>),
     MeetUrl (extracted from conferenceData or description), IsAllDay

4. Google Chat service
   - GetSpacesAsync(): list of spaces the impersonated user is in
   - GetRecentMessagesAsync(string spaceName, int maxResults = 10)
   - Return type: List<ChatSpaceDto>, List<ChatMessageDto>
   - ChatSpaceDto: Name, DisplayName, Type (ROOM/DM), UnreadCount (best effort)
   - ChatMessageDto: Name, SenderName, Text, CreatedAt

5. API Controllers
   - GmailController:    GET /api/gmail/inbox?maxResults=20
   - CalendarController: GET /api/calendar/events?days=7
   - ChatController:     GET /api/chat/spaces
                         GET /api/chat/spaces/{spaceName}/messages?maxResults=10
   - All return 503 with { error: "Google credentials not configured" } if
     GoogleAuthService returns null credentials
   - All Google API exceptions caught and returned as 502 with error detail

6. Angular — Gmail Panel (src/app/panels/gmail/)
   - GmailService: HTTP calls to /api/gmail/inbox
   - GmailPanelComponent (standalone):
     - Panel header with unread count badge
     - Scrollable list of EmailRowComponent
     - EmailRowComponent: sender, subject, received time, unread indicator dot
     - Unread rows visually distinct (brighter text)
     - Loading skeleton, error state, empty state
     - Auto-refresh every 5 minutes via interval + Signal

7. Angular — Google Chat Panel (src/app/panels/gchat/)
   - ChatService: HTTP calls to /api/chat/
   - ChatPanelComponent:
     - Sections: Spaces, Direct Messages
     - ChatSpaceRowComponent: avatar (initials + color), name, last message
       preview, unread count badge, timestamp
     - Clicking a space loads its messages inline (expandable)
     - Loading, error, empty states

8. Angular — Calendar Panel (src/app/panels/calendar/)
   - CalendarService: HTTP calls to /api/calendar/events
   - CalendarPanelComponent:
     - Events grouped by date with date header rows
     - CalendarEventComponent: time column, colored left bar, title, attendees,
       Meet URL link
     - Bar color cycles through --blue, --accent, --green, --yellow by index
     - Loading, error, empty states
     - Auto-refresh every 10 minutes

9. Hub layout (src/app/features/hub/)
   - HubComponent: the main view at route /hub (default route)
   - Layout: 3-column bottom row (Gmail | Chat | Calendar), right sidebar
     (GitHub panel placeholder from Phase 4)
   - Top row: Briefing card placeholder ("Briefing will appear here — Phase 6")
   - @defer blocks for each panel with loading fallback

ACCEPTANCE CRITERIA:
- With valid credentials file and GOOGLE_IMPERSONATE_USER set, all three panels
  load real data
- Without credentials file, panels show "Google credentials not configured"
  message — app does not crash
- Gmail unread count badge matches inbox unread count
- Calendar events grouped correctly by date
- Chat spaces list renders with unread indicators
- Meet URLs render as clickable links in calendar events
- All panels auto-refresh on their respective intervals
```

---

## Phase 4 — GitHub Integration + CI Status Badges

### Goal
GitHub CI status displayed as live badges on repo Quick Link cards, updated via webhook.

### Prompt for Claude Code

```
Implement GitHub CI/deploy status monitoring in Nexus.

REQUIREMENTS:

1. CiStatus model (already in Nexus.Core)
   - Ensure properties: RepoFullName (PK, string), Status (enum: Unknown/Passing/
     Failing/Running), Branch, RunUrl, UpdatedAt

2. ICiStatusRepository (Nexus.Core/Interfaces/)
   - GetAllAsync(): List<CiStatusDto>
   - GetByRepoAsync(string repoFullName): CiStatusDto?
   - UpsertAsync(CiStatusDto dto)

3. CiStatusRepository (Nexus.Infrastructure)
   - EF Core implementation using NexusDbContext
   - Add migration for CiStatus table if not already present

4. GitHub webhook receiver (Nexus.API/Controllers/GitHubController.cs)
   - POST /api/github/webhook
   - Validate X-Hub-Signature-256 header using NexusOptions.GitHubWebhookSecret
     - If secret is not configured, skip validation (log warning)
     - If secret is configured and signature is invalid, return 401
   - Handle workflow_run event payload:
       action: "completed" → map conclusion to Status
         "success"   → Passing
         "failure"   → Failing
         "cancelled" → Failing
       action: "in_progress" → Status = Running
   - Upsert CiStatus record with RepoFullName, Status, Branch (head_branch),
     RunUrl (html_url), UpdatedAt
   - Return 200 for all valid payloads, 400 for unrecognized event types
   - Note: disable ApiKeyMiddleware for this endpoint (webhook calls come from
     GitHub, not the frontend)

5. CiStatus API endpoint
   - GET /api/github/ci-status — returns all CiStatus records
   - GET /api/github/ci-status/{owner}/{repo} — returns single record

6. GitHub service for repo metadata (optional enrichment)
   - Nexus.Infrastructure/GitHubService.cs
   - GetRepoAsync(string owner, string repo): uses PAT from NexusOptions.GitHubPat
   - Returns: DefaultBranch, LastPushedAt, OpenIssueCount
   - Used to enrich Quick Link cards — call only when IsRepo = true
   - If GitHubPat is not configured, return null (graceful degradation)
   - NuGet: Octokit

7. Angular — GitHub panel updates
   - CiStatusService: polls GET /api/github/ci-status every 60 seconds
   - Update QuickLinkCardComponent:
     - If IsRepo = true, show CI badge using CiStatus signal
     - Badge states: PASS (green), FAILED (red), RUNNING (yellow, animated),
       UNKNOWN (dim, "---")
     - Badge is a clickable link to RunUrl when available
   - GitHub panel (right sidebar) shows repo cards with CI badges only
     (filtered to IsRepo = true quick links)

8. Webhook setup instructions
   - Add to README.md a section: "GitHub Webhook Setup"
     - Go to repo Settings → Webhooks → Add webhook
     - Payload URL: http://your-host:5000/api/github/webhook
     - Content type: application/json
     - Secret: value of GITHUB_WEBHOOK_SECRET in .env
     - Events: select "Workflow runs" only

ACCEPTANCE CRITERIA:
- Simulating a webhook POST to /api/github/webhook with a valid workflow_run
  payload upserts a CiStatus record
- Invalid signature returns 401 when secret is configured
- GET /api/github/ci-status returns all stored statuses
- Repo quick link cards display correct CI badge
- Badge updates within 60 seconds of a new webhook payload
- App functions normally when GITHUB_PAT and GITHUB_WEBHOOK_SECRET are not set
```

---

## Phase 5 — Project-Scoped Notes

### Goal
Notes drawer functional — append-only, markdown-rendered notes scoped to any Quick Link card, shared across all users of the instance.

### Prompt for Claude Code

```
Implement project-scoped notes in Nexus.

REQUIREMENTS:

1. Notes are already modelled in Nexus.Core and Nexus.Infrastructure from Phase 1.
   Verify INotesRepository is implemented with:
   - GetByQuickLinkIdAsync(Guid quickLinkId): List<NoteDto>
   - CreateAsync(CreateNoteRequest request): NoteDto
   - DeleteAsync(Guid noteId)
   - NoteDto: Id, QuickLinkId, Body, AuthorName, CreatedAt

2. NotesController (Nexus.API/Controllers/NotesController.cs)
   - GET    /api/notes?quickLinkId={guid}  — get notes for a quick link
   - POST   /api/notes                     — create a note
     Body: { quickLinkId: guid, body: string, authorName: string }
   - DELETE /api/notes/{id}               — delete a note

3. AuthorName handling
   - No auth system exists. AuthorName comes from the request body.
   - Store a display name in AppConfig key "DisplayName" (default: "You")
   - GET  /api/config/display-name
   - PUT  /api/config/display-name  body: { value: string }
   - Angular reads this on startup and uses it for all note submissions

4. Angular — Notes feature (src/app/features/notes/)
   - NotesService: HTTP calls to /api/notes and /api/config/display-name
   - NotesDrawerComponent (standalone):
     - Slides in from the right as an overlay panel (CSS transform transition)
     - Header: project name, close button
     - Scrollable list of NoteEntryComponent (newest first)
     - NoteEntryComponent: timestamp, author name, body (rendered as markdown)
     - Markdown rendering: use marked.js (npm install marked)
     - Compose area: textarea + POST NOTE button
     - Author name pre-filled from stored display name
     - Delete button on own notes (by author name match — best effort)
   - Notes count badge on each Quick Link card (show count if > 0)
   - Clicking the notes badge / button on a card opens the drawer for that card

5. Settings page (src/app/features/settings/)
   - Route: /settings
   - Display Name field — reads/writes /api/config/display-name
   - Placeholder sections for future settings (Google credentials status,
     GitHub webhook status, Claude API status) — show configured/not configured
     based on GET /api/health endpoint (see below)

6. Health endpoint (Nexus.API/Controllers/HealthController.cs)
   - GET /api/health
   - Returns configuration status (no secrets, just boolean flags):
     {
       googleCredentials: true/false,
       githubPat: true/false,
       githubWebhookSecret: true/false,
       claudeApiKey: true/false,
       apiKeyEnabled: true/false
     }

ACCEPTANCE CRITERIA:
- Notes drawer opens when clicking notes button on any Quick Link card
- Can create a note with markdown content
- Markdown renders correctly in note entries (bold, code, lists)
- Note count badge on cards reflects current count
- Notes persist across page refresh and docker compose restart
- Display name set in Settings is used for new notes
- GET /api/health returns correct boolean flags
- Settings page shows configuration status for all integrations
```

---

## Phase 6 — AI Daily Briefing *(Roadmap — deferred)*

> **Status: deferred.** The design below is complete and ready to implement. Skipped in favor of shipping Phase 7 (OSS polish) first.

### Goal
An AI-generated daily briefing card at the top of the hub, summarizing the day's calendar, unread emails, and Chat mentions via Claude API.

### Prompt for Claude Code

```
Implement the AI daily briefing feature in Nexus.

REQUIREMENTS:

1. Briefing model (already in Nexus.Core)
   - Verify: Date (string, PK, ISO date "yyyy-MM-dd"), Content (string),
     GeneratedAt (DateTime)

2. IBriefingRepository (Nexus.Core/Interfaces/)
   - GetByDateAsync(string date): BriefingDto?
   - UpsertAsync(BriefingDto dto)

3. BriefingRepository (Nexus.Infrastructure) — EF Core implementation

4. BriefingService (Nexus.Infrastructure/BriefingService.cs)
   - GenerateAsync(string date): BriefingDto
   - Steps:
     a. Check if briefing for today already exists in DB — return cached if found
     b. Fetch data in parallel: CalendarService.GetUpcomingEventsAsync(days:1),
        GmailService.GetInboxAsync(maxResults:10), ChatService.GetSpacesAsync()
     c. If Google credentials not configured, return a placeholder briefing:
        "Google credentials are not configured. Add your service account credentials
         to enable the daily briefing."
     d. Build a prompt (see Prompt Template below)
     e. Call Claude API via Anthropic SDK (Anthropic.SDK NuGet package):
        Use claude-sonnet-4-6, max_tokens: 1024, single user message with the prompt
     f. Extract text from response content
     g. Upsert to DB with today's date, return BriefingDto
   - If ClaudeApiKey is not configured, return placeholder:
     "Claude API key not configured. Add CLAUDE_API_KEY to enable AI briefing."
   - All exceptions caught and logged; return error message as briefing content
     rather than throwing (briefing failure should not crash the app)

5. Prompt template
   ```
   You are a concise executive assistant. Write a 4-6 sentence morning briefing
   for a software engineer and small business owner. Be direct and specific.
   Mention names, counts, and action items. Flag anything urgent.

   Today's date: {date}

   CALENDAR TODAY:
   {calendar events formatted as: "HH:mm — Title (Attendees)"}

   UNREAD EMAILS (most recent first):
   {emails formatted as: "From: Subject"}

   CHAT SPACES WITH ACTIVITY:
   {spaces formatted as: "Space name: unread count messages"}

   Write the briefing now. Do not use bullet points. Do not include a greeting
   like "Good morning". Start directly with the most important information.
   ```

6. BriefingSchedulerService (Nexus.API/BackgroundServices/)
   - IHostedService implementation
   - On startup: check if today's briefing exists in DB; if not, generate it
   - Daily schedule: parse NexusOptions.BriefingSchedule (cron string) to
     determine next run time. Use simple cron parsing (hour + minute only is
     sufficient — this does not need a full cron library)
   - Default schedule: 7:30am server local time
   - Log generation start, completion, and any errors

7. BriefingController
   - GET  /api/briefing/today     — returns today's briefing (generates if missing)
   - POST /api/briefing/regenerate — forces regeneration (ignores cache)

8. Angular — Briefing card (src/app/features/briefing/)
   - BriefingService: HTTP calls to /api/briefing/today
   - BriefingCardComponent:
     - Spans full width above the three panels
     - Left section: "AI Briefing" label, greeting with day/date, status chips
     - Right section: briefing text content
     - Status chips: auto-parsed from content — count meetings, unread emails,
       chat mentions, failed deploys using simple regex on the briefing text
       (best effort — chips are decorative)
     - "Regenerate" button calls POST /api/briefing/regenerate, refreshes card
     - Loading state: animated placeholder lines
     - Accent top border (matches mockup)
   - Load briefing on hub init via @defer

ACCEPTANCE CRITERIA:
- On first load with all credentials configured, briefing card shows AI-generated
  content referencing today's actual calendar, emails, and chat activity
- Briefing is cached — reloading the page does not call Gemini again
- Regenerate button forces a new Gemini call and updates the card
- Without Gemini API key, card shows the placeholder message (no crash)
- Without Google credentials, card shows the credentials placeholder (no crash)
- BriefingSchedulerService logs on startup and generates briefing if missing
- All tests pass
```

---

## Phase 7 — OSS Polish + Production Readiness

### Goal
The repository is ready to publish as an open source project. A new developer can clone it, follow the README, and have a running instance in under 30 minutes.

### Prompt for Claude Code

```
Prepare the Nexus repository for open source release.

REQUIREMENTS:

1. README.md (root) — comprehensive setup guide
   Sections:
   - Hero: project name, one-line description, screenshot placeholder
   - Features: bullet list of the 5 core features
   - Prerequisites: Docker Desktop, Google Workspace admin access,
     GitHub account, Gemini API key (optional)
   - Quick Start:
       git clone ...
       cd nexus
       cp .env.example .env
       # Edit .env with your values
       docker compose up -d
       # Open http://localhost:4200
   - Google Service Account Setup (step-by-step):
       1. Create project in Google Cloud Console
       2. Enable Gmail API, Calendar API, Google Chat API
       3. Create service account
       4. Grant domain-wide delegation
       5. Add OAuth scopes in Google Workspace Admin
       6. Download JSON key → place in ./credentials/service-account.json
   - GitHub Webhook Setup (step-by-step)
   - Environment Variable Reference (table: variable, required, description,
     example value)
   - Development Setup (docker compose -f docker-compose.dev.yml up)
   - Contributing link
   - License

2. CONTRIBUTING.md
   - Project structure overview
   - How to run the API locally (dotnet run)
   - Branch naming: feature/, fix/, docs/
   - PR guidelines: one feature per PR, tests required, description required
   - How to add a new panel (Angular + API steps)
   - Code style: C# follows standard .NET conventions; Angular uses ESLint

3. .github/
   - ISSUE_TEMPLATE/bug_report.md: bug report template
   - ISSUE_TEMPLATE/feature_request.md: feature request template
   - PULL_REQUEST_TEMPLATE.md: PR checklist
   - workflows/ci.yml:
       Triggers: push to main, pull_request
       Jobs:
         api-build:
           - dotnet restore, dotnet build
         web-build:
           - npm ci, ng build
         docker-build:
           - docker compose build (smoke test only, no push)

4. LICENSE — MIT license text with current year

5. Security hardening review
   - Verify .gitignore excludes: .env, *.db, credentials/, **/bin/, **/obj/,
     **/node_modules/, .angular/
   - Verify no secrets appear in any committed file
   - Add SECURITY.md: brief responsible disclosure policy

6. docker-compose.yml review
   - Add healthcheck to nexus-api:
       test: curl -f http://localhost:5000/api/health || exit 1
       interval: 30s, timeout: 10s, retries: 3
   - Add restart: unless-stopped to both services
   - Document all volume mounts with inline comments

7. Final integration smoke test
   - Verify docker compose up -d starts cleanly on a fresh clone with only
     .env configured (no credentials file, no PAT, no Gemini key)
   - All panels should show graceful "not configured" states
   - No unhandled exceptions in API logs
   - Angular app loads without console errors

ACCEPTANCE CRITERIA:
- A developer with no prior context can follow README and get the app running
- CI workflow passes on a clean branch
- No secrets in git history (verify with git log --all)
- docker compose up on a fresh clone with minimal .env shows the app with
  graceful degradation on all unconfigured integrations
- LICENSE file present and correct
- All issue and PR templates present and useful
```

---

## Appendix: Key Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Backend | .NET Core 8 | Team expertise, strong typing, excellent Google API client support |
| Database | SQLite | Zero config, single file, perfect for self-hosted; repo pattern enables swap to Postgres |
| Auth | None (network-level) + optional API key | Internal tool, self-hosted, keeps setup friction minimal |
| Google access | Service account + domain-wide delegation, read-only | No OAuth flow required, no user accounts |
| Scheduling | IHostedService | No external dependencies, runs in-process |
| Frontend state | Angular Signals | Angular 19 native, no NgRx overhead for this app size |
| OSS license | MIT | Maximum adoption and reuse |
| Container | Docker Compose, 2 services | Simple, portable, no Kubernetes overhead |
