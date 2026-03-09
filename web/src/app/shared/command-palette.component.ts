import { Component, inject } from '@angular/core';
import { KeyboardShortcutService } from '../core/services/keyboard-shortcut.service';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  template: `
    @if (svc.paletteOpen()) {
      <div class="palette-backdrop" (click)="svc.closePalette()"></div>
      <div class="palette-card">
        <div class="palette-header">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.6;">
            <path d="M14 5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12zM2 4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H2z"/>
            <path d="M13 10.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm0-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-5 0A.25.25 0 0 1 8.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 8 8.75v-.5zM4.5 8a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>
          </svg>
          <span>Quick Actions</span>
        </div>
        <div class="palette-actions">
          @for (action of svc.availableActions(); track action.id) {
            <button class="palette-action" (click)="execute(action.callback)">
              <kbd>{{ action.key }}</kbd>
              <span class="palette-arrow">&rarr;</span>
              <span>{{ action.label }}</span>
            </button>
          }
        </div>
        <div class="palette-footer">
          Press a key or <kbd>Esc</kbd> to close
        </div>
      </div>
    }

    <style>
      .palette-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 1050;
        animation: paletteFadeIn .12s ease;
      }
      .palette-card {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1055;
        background: var(--bg-panel);
        border: 1px solid var(--border);
        border-radius: 12px;
        min-width: 260px;
        max-width: 320px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
        animation: paletteScaleIn .12s ease;
        overflow: hidden;
      }
      .palette-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border);
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-secondary);
        font-family: var(--font-display);
      }
      .palette-actions {
        padding: 0.35rem 0;
      }
      .palette-action {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.5rem 1rem;
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 0.85rem;
        font-family: var(--font-body);
        cursor: pointer;
        transition: background .1s, color .1s;
      }
      .palette-action:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
      .palette-action kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 5px;
        background: var(--bg-raised);
        border: 1px solid var(--border);
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--accent);
      }
      .palette-arrow {
        color: var(--text-dim);
        font-size: 0.75rem;
      }
      .palette-footer {
        padding: 0.5rem 1rem;
        border-top: 1px solid var(--border);
        font-size: 0.7rem;
        color: var(--text-dim);
        text-align: center;
      }
      .palette-footer kbd {
        background: var(--bg-raised);
        border: 1px solid var(--border);
        border-radius: 3px;
        padding: 1px 4px;
        font-family: var(--font-mono);
        font-size: 0.68rem;
      }
      @keyframes paletteFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes paletteScaleIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    </style>
  `
})
export class CommandPaletteComponent {
  svc = inject(KeyboardShortcutService);

  execute(callback: () => void): void {
    this.svc.closePalette();
    callback();
  }
}
