import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitHubService } from '../../core/api/github.service';
import { CiStatus, CiStatusValue } from '../../core/models/github.model';

@Component({
  selector: 'app-github-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100" style="border-color:var(--border);">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-github text-accent"></i>
          <span style="font-weight:600;font-size:0.875rem;">CI Status</span>
          @if (failingCount() > 0) {
            <span class="badge rounded-pill" style="background:var(--red);color:#fff;font-size:0.7rem;">
              {{ failingCount() }} failing
            </span>
          }
        </div>
        <button class="btn btn-sm p-0" style="color:var(--text-dim);" (click)="load()" title="Refresh">
          <i class="bi bi-arrow-clockwise" [class.spin]="loading()"></i>
        </button>
      </div>

      <div class="card-body p-0" style="overflow-y:auto;max-height:400px;">
        @if (loading()) {
          <div class="p-3 d-flex flex-column gap-2">
            @for (i of [1,2,3]; track i) {
              <div style="height:36px;border-radius:6px;background:var(--bg-raised);animation:pulse 1.5s infinite;"></div>
            }
          </div>
        } @else if (error()) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-exclamation-circle d-block mb-1" style="font-size:1.5rem;color:var(--red);"></i>
            {{ error() }}
          </div>
        } @else if (statuses().length === 0) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-github d-block mb-1" style="font-size:1.5rem;"></i>
            No CI data yet.<br>
            <span style="font-size:0.75rem;">Add a watched account or repo link, then wait for the next poll.</span>
          </div>
        } @else {
          <!-- Watched account groups -->
          @for (group of accountGroups(); track group.account) {
            <div class="px-3 pt-2 pb-1 sticky-top d-flex align-items-center gap-1"
                 style="background:var(--bg-panel);font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border);">
              <i class="bi bi-building" style="font-size:0.75rem;"></i>
              {{ group.account }}
              <span class="ms-auto">{{ group.statuses.length }} repos</span>
            </div>
            @for (s of group.statuses; track s.repoFullName) {
              <ng-container *ngTemplateOutlet="statusRow; context: { $implicit: s }"></ng-container>
            }
          }

          <!-- Individual repos -->
          @if (individualStatuses().length > 0) {
            @if (accountGroups().length > 0) {
              <div class="px-3 pt-2 pb-1 sticky-top"
                   style="background:var(--bg-panel);font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border);">
                Individual Repos
              </div>
            }
            @for (s of individualStatuses(); track s.repoFullName) {
              <ng-container *ngTemplateOutlet="statusRow; context: { $implicit: s }"></ng-container>
            }
          }
        }
      </div>
    </div>

    <ng-template #statusRow let-s>
      <div class="px-3 py-2 border-bottom d-flex align-items-center gap-2"
           style="border-color:var(--border) !important;">
        <span [style.color]="statusColor(s.status)" style="font-size:0.85rem;">
          <i [class]="statusIcon(s.status)" [class.spin]="s.status === 'Running'"></i>
        </span>
        <span class="flex-grow-1 text-truncate font-mono" style="font-size:0.75rem;color:var(--text-primary);">
          {{ repoName(s.repoFullName) }}
        </span>
        @if (s.branch) {
          <span class="font-mono" style="font-size:0.68rem;color:var(--text-dim);">{{ s.branch }}</span>
        }
        @if (s.runUrl) {
          <a [href]="s.runUrl" target="_blank" rel="noopener noreferrer"
             style="color:var(--text-dim);font-size:0.75rem;" (click)="$event.stopPropagation()">
            <i class="bi bi-box-arrow-up-right"></i>
          </a>
        }
      </div>
    </ng-template>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      .spin { animation: spin 1s linear infinite; display:inline-block; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `
})
export class GithubPanelComponent implements OnInit, OnDestroy {
  private svc = inject(GitHubService);
  private refreshTimer?: ReturnType<typeof setInterval>;

  statuses = signal<CiStatus[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  failingCount = computed(() => this.statuses().filter(s => s.status === 'Failing').length);

  accountGroups = computed(() => {
    const groups: Record<string, CiStatus[]> = {};
    for (const s of this.statuses()) {
      if (s.sourceAccount) {
        if (!groups[s.sourceAccount]) groups[s.sourceAccount] = [];
        groups[s.sourceAccount].push(s);
      }
    }
    return Object.entries(groups).map(([account, statuses]) => ({ account, statuses }));
  });

  individualStatuses = computed(() => this.statuses().filter(s => !s.sourceAccount));

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(), 60_000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getCiStatuses().subscribe({
      next: (data: CiStatus[]) => { this.statuses.set(data); this.loading.set(false); },
      error: (err: { error?: { error?: string } }) => {
        this.error.set(err.error?.error ?? 'Failed to load CI statuses.');
        this.loading.set(false);
      }
    });
  }

  statusColor(status: CiStatusValue): string {
    return { Passing: 'var(--green)', Failing: 'var(--red)', Running: 'var(--yellow)', Unknown: 'var(--text-dim)' }[status];
  }

  statusIcon(status: CiStatusValue): string {
    return {
      Passing: 'bi bi-check-circle-fill',
      Failing: 'bi bi-x-circle-fill',
      Running: 'bi bi-arrow-clockwise',
      Unknown: 'bi bi-dash-circle'
    }[status];
  }

  repoName(fullName: string): string {
    return fullName.split('/')[1] ?? fullName;
  }
}
