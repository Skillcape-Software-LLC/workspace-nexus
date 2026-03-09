import { Component, inject } from '@angular/core';
import { KeyboardShortcutService } from '../core/services/keyboard-shortcut.service';

@Component({
  selector: 'app-shortcuts-help',
  standalone: true,
  template: `
    @if (svc.helpOpen()) {
      <div class="help-backdrop" (click)="svc.closeHelp()"></div>
      <div class="help-card">
        <div class="help-header">
          <span>Keyboard Shortcuts</span>
          <button class="help-close" (click)="svc.closeHelp()">&times;</button>
        </div>

        <div class="help-body">
          <div class="help-group">
            <div class="help-group-title">Command Palette</div>
            <div class="help-row">
              <span class="help-keys"><kbd>{{ svc.leaderCombo() }}</kbd></span>
              <span>Open quick actions</span>
            </div>
          </div>

          <div class="help-group">
            <div class="help-group-title">Leader Commands</div>
            <div class="help-hint">Press <kbd>{{ svc.leaderCombo() }}</kbd> first, then:</div>
            @for (action of svc.availableActions(); track action.id) {
              <div class="help-row">
                <span class="help-keys"><kbd>{{ action.key }}</kbd></span>
                <span>{{ action.label }}</span>
              </div>
            }
          </div>

          <div class="help-group">
            <div class="help-group-title">Direct Shortcuts</div>
            <div class="help-row">
              <span class="help-keys"><kbd>Alt</kbd> + <kbd>{{ svc.resolveKey('quick-note', 'n').toUpperCase() }}</kbd></span>
              <span>New quick note</span>
            </div>
            <div class="help-row">
              <span class="help-keys"><kbd>Esc</kbd></span>
              <span>Close modal / overlay</span>
            </div>
          </div>

          <div class="help-group">
            <div class="help-group-title">Editor</div>
            <div class="help-row">
              <span class="help-keys"><kbd>Ctrl</kbd> + <kbd>Enter</kbd></span>
              <span>Save note</span>
            </div>
            <div class="help-row">
              <span class="help-keys"><kbd>Esc</kbd></span>
              <span>Cancel edit</span>
            </div>
          </div>
        </div>
      </div>
    }

    <style>
      .help-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 1050;
        animation: helpFadeIn .12s ease;
      }
      .help-card {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1055;
        background: var(--bg-panel);
        border: 1px solid var(--border);
        border-radius: 12px;
        min-width: 320px;
        max-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
        animation: helpScaleIn .12s ease;
      }
      .help-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border);
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-display);
      }
      .help-close {
        background: var(--bg-raised);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 0.1rem 0.45rem;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
      }
      .help-close:hover { color: var(--text-primary); }
      .help-body {
        padding: 0.5rem 0;
      }
      .help-group {
        padding: 0.5rem 1rem;
      }
      .help-group + .help-group {
        border-top: 1px solid var(--border);
      }
      .help-group-title {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-dim);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.4rem;
      }
      .help-hint {
        font-size: 0.72rem;
        color: var(--text-dim);
        margin-bottom: 0.35rem;
      }
      .help-hint kbd {
        background: var(--bg-raised);
        border: 1px solid var(--border);
        border-radius: 3px;
        padding: 0 3px;
        font-family: var(--font-mono);
        font-size: 0.68rem;
      }
      .help-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.3rem 0;
        font-size: 0.82rem;
        color: var(--text-secondary);
      }
      .help-keys {
        display: flex;
        align-items: center;
        gap: 0.2rem;
        font-size: 0.72rem;
        color: var(--text-dim);
      }
      .help-keys kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        background: var(--bg-raised);
        border: 1px solid var(--border);
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--accent);
      }
      @keyframes helpFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes helpScaleIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    </style>
  `
})
export class ShortcutsHelpComponent {
  svc = inject(KeyboardShortcutService);
}
