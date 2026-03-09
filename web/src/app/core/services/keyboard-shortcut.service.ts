import { Injectable, NgZone, signal, computed, inject, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface ShortcutAction {
  id: string;
  key: string;
  label: string;
  category: 'navigation' | 'action';
  callback: () => void;
}

interface DirectShortcut {
  id: string;
  altKey?: boolean;
  key: string;
  callback: () => void;
  allowInInput?: boolean;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutService {
  private zone = inject(NgZone);
  private doc = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  private actions = signal<ShortcutAction[]>([]);
  private directShortcuts: DirectShortcut[] = [];
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  readonly paletteOpen = signal(false);
  readonly helpOpen = signal(false);
  readonly availableActions = computed(() => this.actions());

  constructor() {
    this.zone.runOutsideAngular(() => {
      const handler = (e: KeyboardEvent) => this.handleKeydown(e);
      this.doc.addEventListener('keydown', handler);
      this.destroyRef.onDestroy(() => this.doc.removeEventListener('keydown', handler));
    });
  }

  register(action: ShortcutAction): void {
    this.actions.update(list => [...list.filter(a => a.id !== action.id), action]);
  }

  unregister(id: string): void {
    this.actions.update(list => list.filter(a => a.id !== id));
  }

  registerDirect(shortcut: DirectShortcut): void {
    this.directShortcuts = this.directShortcuts.filter(s => s.id !== shortcut.id);
    this.directShortcuts.push(shortcut);
  }

  unregisterDirect(id: string): void {
    this.directShortcuts = this.directShortcuts.filter(s => s.id !== id);
  }

  openPalette(): void {
    this.zone.run(() => {
      this.helpOpen.set(false);
      this.paletteOpen.set(true);
      this.startDismissTimer();
    });
  }

  closePalette(): void {
    this.zone.run(() => {
      this.paletteOpen.set(false);
      this.clearDismissTimer();
    });
  }

  openHelp(): void {
    this.zone.run(() => {
      this.paletteOpen.set(false);
      this.helpOpen.set(true);
    });
  }

  closeHelp(): void {
    this.zone.run(() => this.helpOpen.set(false));
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Palette is open — listen for action keys
    if (this.paletteOpen()) {
      e.preventDefault();
      this.clearDismissTimer();

      if (e.key === 'Escape') {
        this.closePalette();
        return;
      }

      const action = this.actions().find(a => a.key === e.key);
      if (action) {
        this.closePalette();
        this.zone.run(() => action.callback());
      }
      return;
    }

    // Help overlay is open — only Escape closes it
    if (this.helpOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeHelp();
      }
      return;
    }

    // Alt+K — open palette
    if (e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      this.openPalette();
      return;
    }

    // Direct shortcuts (Alt+N, Escape, etc.)
    for (const s of this.directShortcuts) {
      const altMatch = s.altKey ? e.altKey : !e.altKey;
      if (altMatch && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === s.key.toLowerCase()) {
        if (!s.allowInInput && this.isInputFocused()) continue;
        e.preventDefault();
        this.zone.run(() => s.callback());
        return;
      }
    }
  }

  private isInputFocused(): boolean {
    const el = this.doc.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
  }

  private startDismissTimer(): void {
    this.clearDismissTimer();
    this.dismissTimer = setTimeout(() => this.closePalette(), 2000);
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }
}
