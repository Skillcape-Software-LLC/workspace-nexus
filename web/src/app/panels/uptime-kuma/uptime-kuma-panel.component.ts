import { Component, OnDestroy, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { UptimeKumaService } from '../../core/api/uptime-kuma.service';
import { UptimeKumaMonitor, MonitorStatusValue } from '../../core/models/uptime-kuma.model';
import { HubRefreshService } from '../../core/services/hub-refresh.service';

@Component({
  selector: 'app-uptime-kuma-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100" style="border-color:var(--border);">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-heart-pulse text-accent"></i>
          <span style="font-weight:600;font-size:0.875rem;">Monitors</span>
          @if (downCount() > 0) {
            <span class="badge rounded-pill" style="background:var(--red);color:#fff;font-size:0.7rem;">
              {{ downCount() }} Down
            </span>
          } @else if (upCount() > 0) {
            <span class="badge rounded-pill" style="background:var(--green);color:#000;font-size:0.7rem;">
              {{ upCount() }} Up
            </span>
          }
        </div>
        <button class="btn btn-sm p-0" style="color:var(--text-dim);" (click)="sync()" title="Sync now" [disabled]="syncing()">
          <i class="bi bi-arrow-clockwise" [class.spin]="syncing() || loading()"></i>
        </button>
      </div>

      <!-- Tag filter chips -->
      @if (allTags().length > 0) {
        <div class="px-3 py-2 d-flex flex-wrap gap-1" style="border-bottom:1px solid var(--border);">
          <button class="tag-chip" [class.active]="activeTag() === null" (click)="activeTag.set(null)">All</button>
          @for (tag of allTags(); track tag) {
            <button class="tag-chip" [class.active]="activeTag() === tag" (click)="toggleTag(tag)">{{ tag }}</button>
          }
        </div>
      }

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
            <i class="bi bi-heart-pulse d-block mb-1" style="font-size:1.5rem;"></i>
            No monitors configured.<br>
            <span style="font-size:0.75rem;">Set UPTIME_KUMA_BASE_URL and UPTIME_KUMA_API_KEY.</span>
          </div>
        } @else {
          @for (m of sorted(); track m.monitorId) {
            <div class="px-3 py-2 border-bottom monitor-row"
                 style="border-color:var(--border) !important;">

              <!-- Top row: status dot + name + type badge -->
              <div class="d-flex align-items-center gap-2">
                <span [title]="m.status"
                      style="width:8px;height:8px;border-radius:50%;flex-shrink:0;"
                      [style.background]="statusColor(m.status)"></span>
                <span class="flex-grow-1 text-truncate font-mono"
                      style="font-size:0.78rem;font-weight:600;color:var(--text-white);">
                  {{ m.name }}
                </span>
                <span style="font-size:0.65rem;background:var(--bg-raised);color:var(--text-dim);border-radius:4px;padding:1px 6px;flex-shrink:0;">
                  {{ m.type }}
                </span>
              </div>

              <!-- Bottom row: url + metrics + time ago -->
              <div class="d-flex align-items-baseline gap-1 mt-1 flex-wrap" style="font-size:0.7rem;color:var(--text-dim);">
                @if (m.url && m.url !== 'https://') {
                  <a [href]="m.url" target="_blank" rel="noopener"
                     class="text-truncate" style="color:var(--text-secondary);text-decoration:none;">
                    {{ m.url }}
                  </a>
                  <span style="flex-shrink:0;">·</span>
                }
                @if (m.responseTimeMs >= 0) {
                  <span style="flex-shrink:0;color:var(--text-secondary);">{{ m.responseTimeMs }}ms</span>
                  <span style="flex-shrink:0;">·</span>
                }
                @if (m.certDaysRemaining !== null && m.certDaysRemaining !== undefined) {
                  <span style="flex-shrink:0;"
                        [style.color]="m.certDaysRemaining <= 14 ? 'var(--red)' : m.certDaysRemaining <= 30 ? 'var(--yellow)' : 'var(--text-secondary)'">
                    <i class="bi bi-shield-lock" style="font-size:0.65rem;"></i> {{ m.certDaysRemaining }}d
                  </span>
                  <span style="flex-shrink:0;">·</span>
                }
                <span style="flex-shrink:0;" [title]="m.updatedAt">{{ timeAgo(m.updatedAt) }}</span>
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
      .monitor-row { transition: background .1s; }
      .monitor-row:hover { background: var(--bg-raised) !important; }
      .tag-chip {
        background: var(--bg-raised);
        color: var(--text-dim);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1px 10px;
        font-size: 0.7rem;
        cursor: pointer;
        transition: all .15s;
        white-space: nowrap;
      }
      .tag-chip:hover { border-color: var(--accent); color: var(--text-white); }
      .tag-chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    </style>
  `
})
export class UptimeKumaPanelComponent implements OnInit, OnDestroy {
  private svc = inject(UptimeKumaService);
  private refreshTimer?: ReturnType<typeof setInterval>;

  monitors = signal<UptimeKumaMonitor[]>([]);
  loading = signal(true);
  syncing = signal(false);
  error = signal<string | null>(null);
  activeTag = signal<string | null>(null);

  allTags = computed(() => {
    const tags = new Set<string>();
    for (const m of this.monitors()) {
      for (const t of m.tags ?? []) {
        if (t.name) tags.add(t.name);
      }
    }
    return [...tags].sort();
  });

  filteredMonitors = computed(() => {
    const tag = this.activeTag();
    if (!tag) return this.monitors();
    return this.monitors().filter(m => m.tags?.some(t => t.name === tag));
  });

  private statusOrder: Record<string, number> = { Down: 0, Pending: 1, Up: 2, Maintenance: 3, Unknown: 4 };

  sorted = computed(() =>
    [...this.filteredMonitors()].sort((a, b) => {
      const sa = this.statusOrder[a.status] ?? 4;
      const sb = this.statusOrder[b.status] ?? 4;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    })
  );

  upCount = computed(() => this.monitors().filter(m => m.status === 'Up').length);
  downCount = computed(() => this.monitors().filter(m => m.status === 'Down').length);

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
    if (this.monitors().length === 0) this.loading.set(true);
    this.error.set(null);
    this.svc.getMonitors().subscribe({
      next: (data: UptimeKumaMonitor[]) => { this.monitors.set(data); this.loading.set(false); },
      error: (err: { error?: { error?: string } }) => {
        if (this.monitors().length === 0) {
          this.error.set(err.error?.error ?? 'Failed to load monitors.');
        }
        this.loading.set(false);
      }
    });
  }

  sync() {
    this.syncing.set(true);
    this.error.set(null);
    this.svc.sync().subscribe({
      next: () => { this.syncing.set(false); this.load(); },
      error: (err: { error?: { error?: string } }) => {
        this.error.set(err.error?.error ?? 'Sync failed.');
        this.syncing.set(false);
      }
    });
  }

  toggleTag(tag: string) {
    this.activeTag.set(this.activeTag() === tag ? null : tag);
  }

  statusColor(status: MonitorStatusValue): string {
    return {
      Up: 'var(--green)',
      Down: 'var(--red)',
      Pending: 'var(--yellow)',
      Maintenance: 'var(--blue)',
      Unknown: 'var(--text-dim)'
    }[status];
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
