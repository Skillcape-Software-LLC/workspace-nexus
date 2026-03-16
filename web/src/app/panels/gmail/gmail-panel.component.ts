import { Component, OnDestroy, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { GmailService } from './gmail.service';
import { EmailSummary } from '../../core/models/google.model';
import { HubRefreshService } from '../../core/services/hub-refresh.service';

@Component({
  selector: 'app-gmail-panel',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="card h-100" style="border-color:var(--border);">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-envelope text-accent"></i>
          <span style="font-weight:600;font-size:0.875rem;">Gmail</span>
          @if (unreadEmails().length > 0) {
            <span class="badge rounded-pill" style="background:var(--accent);color:#000;font-size:0.7rem;">
              {{ unreadEmails().length }}
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
            @for (i of [1,2,3,4,5]; track i) {
              <div style="height:40px;border-radius:6px;background:var(--bg-raised);animation:pulse 1.5s infinite;"></div>
            }
          </div>
        } @else if (error()) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-exclamation-circle d-block mb-1" style="font-size:1.5rem;color:var(--red);"></i>
            {{ error() }}
          </div>
        } @else if (unreadEmails().length === 0) {
          <div class="p-4 text-center" style="color:var(--text-dim);font-size:0.82rem;">
            <i class="bi bi-check2-all d-block mb-2" style="font-size:1.8rem;color:var(--green);"></i>
            All caught up
          </div>
        } @else {
          <ul class="list-unstyled mb-0">
            @for (email of unreadEmails(); track email.id) {
              <a [href]="'https://mail.google.com/mail/u/0/#all/' + email.threadId"
                 target="_blank" rel="noopener" (click)="onEmailClick()"
                 class="d-block px-3 py-2 border-bottom email-row"
                 style="border-color:var(--border) !important;text-decoration:none;transition:background .1s;">
                <div class="d-flex align-items-start gap-2">
                  <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);margin-top:5px;flex-shrink:0;"></span>
                  <div class="flex-grow-1 overflow-hidden">
                    <div class="d-flex justify-content-between align-items-baseline gap-1">
                      <span class="text-truncate" style="font-size:0.78rem;font-weight:600;color:var(--text-primary);">
                        {{ formatFrom(email.from) }}
                      </span>
                      <span class="flex-shrink-0" style="font-size:0.68rem;color:var(--text-dim);">
                        {{ email.receivedAt | date:'MMM d' }}
                      </span>
                    </div>
                    <div class="text-truncate" style="font-size:0.75rem;color:var(--text-secondary);">
                      {{ email.subject || '(no subject)' }}
                    </div>
                  </div>
                  <i class="bi bi-box-arrow-up-right flex-shrink-0" style="font-size:0.68rem;color:var(--text-dim);margin-top:4px;"></i>
                </div>
              </a>
            }
          </ul>
        }
      </div>
    </div>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      .spin { animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .email-row:hover { filter: brightness(1.06); cursor: pointer; }
    </style>
  `
})
export class GmailPanelComponent implements OnInit, OnDestroy {
  private svc = inject(GmailService);
  private refreshTimer?: ReturnType<typeof setInterval>;
  private delayedSyncTimer?: ReturnType<typeof setTimeout>;

  emails = signal<EmailSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  unreadEmails = computed(() => this.emails().filter(e => e.isUnread));

  private destroyRef = inject(DestroyRef);
  private hubRefresh = inject(HubRefreshService);

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(), 5 * 60 * 1000);
    this.hubRefresh.onRefresh$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.delayedSyncTimer) clearTimeout(this.delayedSyncTimer);
  }

  load() {
    if (this.emails().length === 0) this.loading.set(true);
    this.error.set(null);
    this.svc.getInbox().subscribe({
      next: (data: EmailSummary[]) => { this.emails.set(data); this.loading.set(false); },
      error: (err: { error?: { error?: string } }) => {
        if (this.emails().length === 0) {
          this.error.set(err.error?.error ?? 'Failed to load Gmail.');
        }
        this.loading.set(false);
      }
    });
  }

  onEmailClick() {
    if (this.delayedSyncTimer) clearTimeout(this.delayedSyncTimer);
    this.delayedSyncTimer = setTimeout(() => this.silentLoad(), 5000);
  }

  private silentLoad() {
    this.svc.getInbox().subscribe({
      next: (data: EmailSummary[]) => this.emails.set(data),
      error: () => {}
    });
  }

  formatFrom(from: string): string {
    const match = from.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : from.replace(/<.*>/, '').trim() || from;
  }
}
