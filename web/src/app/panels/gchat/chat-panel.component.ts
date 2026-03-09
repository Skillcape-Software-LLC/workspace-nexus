import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ChatService } from './chat.service';
import { ChatSpace, ChatMessage } from '../../core/models/google.model';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="card h-100" style="border-color:var(--border);">
      <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-chat-dots text-accent"></i>
          <span style="font-weight:600;font-size:0.875rem;">Google Chat</span>
        </div>
        <button class="btn btn-sm p-0" style="color:var(--text-dim);" (click)="load()" title="Refresh">
          <i class="bi bi-arrow-clockwise" [class.spin]="loading()"></i>
        </button>
      </div>

      <div class="card-body p-0" style="overflow-y:auto;max-height:340px;">
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
        } @else if (spaces().length === 0) {
          <div class="p-3 text-center" style="color:var(--text-dim);font-size:0.8rem;">
            <i class="bi bi-chat d-block mb-1" style="font-size:1.5rem;"></i>
            No spaces found
          </div>
        } @else {
          <!-- Spaces -->
          @if (roomSpaces().length > 0) {
            <div class="px-3 pt-2 pb-1" style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;">Spaces</div>
            @for (space of roomSpaces(); track space.name) {
              <div (click)="toggleSpace(space.name)"
                   class="px-3 py-2 border-bottom d-flex align-items-center gap-2"
                   style="border-color:var(--border) !important;cursor:pointer;transition:background .1s;"
                   [style.background]="expandedSpace() === space.name ? 'var(--bg-raised)' : 'transparent'">
                <div class="flex-shrink-0 d-flex align-items-center justify-content-center"
                     style="width:32px;height:32px;border-radius:8px;background:var(--accent-dim);color:var(--accent);font-size:0.75rem;font-weight:700;">
                  {{ initials(space.displayName) }}
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="text-truncate" style="font-size:0.82rem;font-weight:500;color:var(--text-primary);">{{ space.displayName }}</div>
                </div>
                @if (space.unreadCount > 0) {
                  <span class="badge rounded-pill" style="background:var(--accent);color:#000;font-size:0.68rem;">{{ space.unreadCount }}</span>
                }
                <i class="bi" [class.bi-chevron-down]="expandedSpace() !== space.name"
                   [class.bi-chevron-up]="expandedSpace() === space.name"
                   style="font-size:0.75rem;color:var(--text-dim);"></i>
              </div>
              @if (expandedSpace() === space.name) {
                <div style="background:var(--bg-raised);">
                  @if (loadingMessages()) {
                    <div class="p-2 text-center" style="font-size:0.75rem;color:var(--text-dim);">Loading...</div>
                  } @else {
                    @for (msg of messages(); track msg.name) {
                      <div class="px-3 py-2 border-bottom" style="border-color:var(--border) !important;">
                        <div class="d-flex justify-content-between">
                          <span style="font-size:0.75rem;font-weight:600;color:var(--text-primary);">{{ msg.senderName }}</span>
                          <span style="font-size:0.68rem;color:var(--text-dim);">{{ msg.createdAt | date:'MMM d, h:mm a' }}</span>
                        </div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">{{ msg.text }}</div>
                      </div>
                    }
                  }
                </div>
              }
            }
          }

          <!-- DMs -->
          @if (dmSpaces().length > 0) {
            <div class="px-3 pt-2 pb-1" style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;">Direct Messages</div>
            @for (space of dmSpaces(); track space.name) {
              <div (click)="toggleSpace(space.name)"
                   class="px-3 py-2 border-bottom d-flex align-items-center gap-2"
                   style="border-color:var(--border) !important;cursor:pointer;"
                   [style.background]="expandedSpace() === space.name ? 'var(--bg-raised)' : 'transparent'">
                <div class="flex-shrink-0 d-flex align-items-center justify-content-center"
                     style="width:32px;height:32px;border-radius:50%;background:var(--bg-hover);color:var(--text-secondary);font-size:0.75rem;font-weight:700;">
                  <i class="bi bi-person"></i>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="text-truncate" style="font-size:0.82rem;font-weight:500;color:var(--text-primary);">{{ space.displayName || 'Direct Message' }}</div>
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
    </style>
  `
})
export class ChatPanelComponent implements OnInit, OnDestroy {
  private svc = inject(ChatService);
  private refreshTimer?: ReturnType<typeof setInterval>;

  spaces = signal<ChatSpace[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  expandedSpace = signal<string | null>(null);
  messages = signal<ChatMessage[]>([]);
  loadingMessages = signal(false);

  roomSpaces = () => this.spaces().filter(s => s.type !== 'DIRECT_MESSAGE');
  dmSpaces = () => this.spaces().filter(s => s.type === 'DIRECT_MESSAGE');

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(), 5 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getSpaces().subscribe({
      next: (data: ChatSpace[]) => { this.spaces.set(data); this.loading.set(false); },
      error: (err: { error?: { error?: string } }) => {
        this.error.set(err.error?.error ?? 'Failed to load Chat spaces.');
        this.loading.set(false);
      }
    });
  }

  toggleSpace(name: string) {
    if (this.expandedSpace() === name) {
      this.expandedSpace.set(null);
      return;
    }
    this.expandedSpace.set(name);
    this.loadingMessages.set(true);
    this.svc.getMessages(name).subscribe({
      next: (msgs: ChatMessage[]) => { this.messages.set(msgs); this.loadingMessages.set(false); },
      error: () => { this.messages.set([]); this.loadingMessages.set(false); }
    });
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  }
}
