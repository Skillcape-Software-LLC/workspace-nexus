import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';
import { QuickNoteModalComponent } from '../../features/notes/quick-note-modal.component';
import { CommandPaletteComponent } from '../../shared/command-palette.component';
import { ShortcutsHelpComponent } from '../../shared/shortcuts-help.component';
import { KeyboardShortcutService } from '../../core/services/keyboard-shortcut.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, QuickNoteModalComponent, CommandPaletteComponent, ShortcutsHelpComponent],
  template: `
    <div class="d-flex flex-column" style="height:100vh;overflow:hidden;">
      <app-topbar (newNoteClicked)="quickNoteOpen.set(true)" />
      <main class="flex-grow-1 overflow-auto p-3 p-md-4">
        <router-outlet />
      </main>
    </div>

    @if (quickNoteOpen()) {
      <app-quick-note-modal
        [visible]="quickNoteOpen()"
        (closed)="quickNoteOpen.set(false)" />
    }

    <app-command-palette />
    <app-shortcuts-help />
  `
})
export class ShellComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private shortcuts = inject(KeyboardShortcutService);

  quickNoteOpen = signal(false);

  ngOnInit() {
    // Palette actions — navigation
    this.shortcuts.register({ id: 'nav-hub', key: 'h', label: 'Hub', category: 'navigation', callback: () => this.router.navigate(['/hub']) });
    this.shortcuts.register({ id: 'nav-notes', key: 'n', label: 'Notes', category: 'navigation', callback: () => this.router.navigate(['/notes']) });
    this.shortcuts.register({ id: 'nav-settings', key: 's', label: 'Settings', category: 'navigation', callback: () => this.router.navigate(['/settings']) });

    // Palette action — help reference
    this.shortcuts.register({ id: 'help', key: '?', label: 'All shortcuts', category: 'action', callback: () => this.shortcuts.openHelp() });

    // Direct shortcuts (no leader key needed)
    this.shortcuts.registerDirect({ id: 'quick-note', altKey: true, key: 'n', callback: () => this.quickNoteOpen.set(true) });
    this.shortcuts.registerDirect({ id: 'escape', key: 'Escape', allowInInput: true, callback: () => this.quickNoteOpen.set(false) });
  }

  ngOnDestroy() {
    this.shortcuts.unregister('nav-hub');
    this.shortcuts.unregister('nav-notes');
    this.shortcuts.unregister('nav-settings');
    this.shortcuts.unregister('help');
    this.shortcuts.unregisterDirect('quick-note');
    this.shortcuts.unregisterDirect('escape');
  }
}
