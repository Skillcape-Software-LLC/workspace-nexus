import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (updateAvailable()) {
      <div class="update-banner">
        <span>A new version of Nexus is available.</span>
        <button class="update-btn" (click)="applyUpdate()">Reload to update</button>
        <button class="dismiss-btn" (click)="updateAvailable.set(false)" aria-label="Dismiss">✕</button>
      </div>
    }
  `,
  styles: [`
    .update-banner {
      position: fixed;
      bottom: 1.25rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      background: var(--bg-raised);
      border: 1px solid var(--accent);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px var(--accent-glow);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 0.875rem;
      white-space: nowrap;
      z-index: 9999;
    }
    .update-btn {
      background: var(--accent);
      color: #1a1209;
      border: none;
      border-radius: 5px;
      padding: 0.3rem 0.75rem;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      &:hover { background: #E5CB8A; }
    }
    .dismiss-btn {
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0.1rem 0.25rem;
      line-height: 1;
      &:hover { color: var(--text-primary); }
    }
  `]
})
export class AppComponent {
  updateAvailable = signal(false);

  constructor() {
    const swUpdate = inject(SwUpdate);
    if (!swUpdate.isEnabled) return;

    swUpdate.versionUpdates.subscribe(event => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable.set(true);
      }
    });

    // Poll for updates in long-running sessions (every 6 hours)
    setInterval(() => swUpdate.checkForUpdate(), 6 * 60 * 60 * 1000);
  }

  applyUpdate() {
    inject(SwUpdate).activateUpdate().then(() => location.reload());
  }
}
