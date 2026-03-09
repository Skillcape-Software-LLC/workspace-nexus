import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GitHubService } from '../../core/api/github.service';
import { NotesService } from '../../core/api/notes.service';
import { GoogleAuthService, GoogleAuthStatus } from '../../core/api/google-auth.service';
import { WatchedAccount, GitHubAccountType } from '../../core/models/github.model';
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

    <!-- GitHub Watched Accounts -->
    <div class="card mb-4">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-github text-accent"></i>
          <span style="font-weight:600;font-size:0.9rem;">GitHub Watched Accounts</span>
        </div>
        <button class="btn btn-accent btn-sm" (click)="showAddForm.set(!showAddForm())">
          <i class="bi bi-plus-lg me-1"></i> Add Account
        </button>
      </div>

      @if (showAddForm()) {
        <div class="p-3 border-bottom" style="border-color:var(--border) !important;background:var(--bg-raised);">
          <div class="row g-2 align-items-end">
            <div class="col-12 col-sm-5">
              <label class="form-label small text-muted-nexus mb-1">GitHub Username or Org</label>
              <input class="form-control form-control-sm" [(ngModel)]="addForm.accountName"
                     placeholder="e.g. octocat" (keydown.enter)="submitAdd()" />
            </div>
            <div class="col-12 col-sm-3">
              <label class="form-label small text-muted-nexus mb-1">Type</label>
              <select class="form-select form-select-sm" [(ngModel)]="addForm.accountType">
                <option value="user">User</option>
                <option value="org">Organization</option>
              </select>
            </div>
            <div class="col-12 col-sm-4 d-flex gap-2">
              <button class="btn btn-accent btn-sm flex-grow-1" (click)="submitAdd()"
                      [disabled]="!addForm.accountName.trim() || saving()">
                @if (saving()) { <span class="spinner-border spinner-border-sm me-1"></span> }
                Add
              </button>
              <button class="btn btn-sm" style="border:1px solid var(--border);color:var(--text-secondary);"
                      (click)="showAddForm.set(false)">
                Cancel
              </button>
            </div>
          </div>
          @if (addError()) {
            <div class="mt-2" style="font-size:0.8rem;color:var(--red);">{{ addError() }}</div>
          }
        </div>
      }

      <div class="card-body p-0">
        @if (loadingAccounts()) {
          <div class="p-3 text-center">
            <div class="spinner-border spinner-border-sm" style="color:var(--accent);"></div>
          </div>
        } @else if (accounts().length === 0) {
          <div class="p-4 text-center" style="color:var(--text-dim);font-size:0.875rem;">
            <i class="bi bi-github d-block mb-2" style="font-size:2rem;"></i>
            No watched accounts yet.<br>
            <span style="font-size:0.8rem;">Add a GitHub user or org to track all their repos' CI status.</span>
          </div>
        } @else {
          <ul class="list-unstyled mb-0">
            @for (acct of accounts(); track acct.accountName) {
              <li class="d-flex align-items-center gap-3 px-3 py-2 border-bottom"
                  style="border-color:var(--border) !important;">
                <i [class]="acct.accountType === 'org' ? 'bi bi-building' : 'bi bi-person'"
                   style="color:var(--text-secondary);font-size:1rem;"></i>
                <div class="flex-grow-1">
                  <span style="font-weight:500;font-size:0.875rem;">{{ acct.accountName }}</span>
                  <span class="badge ms-2"
                        style="background:var(--bg-hover);color:var(--text-secondary);font-size:0.68rem;border:1px solid var(--border);">
                    {{ acct.accountType }}
                  </span>
                </div>
                <span style="font-size:0.72rem;color:var(--text-dim);">
                  Added {{ acct.addedAt | date:'MMM d, y' }}
                </span>
                <button class="btn btn-sm p-1" style="color:var(--red);" title="Remove"
                        (click)="removeAccount(acct.accountName)">
                  <i class="bi bi-trash3" style="font-size:0.8rem;"></i>
                </button>
              </li>
            }
          </ul>
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
                  [style.background]="health()!.githubPat ? 'rgba(61,220,132,0.12)' : 'rgba(255,91,91,0.12)'"
                  [style.color]="health()!.githubPat ? 'var(--green)' : 'var(--red)'"
                  style="border:1px solid transparent;font-size:0.75rem;font-weight:500;">
              <i [class]="health()!.githubPat ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
              GitHub PAT
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

    <!-- AI Briefing placeholder -->
    <div class="card mb-3" style="border-color:var(--border);opacity:0.6;">
      <div class="card-header py-2 px-3" style="font-size:0.875rem;font-weight:600;">
        <i class="bi bi-stars me-2 text-muted-nexus"></i>AI Briefing
        <span class="badge ms-2" style="background:var(--bg-hover);color:var(--text-dim);font-size:0.68rem;">Phase 6</span>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private ghSvc = inject(GitHubService);
  private notesSvc = inject(NotesService);
  private googleAuthSvc = inject(GoogleAuthService);
  private route = inject(ActivatedRoute);

  accounts = signal<WatchedAccount[]>([]);
  loadingAccounts = signal(true);
  showAddForm = signal(false);
  saving = signal(false);
  addError = signal<string | null>(null);

  displayNameInput = '';
  savingName = signal(false);
  nameSaved = signal(false);

  health = signal<HealthStatus | null>(null);
  loadingHealth = signal(true);

  googleStatus = signal<GoogleAuthStatus | null>(null);
  loadingGoogle = signal(true);
  disconnectingGoogle = signal(false);
  googleConnectedMsg = signal(false);

  addForm = { accountName: '', accountType: 'user' as GitHubAccountType };

  ngOnInit() {
    this.loadAccounts();
    this.loadDisplayName();
    this.loadHealth();
    this.loadGoogleStatus();

    this.route.queryParams.subscribe(params => {
      if (params['google'] === 'connected') {
        this.googleConnectedMsg.set(true);
        setTimeout(() => this.googleConnectedMsg.set(false), 4000);
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

  loadAccounts() {
    this.loadingAccounts.set(true);
    this.ghSvc.getWatchedAccounts().subscribe({
      next: (data: WatchedAccount[]) => { this.accounts.set(data); this.loadingAccounts.set(false); },
      error: () => { this.loadingAccounts.set(false); }
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

  loadHealth() {
    this.loadingHealth.set(true);
    this.notesSvc.getHealth().subscribe({
      next: h => { this.health.set(h); this.loadingHealth.set(false); },
      error: () => this.loadingHealth.set(false)
    });
  }

  submitAdd() {
    const name = this.addForm.accountName.trim();
    if (!name) return;

    this.saving.set(true);
    this.addError.set(null);

    this.ghSvc.addWatchedAccount({ accountName: name, accountType: this.addForm.accountType }).subscribe({
      next: (created: WatchedAccount) => {
        this.accounts.update(all => [...all, created]);
        this.addForm.accountName = '';
        this.showAddForm.set(false);
        this.saving.set(false);
      },
      error: (err: { error?: { error?: string }; status?: number }) => {
        this.addError.set(err.error?.error ?? 'Failed to add account.');
        this.saving.set(false);
      }
    });
  }

  removeAccount(accountName: string) {
    if (!confirm(`Stop watching "${accountName}"?`)) return;
    this.ghSvc.deleteWatchedAccount(accountName).subscribe({
      next: () => this.accounts.update(all => all.filter(a => a.accountName !== accountName)),
      error: () => {}
    });
  }
}
