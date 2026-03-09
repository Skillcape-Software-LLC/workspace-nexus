import { Component, OnDestroy, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from '../../core/models/google.model';
import { HubRefreshService } from '../../core/services/hub-refresh.service';

const BAR_COLORS = ['var(--blue)', 'var(--accent)', 'var(--green)', 'var(--yellow)'];

@Component({
  selector: 'app-calendar-panel',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="card h-100" style="border-color:var(--border);">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-calendar3 text-accent"></i>
          <span style="font-weight:600;font-size:0.875rem;">Calendar</span>
          @if (events().length > 0) {
            <span class="badge rounded-pill" style="background:var(--bg-raised);color:var(--text-secondary);border:1px solid var(--border);font-size:0.7rem;">
              {{ events().length }}
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
              <div style="height:56px;border-radius:6px;background:var(--bg-raised);animation:pulse 1.5s infinite;"></div>
            }
          </div>
        } @else if (error()) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-exclamation-circle d-block mb-1" style="font-size:1.5rem;color:var(--red);"></i>
            {{ error() }}
          </div>
        } @else if (events().length === 0) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-calendar-x d-block mb-1" style="font-size:1.5rem;"></i>
            No upcoming events
          </div>
        } @else {
          @for (group of groupedEvents(); track group.date) {
            <div class="px-3 pt-2 pb-1 sticky-top" style="background:var(--bg-panel);font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border);">
              {{ group.date }}
            </div>
            @for (event of group.events; track event.id; let i = $index) {
              <div class="d-flex gap-2 px-3 py-2 border-bottom" style="border-color:var(--border) !important;">
                <div class="flex-shrink-0" style="width:3px;border-radius:2px;background:{{ barColor(i) }};align-self:stretch;"></div>
                <div class="d-flex gap-2 flex-grow-1 overflow-hidden">
                  @if (!event.isAllDay) {
                    <div class="flex-shrink-0 text-end" style="width:44px;font-family:var(--font-mono);font-size:0.72rem;color:var(--text-secondary);padding-top:1px;">
                      {{ event.startAt | date:'h:mm' }}<br>
                      <span style="font-size:0.65rem;color:var(--text-dim);">{{ event.startAt | date:'a' }}</span>
                    </div>
                  } @else {
                    <div class="flex-shrink-0" style="width:44px;font-size:0.68rem;color:var(--text-dim);padding-top:2px;">All day</div>
                  }
                  <div class="flex-grow-1 overflow-hidden">
                    @if (event.htmlLink) {
                      <a [href]="event.htmlLink" target="_blank" rel="noopener"
                         class="text-truncate d-block" style="font-size:0.82rem;font-weight:500;color:var(--text-primary);text-decoration:none;" (click)="$event.stopPropagation()">{{ event.title }}</a>
                    } @else {
                      <div class="text-truncate" style="font-size:0.82rem;font-weight:500;color:var(--text-primary);">{{ event.title }}</div>
                    }
                    @if (event.attendees.length > 0) {
                      <div class="text-truncate" style="font-size:0.72rem;color:var(--text-secondary);">
                        <i class="bi bi-people me-1"></i>{{ event.attendees.slice(0,3).join(', ') }}{{ event.attendees.length > 3 ? ' +' + (event.attendees.length - 3) : '' }}
                      </div>
                    }
                    @if (event.meetUrl) {
                      <a [href]="event.meetUrl" target="_blank" rel="noopener noreferrer"
                         style="font-size:0.72rem;color:var(--blue);text-decoration:none;" (click)="$event.stopPropagation()">
                        <i class="bi bi-camera-video me-1"></i>Join Meet
                      </a>
                    }
                  </div>
                </div>
              </div>
            }
          }
        }
      </div>
    </div>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      .spin { animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      a[href]:hover { text-decoration: underline !important; }
    </style>
  `
})
export class CalendarPanelComponent implements OnInit, OnDestroy {
  private svc = inject(CalendarService);
  private refreshTimer?: ReturnType<typeof setInterval>;

  events = signal<CalendarEvent[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  groupedEvents = computed(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    for (const ev of this.events()) {
      const key = ev.startAt
        ? new Date(ev.startAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
        : 'All Day';
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }
    return Object.entries(groups).map(([date, events]) => ({ date, events }));
  });

  private destroyRef = inject(DestroyRef);
  private hubRefresh = inject(HubRefreshService);

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(), 10 * 60 * 1000);
    this.hubRefresh.onRefresh$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getEvents().subscribe({
      next: (data: CalendarEvent[]) => { this.events.set(data); this.loading.set(false); },
      error: (err: { error?: { error?: string } }) => {
        this.error.set(err.error?.error ?? 'Failed to load calendar.');
        this.loading.set(false);
      }
    });
  }

  barColor(index: number): string {
    return BAR_COLORS[index % BAR_COLORS.length];
  }
}
