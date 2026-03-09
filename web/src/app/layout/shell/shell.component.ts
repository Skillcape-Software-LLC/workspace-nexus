import { Component, HostListener, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';
import { QuickNoteModalComponent } from '../../features/notes/quick-note-modal.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, QuickNoteModalComponent],
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
  `
})
export class ShellComponent {
  quickNoteOpen = signal(false);

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.altKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      this.quickNoteOpen.set(true);
    }
    if (e.key === 'Escape' && this.quickNoteOpen()) {
      this.quickNoteOpen.set(false);
    }
  }
}
