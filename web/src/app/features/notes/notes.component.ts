import { Component } from '@angular/core';

@Component({
  selector: 'app-notes',
  standalone: true,
  template: `
    <div class="text-center py-5" style="color:var(--text-dim);">
      <i class="bi bi-journal-text" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
      <p style="color:var(--text-secondary);">Notes — coming in Phase 5</p>
    </div>
  `
})
export class NotesComponent {}
