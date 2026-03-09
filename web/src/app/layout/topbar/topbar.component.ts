import { Component, EventEmitter, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutService } from '../../core/services/keyboard-shortcut.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <nav class="navbar navbar-expand px-3 px-md-4" style="height:56px;">
      <a class="navbar-brand d-flex align-items-center gap-2 me-4 text-decoration-none" routerLink="/">
        <span class="logo-mark d-flex align-items-center justify-content-center"
              style="width:30px;height:30px;background:var(--accent);border-radius:6px;">
          <span style="font-family:var(--font-display);font-weight:800;font-size:14px;color:#000;line-height:1;">N</span>
        </span>
        <span style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--accent);letter-spacing:2px;">NEXUS</span>
      </a>

      <ul class="navbar-nav me-auto gap-1">
        @for (link of navLinks; track link.path) {
          <li class="nav-item">
            <a class="nav-link px-3 py-1 rounded"
               [routerLink]="link.path"
               routerLinkActive="active"
               style="font-size:0.875rem;font-weight:500;transition:color .15s;">
              {{ link.label }}
            </a>
          </li>
        }
      </ul>

      <div class="d-flex align-items-center gap-3">
        <button (click)="shortcuts.openPalette()" [title]="'Quick actions (' + shortcuts.leaderCombo() + ')'"
                class="new-note-btn"
                style="
                  background:var(--bg-raised);border:1px solid var(--border);
                  border-radius:6px;padding:0.3rem 0.5rem;
                  color:var(--text-dim);cursor:pointer;display:flex;align-items:center;
                  font-size:0.78rem;font-family:var(--font-body);">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12zM2 4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H2z"/>
            <path d="M13 10.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm0-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-5 0A.25.25 0 0 1 8.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 8 8.75v-.5zM4.5 8a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>
          </svg>
        </button>
        <button (click)="newNoteClicked.emit()" title="New note (Alt+N)"
                class="new-note-btn"
                style="
                  background:var(--bg-raised);border:1px solid var(--border);
                  border-radius:6px;padding:0.3rem 0.6rem;
                  color:var(--text-dim);cursor:pointer;display:flex;align-items:center;gap:0.35rem;
                  font-size:0.78rem;font-family:var(--font-body);">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
            <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
          </svg>
          Note
        </button>

        <div class="d-flex align-items-center gap-2">
          <span class="status-dot" [class.online]="true"
                style="width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:pulse 2s infinite;"></span>
          <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-secondary);">{{ clock() }}</span>
        </div>
      </div>
    </nav>

    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .nav-link.active {
        color: var(--accent) !important;
        border-bottom: 2px solid var(--accent);
        padding-bottom: 2px;
      }
      .nav-link:not(.active):hover {
        color: var(--text-primary) !important;
        background: var(--bg-hover);
      }
      .new-note-btn { transition: border-color .15s, color .15s; }
      .new-note-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
    </style>
  `
})
export class TopbarComponent implements OnInit, OnDestroy {
  shortcuts = inject(KeyboardShortcutService);
  @Output() newNoteClicked = new EventEmitter<void>();

  clock = signal('');
  private timer?: ReturnType<typeof setInterval>;

  navLinks = [
    { path: '/hub',      label: 'Hub' },
    { path: '/notes',    label: 'Notes' },
    { path: '/settings', label: 'Settings' }
  ];

  ngOnInit() {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private tick() {
    this.clock.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }
}
