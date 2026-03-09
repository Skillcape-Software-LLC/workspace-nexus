import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

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
        <div class="d-flex align-items-center gap-2">
          <span class="status-dot" [class.online]="true"
                style="width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:pulse 2s infinite;"></span>
          <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-secondary);">{{ clock() }}</span>
        </div>
        <div class="d-flex align-items-center justify-content-center"
             style="width:32px;height:32px;border-radius:50%;background:var(--bg-raised);border:1px solid var(--border);font-size:0.75rem;color:var(--text-secondary);font-weight:600;cursor:default;">
          NX
        </div>
      </div>
    </nav>

    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    </style>
  `
})
export class TopbarComponent implements OnInit, OnDestroy {
  clock = signal('');
  private timer?: ReturnType<typeof setInterval>;

  navLinks = [
    { path: '/hub',      label: 'Hub' },
    { path: '/links',    label: 'Links' },
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
