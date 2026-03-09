import { Injectable, NgZone, signal, computed, inject, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const LEADER_KEY_STORAGE = 'nexus_leader_key';
const KEY_BINDINGS_STORAGE = 'nexus_key_bindings';
const DEFAULT_LEADER_KEY = 'j';

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

export interface KeyBindingDef {
  id: string;
  defaultKey: string;
  label: string;
  group: 'Navigation' | 'Actions';
  isDirect?: boolean;
}

export const CONFIGURABLE_BINDINGS: KeyBindingDef[] = [
  { id: 'nav-hub',      defaultKey: 'h', label: 'Navigate to Hub',      group: 'Navigation' },
  { id: 'nav-notes',    defaultKey: 'n', label: 'Navigate to Notes',    group: 'Navigation' },
  { id: 'nav-settings', defaultKey: 's', label: 'Navigate to Settings', group: 'Navigation' },
  { id: 'hub-refresh',  defaultKey: 'r', label: 'Refresh panels',       group: 'Actions' },
  { id: 'quick-note',   defaultKey: 'n', label: 'New quick note',       group: 'Actions', isDirect: true },
  { id: 'notes-search', defaultKey: '/', label: 'Search notes',         group: 'Actions' },
];

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutService {
  private zone = inject(NgZone);
  private doc = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  private actions = signal<ShortcutAction[]>([]);
  private directShortcuts: DirectShortcut[] = [];

  readonly leaderKey = signal(this.loadLeaderKey());
  readonly keyBindings = signal<Record<string, string>>(this.loadKeyBindings());
  readonly paletteOpen = signal(false);
  readonly helpOpen = signal(false);
  readonly availableActions = computed(() => this.actions());
  readonly leaderCombo = computed(() => `Alt+${this.leaderKey().toUpperCase()}`);

  constructor() {
    this.zone.runOutsideAngular(() => {
      const handler = (e: KeyboardEvent) => this.handleKeydown(e);
      this.doc.addEventListener('keydown', handler);
      this.destroyRef.onDestroy(() => this.doc.removeEventListener('keydown', handler));
    });
  }

  resolveKey(id: string, defaultKey: string): string {
    return this.keyBindings()[id] ?? defaultKey;
  }

  register(action: ShortcutAction): void {
    const resolved = { ...action, key: this.resolveKey(action.id, action.key) };
    this.actions.update(list => [...list.filter(a => a.id !== action.id), resolved]);
  }

  unregister(id: string): void {
    this.actions.update(list => list.filter(a => a.id !== id));
  }

  registerDirect(shortcut: DirectShortcut): void {
    const resolved = { ...shortcut, key: this.resolveKey(shortcut.id, shortcut.key) };
    this.directShortcuts = this.directShortcuts.filter(s => s.id !== shortcut.id);
    this.directShortcuts.push(resolved);
  }

  unregisterDirect(id: string): void {
    this.directShortcuts = this.directShortcuts.filter(s => s.id !== id);
  }

  setKeyBinding(id: string, key: string): void {
    const bindings = { ...this.keyBindings(), [id]: key };
    localStorage.setItem(KEY_BINDINGS_STORAGE, JSON.stringify(bindings));
    this.keyBindings.set(bindings);

    // Update any registered palette action with this id
    this.actions.update(list => list.map(a => a.id === id ? { ...a, key } : a));

    // Update any registered direct shortcut with this id
    this.directShortcuts = this.directShortcuts.map(s => s.id === id ? { ...s, key } : s);
  }

  setLeaderKey(key: string): void {
    const normalized = key.toLowerCase().trim();
    if (!normalized) return;
    localStorage.setItem(LEADER_KEY_STORAGE, normalized);
    this.leaderKey.set(normalized);
  }

  openPalette(): void {
    this.zone.run(() => {
      this.helpOpen.set(false);
      this.paletteOpen.set(true);
    });
  }

  closePalette(): void {
    this.zone.run(() => this.paletteOpen.set(false));
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
    // Palette is open — listen for action keys or Escape to abort
    if (this.paletteOpen()) {
      e.preventDefault();

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

    // Alt + <leaderKey> — open palette
    if (e.altKey && e.key.toLowerCase() === this.leaderKey()) {
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

  private loadLeaderKey(): string {
    return localStorage.getItem(LEADER_KEY_STORAGE) || DEFAULT_LEADER_KEY;
  }

  private loadKeyBindings(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(KEY_BINDINGS_STORAGE) || '{}');
    } catch {
      return {};
    }
  }
}
