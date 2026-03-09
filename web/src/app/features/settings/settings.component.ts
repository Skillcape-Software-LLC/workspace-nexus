import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GitHubService } from '../../core/api/github.service';
import { NotesService } from '../../core/api/notes.service';
import { KeyboardShortcutService } from '../../core/services/keyboard-shortcut.service';
import { GoogleAuthService, GoogleAuthStatus } from '../../core/api/google-auth.service';
import { WatchedRepo, GitHubOAuthStatus } from '../../core/models/github.model';
import { HealthStatus } from '../../core/models/note.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h4 class="mb-4" style="font-family:var(--font-display);font-weight:700;">Settings</h4>

    <!-- Display Name -->
    <div class="card mb-4">
      <div class="card-header py-2 px-3">
        <i class="bi bi-person-circle me-2 text-accent"></i>
        <span style="font-weight:600;font-size:0.9rem;">Display Name</span>
      </div>
      <div class="card-body p-3">
        <p class="mb-3" style="font-size:0.82rem;color:var(--text-secondary);">
          Your name shown on notes you post.
        </p>
        <div class="d-flex gap-2 align-items-center" style="max-width:400px;">
          <input class="form-control form-control-sm" [(ngModel)]="displayNameInput"
                 placeholder="Your name" (keydown.enter)="saveDisplayName()" />
          <button class="btn btn-accent btn-sm px-3" (click)="saveDisplayName()"
                  [disabled]="!displayNameInput.trim() || savingName()">
            @if (savingName()) { <span class="spinner-border spinner-border-sm me-1"></span> }
            Save
          </button>
        </div>
        @if (nameSaved()) {
          <div class="mt-2" style="font-size:0.8rem;color:var(--green);">
            <i class="bi bi-check-circle me-1"></i>Saved!
          </div>
        }
      </div>
    </div>

    <!-- Keyboard Shortcuts -->
    <div class="card mb-4">
      <div class="card-header py-2 px-3">
        <i class="bi bi-keyboard me-2 text-accent"></i>
        <span style="font-weight:600;font-size:0.9rem;">Keyboard Shortcuts</span>
      </div>
      <div class="card-body p-3">
        <p class="mb-3" style="font-size:0.82rem;color:var(--text-secondary);">
          Set the leader key for the command palette. Press <kbd style="background:var(--bg-raised);border:1px solid var(--border);border-radius:3px;padding:1px 5px;font-family:var(--font-mono);font-size:0.8rem;">Alt</kbd>
          + your chosen key to open quick actions.
        </p>
        <div class="d-flex gap-2 align-items-center" style="max-width:400px;">
          <div class="d-flex align-items-center gap-2">
            <span style="font-size:0.82rem;color:var(--text-secondary);font-weight:500;">Alt +</span>
            <input class="form-control form-control-sm text-center"
                   style="width:60px;font-family:var(--font-mono);font-weight:600;text-transform:uppercase;"
                   [value]="shortcutSvc.leaderKey().toUpperCase()"
                   maxlength="1"
                   (keydown)="captureLeaderKey($event)" readonly
                   placeholder="Key"
                   title="Click and press any key" />
          </div>
          <span style="font-size:0.75rem;color:var(--text-dim);">Click the box and press any key</span>
        </div>
        @if (leaderKeySaved()) {
          <div class="mt-2" style="font-size:0.8rem;color:var(--green);">
            <i class="bi bi-check-circle me-1"></i>Leader key set to <kbd style="background:var(--bg-raised);border:1px solid var(--border);border-radius:3px;padding:1px 5px;font-family:var(--font-mono);font-size:0.8rem;">{{ shortcutSvc.leaderCombo() }}</kbd>
          </div>
        }
      </div>
    </div>

    <!-- Google Account -->
    <div class="card mb-4">
      <div class="card-header py-2 px-3">
        <i class="bi bi-google me-2 text-accent"></i>
        <span style="font-weight:600;font-size:0.9rem;">Google Account</span>
      </div>
      <div class="card-body p-3">
        @if (loadingGoogle()) {
          <div class="text-center py-2">
            <div class="spinner-border spinner-border-sm" style="color:var(--accent);"></div>
          </div>
        } @else if (googleStatus()?.connected) {
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <span style="font-size:0.875rem;">
                <i class="bi bi-check-circle-fill me-2" style="color:var(--green);"></i>
                Connected
                @if (googleStatus()?.email) {
                  <span style="color:var(--text-secondary);"> as {{ googleStatus()!.email }}</span>
                }
              </span>
              @if (googleConnectedMsg()) {
                <div class="mt-1" style="font-size:0.78rem;color:var(--green);">
                  <i class="bi bi-check-circle me-1"></i>Successfully connected!
                </div>
              }
            </div>
            <button class="btn btn-sm" style="border:1px solid var(--red);color:var(--red);"
                    (click)="disconnectGoogle()" [disabled]="disconnectingGoogle()">
              @if (disconnectingGoogle()) { <span class="spinner-border spinner-border-sm me-1"></span> }
              Disconnect
            </button>
          </div>
        } @else {
          <p class="mb-3" style="font-size:0.82rem;color:var(--text-secondary);">
            Connect your Google account to enable Gmail, Calendar, and Chat integrations.
          </p>
          <button class="btn btn-accent btn-sm" (click)="connectGoogle()">
            <i class="bi bi-google me-2"></i>Connect Google Account
          </button>
        }
      </div>
    </div>

    <!-- GitHub Account -->
    <div class="card mb-4">
      <div class="card-header py-2 px-3">
        <i class="bi bi-github me-2 text-accent"></i>
        <span style="font-weight:600;font-size:0.9rem;">GitHub Account</span>
      </div>
      <div class="card-body p-3">
        @if (loadingGitHub()) {
          <div class="text-center py-2">
            <div class="spinner-border spinner-border-sm" style="color:var(--accent);"></div>
          </div>
        } @else if (githubStatus()?.connected) {
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <span style="font-size:0.875rem;">
                <i class="bi bi-check-circle-fill me-2" style="color:var(--green);"></i>
                Connected
                @if (githubStatus()?.login) {
                  <span style="color:var(--text-secondary);"> as {{ githubStatus()!.login }}</span>
                }
              </span>
              @if (githubConnectedMsg()) {
                <div class="mt-1" style="font-size:0.78rem;color:var(--green);">
                  <i class="bi bi-check-circle me-1"></i>Successfully connected!
                </div>
              }
            </div>
            <button class="btn btn-sm" style="border:1px solid var(--red);color:var(--red);"
                    (click)="disconnectGitHub()" [disabled]="disconnectingGitHub()">
              @if (disconnectingGitHub()) { <span class="spinner-border spinner-border-sm me-1"></span> }
              Disconnect
            </button>
          </div>
        } @else {
          <p class="mb-3" style="font-size:0.82rem;color:var(--text-secondary);">
            Connect your GitHub account via OAuth to enable repo access without a PAT.
          </p>
          <button class="btn btn-accent btn-sm" (click)="connectGitHub()">
            <i class="bi bi-github me-2"></i>Connect GitHub Account
          </button>
        }
      </div>
    </div>

    <!-- GitHub Watched Repos -->
    <div class="card mb-4">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-github text-accent"></i>
          <span style="font-weight:600;font-size:0.9rem;">Watched Repositories</span>
        </div>
        <button class="btn btn-accent btn-sm" (click)="showAddForm.set(!showAddForm())">
          <i class="bi bi-plus-lg me-1"></i> Add Repo
        </button>
      </div>

      @if (showAddForm()) {
        <div class="p-3 border-bottom" style="border-color:var(--border) !important;background:var(--bg-raised);">
          <div class="d-flex gap-2 align-items-end">
            <div class="flex-grow-1">
              <label class="form-label small text-muted-nexus mb-1">GitHub Repo URL</label>
              <input class="form-control form-control-sm" [(ngModel)]="repoUrlInput"
                     placeholder="https://github.com/owner/repo" (keydown.enter)="submitAdd()" />
            </div>
            <button class="btn btn-accent btn-sm px-3" (click)="submitAdd()"
                    [disabled]="!repoUrlInput.trim() || saving()">
              @if (saving()) { <span class="spinner-border spinner-border-sm me-1"></span> }
              Add
            </button>
            <button class="btn btn-sm" style="border:1px solid var(--border);color:var(--text-secondary);"
                    (click)="showAddForm.set(false)">
              Cancel
            </button>
          </div>
          @if (addError()) {
            <div class="mt-2" style="font-size:0.8rem;color:var(--red);">{{ addError() }}</div>
          }
        </div>
      }

      <div class="card-body p-0">
        @if (loadingRepos()) {
          <div class="p-3 text-center">
            <div class="spinner-border spinner-border-sm" style="color:var(--accent);"></div>
          </div>
        } @else if (watchedRepos().length === 0) {
          <div class="p-4 text-center" style="color:var(--text-dim);font-size:0.875rem;">
            <i class="bi bi-github d-block mb-2" style="font-size:2rem;"></i>
            No watched repos yet.<br>
            <span style="font-size:0.8rem;">Add a GitHub repo URL to track its CI status.</span>
          </div>
        } @else {
          <ul class="list-unstyled mb-0">
            @for (r of watchedRepos(); track r.repoFullName) {
              <li class="d-flex align-items-center gap-3 px-3 py-2 border-bottom"
                  style="border-color:var(--border) !important;">
                <i class="bi bi-git" style="color:var(--text-secondary);font-size:1rem;"></i>
                <div class="flex-grow-1">
                  <a [href]="'https://github.com/' + r.repoFullName" target="_blank" rel="noopener"
                     style="font-weight:500;font-size:0.875rem;color:var(--text-primary);text-decoration:none;">
                    {{ r.repoFullName }}
                  </a>
                </div>
                <span style="font-size:0.72rem;color:var(--text-dim);">
                  Added {{ r.addedAt | date:'MMM d, y' }}
                </span>
                <button class="btn btn-sm p-1" style="color:var(--red);" title="Remove"
                        (click)="removeRepo(r.repoFullName)">
                  <i class="bi bi-trash3" style="font-size:0.8rem;"></i>
                </button>
              </li>
            }
          </ul>
        }
      </div>
    </div>

    <!-- Sync Repositories -->
    <div class="card mb-4">
      <div class="card-header py-2 px-3">
        <i class="bi bi-arrow-repeat me-2 text-accent"></i>
        <span style="font-weight:600;font-size:0.9rem;">Sync Repositories</span>
      </div>
      <div class="card-body p-3">
        <p class="mb-3" style="font-size:0.82rem;color:var(--text-secondary);">
          Run a full sync to discover new repositories and refresh all metadata (CI status, PRs, commits).
          This may take a moment.
        </p>
        <button class="btn btn-accent btn-sm" (click)="forceSync()" [disabled]="forceSyncing()">
          @if (forceSyncing()) { <span class="spinner-border spinner-border-sm me-1"></span> }
          <i class="bi bi-arrow-repeat me-1"></i>Force Sync
        </button>
        @if (syncSuccess()) {
          <div class="mt-2" style="font-size:0.8rem;color:var(--green);">
            <i class="bi bi-check-circle me-1"></i>Sync complete!
          </div>
        }
        @if (syncError()) {
          <div class="mt-2" style="font-size:0.8rem;color:var(--red);">
            <i class="bi bi-exclamation-circle me-1"></i>{{ syncError() }}
          </div>
        }
      </div>
    </div>

    <!-- Health Status -->
    <div class="card mb-4">
      <div class="card-header py-2 px-3">
        <i class="bi bi-activity me-2 text-accent"></i>
        <span style="font-weight:600;font-size:0.9rem;">Integration Status</span>
      </div>
      <div class="card-body p-3">
        @if (loadingHealth()) {
          <div class="text-center py-2">
            <div class="spinner-border spinner-border-sm" style="color:var(--accent);"></div>
          </div>
        } @else if (health()) {
          <div class="d-flex flex-wrap gap-2">
            <span class="badge d-flex align-items-center gap-1 px-2 py-1"
                  [style.background]="health()!.googleConnected ? 'rgba(61,220,132,0.12)' : 'rgba(255,91,91,0.12)'"
                  [style.color]="health()!.googleConnected ? 'var(--green)' : 'var(--red)'"
                  style="border:1px solid transparent;font-size:0.75rem;font-weight:500;">
              <i [class]="health()!.googleConnected ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
              Google
            </span>
            <span class="badge d-flex align-items-center gap-1 px-2 py-1"
                  [style.background]="health()!.githubConnected ? 'rgba(61,220,132,0.12)' : 'rgba(255,91,91,0.12)'"
                  [style.color]="health()!.githubConnected ? 'var(--green)' : 'var(--red)'"
                  style="border:1px solid transparent;font-size:0.75rem;font-weight:500;">
              <i [class]="health()!.githubConnected ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
              GitHub
            </span>
            <span class="badge d-flex align-items-center gap-1 px-2 py-1"
                  [style.background]="health()!.githubWebhookSecret ? 'rgba(61,220,132,0.12)' : 'rgba(255,91,91,0.12)'"
                  [style.color]="health()!.githubWebhookSecret ? 'var(--green)' : 'var(--red)'"
                  style="border:1px solid transparent;font-size:0.75rem;font-weight:500;">
              <i [class]="health()!.githubWebhookSecret ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
              Webhook Secret
            </span>
            <span class="badge d-flex align-items-center gap-1 px-2 py-1"
                  [style.background]="health()!.claudeApiKey ? 'rgba(61,220,132,0.12)' : 'rgba(255,91,91,0.12)'"
                  [style.color]="health()!.claudeApiKey ? 'var(--green)' : 'var(--red)'"
                  style="border:1px solid transparent;font-size:0.75rem;font-weight:500;">
              <i [class]="health()!.claudeApiKey ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
              Claude API Key
            </span>
            <span class="badge d-flex align-items-center gap-1 px-2 py-1"
                  [style.background]="health()!.apiKeyEnabled ? 'rgba(61,220,132,0.12)' : 'rgba(255,91,91,0.12)'"
                  [style.color]="health()!.apiKeyEnabled ? 'var(--green)' : 'var(--text-dim)'"
                  style="border:1px solid transparent;font-size:0.75rem;font-weight:500;">
              <i [class]="health()!.apiKeyEnabled ? 'bi bi-lock-fill' : 'bi bi-unlock'"></i>
              API Key Auth {{ health()!.apiKeyEnabled ? 'On' : 'Off' }}
            </span>
          </div>
        }
      </div>
    </div>

  `
})
export class SettingsComponent implements OnInit {
  private ghSvc = inject(GitHubService);
  private notesSvc = inject(NotesService);
  private googleAuthSvc = inject(GoogleAuthService);
  private route = inject(ActivatedRoute);
  shortcutSvc = inject(KeyboardShortcutService);

  leaderKeySaved = signal(false);

  watchedRepos = signal<WatchedRepo[]>([]);
  loadingRepos = signal(true);
  showAddForm = signal(false);
  saving = signal(false);
  addError = signal<string | null>(null);
  repoUrlInput = '';

  displayNameInput = '';
  savingName = signal(false);
  nameSaved = signal(false);

  health = signal<HealthStatus | null>(null);
  loadingHealth = signal(true);

  googleStatus = signal<GoogleAuthStatus | null>(null);
  loadingGoogle = signal(true);
  disconnectingGoogle = signal(false);
  googleConnectedMsg = signal(false);

  githubStatus = signal<GitHubOAuthStatus | null>(null);
  loadingGitHub = signal(true);
  disconnectingGitHub = signal(false);
  githubConnectedMsg = signal(false);

  forceSyncing = signal(false);
  syncSuccess = signal(false);
  syncError = signal<string | null>(null);

  ngOnInit() {
    this.loadRepos();
    this.loadDisplayName();
    this.loadHealth();
    this.loadGoogleStatus();
    this.loadGitHubStatus();

    this.route.queryParams.subscribe(params => {
      if (params['google'] === 'connected') {
        this.googleConnectedMsg.set(true);
        setTimeout(() => this.googleConnectedMsg.set(false), 4000);
      }
      if (params['github'] === 'connected') {
        this.githubConnectedMsg.set(true);
        this.loadGitHubStatus();
        this.loadHealth();
        setTimeout(() => this.githubConnectedMsg.set(false), 4000);
      }
    });
  }

  loadGoogleStatus() {
    this.loadingGoogle.set(true);
    this.googleAuthSvc.getStatus().subscribe({
      next: status => { this.googleStatus.set(status); this.loadingGoogle.set(false); },
      error: () => this.loadingGoogle.set(false)
    });
  }

  connectGoogle() {
    this.googleAuthSvc.startAuth().subscribe({
      next: ({ authUrl }) => { window.location.href = authUrl; },
      error: () => {}
    });
  }

  disconnectGoogle() {
    this.disconnectingGoogle.set(true);
    this.googleAuthSvc.disconnect().subscribe({
      next: () => {
        this.disconnectingGoogle.set(false);
        this.loadGoogleStatus();
        this.loadHealth();
      },
      error: () => this.disconnectingGoogle.set(false)
    });
  }

  loadGitHubStatus() {
    this.loadingGitHub.set(true);
    this.ghSvc.getOAuthStatus().subscribe({
      next: status => { this.githubStatus.set(status); this.loadingGitHub.set(false); },
      error: () => this.loadingGitHub.set(false)
    });
  }

  connectGitHub() {
    this.ghSvc.startAuth().subscribe({
      next: ({ authUrl }) => { window.location.href = authUrl; },
      error: () => {}
    });
  }

  disconnectGitHub() {
    this.disconnectingGitHub.set(true);
    this.ghSvc.disconnect().subscribe({
      next: () => {
        this.disconnectingGitHub.set(false);
        this.loadGitHubStatus();
        this.loadHealth();
      },
      error: () => this.disconnectingGitHub.set(false)
    });
  }

  loadRepos() {
    this.loadingRepos.set(true);
    this.ghSvc.getWatchedRepos().subscribe({
      next: (data: WatchedRepo[]) => { this.watchedRepos.set(data); this.loadingRepos.set(false); },
      error: () => { this.loadingRepos.set(false); }
    });
  }

  loadDisplayName() {
    this.notesSvc.getDisplayName().subscribe({
      next: r => { this.displayNameInput = r.value; },
      error: () => {}
    });
  }

  saveDisplayName() {
    const val = this.displayNameInput.trim();
    if (!val) return;
    this.savingName.set(true);
    this.notesSvc.setDisplayName(val).subscribe({
      next: () => {
        this.savingName.set(false);
        this.nameSaved.set(true);
        setTimeout(() => this.nameSaved.set(false), 2000);
      },
      error: () => this.savingName.set(false)
    });
  }

  captureLeaderKey(e: KeyboardEvent) {
    e.preventDefault();
    const key = e.key;
    if (key === 'Alt' || key === 'Control' || key === 'Shift' || key === 'Meta' || key === 'Tab' || key === 'Escape') return;
    this.shortcutSvc.setLeaderKey(key);
    this.leaderKeySaved.set(true);
    setTimeout(() => this.leaderKeySaved.set(false), 2000);
  }

  loadHealth() {
    this.loadingHealth.set(true);
    this.notesSvc.getHealth().subscribe({
      next: h => { this.health.set(h); this.loadingHealth.set(false); },
      error: () => this.loadingHealth.set(false)
    });
  }

  submitAdd() {
    const url = this.repoUrlInput.trim();
    if (!url) return;

    this.saving.set(true);
    this.addError.set(null);

    this.ghSvc.addWatchedRepo({ repoUrl: url }).subscribe({
      next: (created: WatchedRepo) => {
        this.watchedRepos.update(all => [...all, created]);
        this.repoUrlInput = '';
        this.showAddForm.set(false);
        this.saving.set(false);
      },
      error: (err: { error?: { error?: string }; status?: number }) => {
        this.addError.set(err.error?.error ?? 'Failed to add repo.');
        this.saving.set(false);
      }
    });
  }

  forceSync() {
    this.forceSyncing.set(true);
    this.syncSuccess.set(false);
    this.syncError.set(null);
    this.ghSvc.forceSync().subscribe({
      next: () => {
        this.forceSyncing.set(false);
        this.syncSuccess.set(true);
        setTimeout(() => this.syncSuccess.set(false), 3000);
      },
      error: (err: { error?: { error?: string } }) => {
        this.syncError.set(err.error?.error ?? 'Sync failed.');
        this.forceSyncing.set(false);
      }
    });
  }

  removeRepo(repoFullName: string) {
    if (!confirm(`Stop watching "${repoFullName}"?`)) return;
    this.ghSvc.deleteWatchedRepo(repoFullName).subscribe({
      next: () => this.watchedRepos.update(all => all.filter(r => r.repoFullName !== repoFullName)),
      error: () => {}
    });
  }
}
