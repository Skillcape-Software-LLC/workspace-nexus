import { Component, OnDestroy, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ChatService } from './chat.service';
import { ChatSpace } from '../../core/models/google.model';
import { HubRefreshService } from '../../core/services/hub-refresh.service';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100" style="border-color:var(--border);">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-chat-dots text-accent"></i>
          <span style="font-weight:600;font-size:0.875rem;">Google Chat</span>
          @if (totalUnread() > 0) {
            <span class="badge rounded-pill" style="background:var(--accent);color:#000;font-size:0.68rem;">
              {{ totalUnread() }}
            </span>
          }
        </div>
        <button class="btn btn-sm p-0" style="color:var(--text-dim);" (click)="load()" title="Refresh">
          <i class="bi bi-arrow-clockwise" [class.spin]="loading()"></i>
        </button>
      </div>

      <div class="card-body p-0" style="overflow-y:auto;max-height:340px;">
        @if (loading()) {
          <div class="p-3 d-flex flex-column gap-2">
            @for (i of [1,2,3]; track i) {
              <div style="height:44px;border-radius:6px;background:var(--bg-raised);animation:pulse 1.5s infinite;"></div>
            }
          </div>
        } @else if (error()) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-exclamation-circle d-block mb-1" style="font-size:1.5rem;color:var(--red);"></i>
            {{ error() }}
          </div>
        } @else if (unreadSpaces().length === 0) {
          <div class="p-4 text-center" style="color:var(--text-dim);font-size:0.82rem;">
            <i class="bi bi-check2-all d-block mb-2" style="font-size:1.8rem;color:var(--green);"></i>
            All caught up
          </div>
        } @else {
          @for (space of unreadSpaces(); track space.name) {
            <div (click)="openInChat(space)"
                 class="px-3 py-2 border-bottom d-flex align-items-center gap-2 space-item"
                 style="border-color:var(--border) !important;cursor:pointer;">
              <div class="flex-shrink-0 d-flex align-items-center justify-content-center"
                   [style.border-radius]="space.type === 'DIRECT_MESSAGE' ? '50%' : '8px'"
                   style="width:32px;height:32px;background:var(--accent-dim);color:var(--accent);font-size:0.72rem;font-weight:700;">
                {{ initials(space.displayName) }}
              </div>
              <div class="flex-grow-1 overflow-hidden">
                <div class="text-truncate" style="font-size:0.82rem;font-weight:500;color:var(--text-primary);">
                  {{ space.displayName }}
                </div>
                <div style="font-size:0.7rem;color:var(--text-dim);">
                  {{ space.type === 'DIRECT_MESSAGE' ? 'Direct Message' : 'Space' }}
                </div>
              </div>
              <span class="badge rounded-pill" style="background:var(--accent);color:#000;font-size:0.68rem;">
                {{ space.unreadCount }}
              </span>
              <i class="bi bi-box-arrow-up-right" style="font-size:0.72rem;color:var(--text-dim);"></i>
            </div>
          }
        }
      </div>
    </div>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      .spin { animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .space-item { transition: background .1s; }
      .space-item:hover { background: var(--bg-raised); }
    </style>
  `
})
export class ChatPanelComponent implements OnInit, OnDestroy {
  private svc = inject(ChatService);
  private refreshTimer?: ReturnType<typeof setInterval>;

  spaces = signal<ChatSpace[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  unreadSpaces = computed(() =>
    this.spaces().filter(s => s.unreadCount > 0).sort((a, b) => b.unreadCount - a.unreadCount)
  );

  totalUnread = computed(() =>
    this.spaces().reduce((sum, s) => sum + s.unreadCount, 0)
  );

  private destroyRef = inject(DestroyRef);
  private hubRefresh = inject(HubRefreshService);

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(), 5 * 60 * 1000);
    this.hubRefresh.onRefresh$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  load() {
    if (this.spaces().length === 0) this.loading.set(true);
    this.error.set(null);
    this.svc.getSpaces().subscribe({
      next: (data: ChatSpace[]) => { this.spaces.set(data); this.loading.set(false); },
      error: (err: { error?: { error?: string } }) => {
        if (this.spaces().length === 0) {
          this.error.set(err.error?.error ?? 'Failed to load Chat spaces.');
        }
        this.loading.set(false);
      }
    });
  }

  openInChat(space: ChatSpace) {
    const spaceId = space.name.replace('spaces/', '');
    if (!/^[\w-]+$/.test(spaceId)) return;
    window.open(`https://chat.google.com/room/${spaceId}`, '_blank');
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  }
}
