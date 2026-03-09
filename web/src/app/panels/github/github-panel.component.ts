import { Component, OnDestroy, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { GitHubService } from '../../core/api/github.service';
import { CiStatus, CiStatusValue } from '../../core/models/github.model';
import { HubRefreshService } from '../../core/services/hub-refresh.service';

@Component({
  selector: 'app-github-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100" style="border-color:var(--border);">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-github text-accent"></i>
          <span style="font-weight:600;font-size:0.875rem;">Repositories</span>
          @if (openPrTotal() > 0) {
            <span class="badge rounded-pill" style="background:var(--yellow);color:#000;font-size:0.7rem;">
              {{ openPrTotal() }} PR{{ openPrTotal() === 1 ? '' : 's' }}
            </span>
          }
        </div>
        <button class="btn btn-sm p-0" style="color:var(--text-dim);" (click)="sync()" title="Sync now" [disabled]="syncing()">
          <i class="bi bi-arrow-clockwise" [class.spin]="syncing() || loading()"></i>
        </button>
      </div>

      <div class="card-body p-0" style="overflow-y:auto;max-height:400px;">
        @if (loading()) {
          <div class="p-3 d-flex flex-column gap-2">
            @for (i of [1,2,3]; track i) {
              <div style="height:52px;border-radius:6px;background:var(--bg-raised);animation:pulse 1.5s infinite;"></div>
            }
          </div>
        } @else if (error()) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-exclamation-circle d-block mb-1" style="font-size:1.5rem;color:var(--red);"></i>
            {{ error() }}
          </div>
        } @else if (sorted().length === 0) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-github d-block mb-1" style="font-size:1.5rem;"></i>
            No repos yet.<br>
            <span style="font-size:0.75rem;">Add a repo URL in Settings.</span>
          </div>
        } @else {
          @for (s of sorted(); track s.repoFullName) {
            <div class="px-3 py-2 border-bottom repo-row"
                 style="border-color:var(--border) !important;">

              <!-- Top row: repo name + badges + link -->
              <div class="d-flex align-items-center gap-2">
                <a [href]="'https://github.com/' + s.repoFullName" target="_blank" rel="noopener"
                   class="flex-grow-1 text-truncate font-mono"
                   style="font-size:0.78rem;font-weight:600;color:var(--text-white);text-decoration:none;">
                  {{ s.repoFullName }}
                </a>
                @if (s.openPrCount) {
                  <a [href]="'https://github.com/' + s.repoFullName + '/pulls'" target="_blank" rel="noopener"
                     style="font-size:0.68rem;background:var(--yellow);color:#000;border-radius:4px;padding:1px 6px;font-weight:700;text-decoration:none;flex-shrink:0;white-space:nowrap;">
                    {{ s.openPrCount }} PR{{ s.openPrCount === 1 ? '' : 's' }}
                  </a>
                }
                <!-- CI dot -->
                <span [title]="'CI: ' + s.status"
                      style="width:8px;height:8px;border-radius:50%;flex-shrink:0;"
                      [style.background]="statusColor(s.status)"></span>
              </div>

              <!-- Bottom row: branch · time · commit message -->
              <div class="d-flex align-items-baseline gap-1 mt-1" style="font-size:0.7rem;color:var(--text-dim);">
                @if (s.defaultBranch) {
                  <span class="font-mono" style="color:var(--blue);flex-shrink:0;">{{ s.defaultBranch }}</span>
                  <span style="flex-shrink:0;">·</span>
                }
                @if (s.lastPushedAt) {
                  <span style="flex-shrink:0;" [title]="s.lastPushedAt">{{ timeAgo(s.lastPushedAt) }}</span>
                }
                @if (s.lastCommitMessage) {
                  <span style="flex-shrink:0;">·</span>
                  <span class="text-truncate" style="color:var(--text-secondary);font-style:italic;">
                    {{ s.lastCommitMessage }}
                  </span>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      .spin { animation: spin 1s linear infinite; display:inline-block; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .repo-row { transition: background .1s; }
      .repo-row:hover { background: var(--bg-raised) !important; }
    </style>
  `
})
export class GithubPanelComponent implements OnInit, OnDestroy {
  private svc = inject(GitHubService);
  private refreshTimer?: ReturnType<typeof setInterval>;

  statuses = signal<CiStatus[]>([]);
  loading = signal(true);
  syncing = signal(false);
  error = signal<string | null>(null);

  openPrTotal = computed(() => this.statuses().reduce((sum, s) => sum + (s.openPrCount ?? 0), 0));

  /** Sort by lastPushedAt descending (nulls last). */
  sorted = computed(() =>
    [...this.statuses()].sort((a, b) => {
      const ta = a.lastPushedAt ? new Date(a.lastPushedAt).getTime() : 0;
      const tb = b.lastPushedAt ? new Date(b.lastPushedAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return a.repoFullName.localeCompare(b.repoFullName);
    })
  );

  private destroyRef = inject(DestroyRef);
  private hubRefresh = inject(HubRefreshService);

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(), 60_000);
    this.hubRefresh.onRefresh$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
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
        this.error.set(err.error?.error ?? 'Failed to load repos.');
        this.loading.set(false);
      }
    });
  }

  sync() {
    this.syncing.set(true);
    this.error.set(null);
    this.svc.refreshCi().subscribe({
      next: () => { this.syncing.set(false); this.load(); },
      error: (err: { error?: { error?: string } }) => {
        this.error.set(err.error?.error ?? 'Sync failed.');
        this.syncing.set(false);
      }
    });
  }

  statusColor(status: CiStatusValue): string {
    return { Passing: 'var(--green)', Failing: 'var(--red)', Running: 'var(--yellow)', Unknown: 'var(--text-dim)' }[status];
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }
}
