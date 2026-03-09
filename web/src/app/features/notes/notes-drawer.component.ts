import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { NotesService } from '../../core/api/notes.service';
import { Note } from '../../core/models/note.model';
import { QuickLink } from '../../core/models/quick-link.model';

@Component({
  selector: 'app-notes-drawer',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="notes-backdrop" (click)="close.emit()" style="
      position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1040;
      animation:fadeIn .2s ease;"></div>

    <!-- Drawer -->
    <div class="notes-drawer d-flex flex-column" style="
      position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100vw;
      background:var(--bg-panel);border-left:1px solid var(--border);
      z-index:1050;animation:slideIn .25s ease;">

      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between px-4 py-3"
           style="border-bottom:1px solid var(--border);flex-shrink:0;">
        <div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:1rem;color:var(--text-primary);">
            Notes
          </div>
          <div class="text-truncate" style="font-size:0.78rem;color:var(--text-secondary);max-width:280px;">
            {{ link.name }}
          </div>
        </div>
        <button class="btn p-1" style="color:var(--text-dim);" (click)="close.emit()">
          <i class="bi bi-x-lg" style="font-size:1.1rem;"></i>
        </button>
      </div>

      <!-- Notes list -->
      <div class="flex-grow-1 overflow-auto px-4 py-3">
        @if (loading()) {
          <div class="text-center py-4" style="color:var(--text-dim);">
            <div class="spinner-border spinner-border-sm" style="color:var(--accent);"></div>
          </div>
        } @else if (notes().length === 0) {
          <div class="text-center py-5" style="color:var(--text-dim);">
            <i class="bi bi-journal-text d-block mb-2" style="font-size:2rem;"></i>
            <span style="font-size:0.875rem;">No notes yet. Add the first one below.</span>
          </div>
        } @else {
          <div class="d-flex flex-column gap-3">
            @for (note of notes(); track note.id) {
              <div class="note-entry p-3" style="background:var(--bg-raised);border-radius:8px;border:1px solid var(--border);">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <div class="d-flex align-items-center gap-2">
                    <div class="d-flex align-items-center justify-content-center"
                         style="width:24px;height:24px;border-radius:50%;background:var(--accent-dim);
                                color:var(--accent);font-size:0.65rem;font-weight:700;">
                      {{ initials(note.authorName) }}
                    </div>
                    <span style="font-size:0.8rem;font-weight:600;color:var(--text-primary);">{{ note.authorName }}</span>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span style="font-size:0.7rem;color:var(--text-dim);">{{ note.createdAt | date:'MMM d, h:mm a' }}</span>
                    @if (note.authorName === displayName()) {
                      <button class="btn p-0" style="color:var(--text-dim);line-height:1;" title="Delete"
                              (click)="deleteNote(note.id)">
                        <i class="bi bi-trash3" style="font-size:0.75rem;"></i>
                      </button>
                    }
                  </div>
                </div>
                <div class="note-body" [innerHTML]="renderMarkdown(note.body)"
                     style="font-size:0.82rem;color:var(--text-secondary);line-height:1.6;"></div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Compose area -->
      <div class="px-4 py-3" style="border-top:1px solid var(--border);flex-shrink:0;background:var(--bg-panel);">
        <textarea
          class="form-control mb-2"
          [(ngModel)]="newBody"
          rows="3"
          placeholder="Write a note... Markdown supported"
          style="resize:none;font-family:var(--font-mono);font-size:0.8rem;"
          (keydown.ctrl.enter)="submitNote()"
          (keydown.meta.enter)="submitNote()"></textarea>
        <div class="d-flex align-items-center justify-content-between">
          <span style="font-size:0.72rem;color:var(--text-dim);">
            <kbd style="background:var(--bg-raised);border:1px solid var(--border);padding:1px 4px;border-radius:3px;font-size:0.65rem;">Ctrl+Enter</kbd> to post
          </span>
          <button class="btn btn-accent btn-sm px-3" (click)="submitNote()"
                  [disabled]="!newBody.trim() || submitting()">
            @if (submitting()) { <span class="spinner-border spinner-border-sm me-1"></span> }
            Post Note
          </button>
        </div>
      </div>
    </div>

    <style>
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }

      .note-body :is(p, ul, ol, pre, blockquote) { margin-bottom: 0.5rem; }
      .note-body :last-child { margin-bottom: 0; }
      .note-body code {
        background: var(--bg-panel);
        border: 1px solid var(--border);
        border-radius: 3px;
        padding: 1px 4px;
        font-family: var(--font-mono);
        font-size: 0.85em;
        color: var(--accent);
      }
      .note-body pre {
        background: var(--bg-panel);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.75rem;
        overflow-x: auto;
      }
      .note-body pre code {
        background: transparent;
        border: none;
        padding: 0;
        color: var(--text-primary);
      }
      .note-body strong { color: var(--text-primary); }
      .note-body a { color: var(--accent); }
      .note-body blockquote {
        border-left: 3px solid var(--accent-dim);
        padding-left: 0.75rem;
        color: var(--text-dim);
        margin: 0;
      }
    </style>
  `
})
export class NotesDrawerComponent implements OnInit {
  @Input() link!: QuickLink;
  @Output() close = new EventEmitter<void>();
  @Output() notesCountChanged = new EventEmitter<{ quickLinkId: string; count: number }>();

  private svc = inject(NotesService);
  private sanitizer = inject(DomSanitizer);

  notes = signal<Note[]>([]);
  loading = signal(true);
  displayName = signal('You');
  newBody = '';
  submitting = signal(false);

  ngOnInit() {
    this.svc.getDisplayName().subscribe({
      next: r => this.displayName.set(r.value),
      error: () => {}
    });
    this.loadNotes();
  }

  loadNotes() {
    this.loading.set(true);
    this.svc.getNotes(this.link.id).subscribe({
      next: (data: Note[]) => { this.notes.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  submitNote() {
    const body = this.newBody.trim();
    if (!body) return;

    this.submitting.set(true);
    this.svc.createNote({
      quickLinkId: this.link.id,
      body,
      authorName: this.displayName()
    }).subscribe({
      next: (note: Note) => {
        this.notes.update(all => [note, ...all]);
        this.newBody = '';
        this.submitting.set(false);
        this.notesCountChanged.emit({ quickLinkId: this.link.id, count: this.notes().length });
      },
      error: () => this.submitting.set(false)
    });
  }

  deleteNote(id: string) {
    this.svc.deleteNote(id).subscribe({
      next: () => {
        this.notes.update(all => all.filter(n => n.id !== id));
        this.notesCountChanged.emit({ quickLinkId: this.link.id, count: this.notes().length });
      },
      error: () => {}
    });
  }

  renderMarkdown(body: string): SafeHtml {
    const html = marked.parse(body, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  }
}
