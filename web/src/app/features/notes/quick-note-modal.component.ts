import {
  Component, ElementRef, EventEmitter, inject, Input,
  OnChanges, Output, signal, SimpleChanges, ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotesService } from '../../core/api/notes.service';
import { Note } from '../../core/models/note.model';

@Component({
  selector: 'app-quick-note-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Backdrop -->
    <div (click)="close()" style="
      position:fixed;inset:0;background:rgba(0,0,0,0.65);
      z-index:1050;display:flex;align-items:center;justify-content:center;">

      <!-- Panel — stop propagation so clicks inside don't close -->
      <div (click)="$event.stopPropagation()" style="
        width:100%;max-width:600px;margin:1rem;
        background:var(--bg-panel);border:1px solid var(--border);
        border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.5);">

        <!-- Header -->
        <div class="d-flex align-items-center justify-content-between px-4 pt-3 pb-2"
             style="border-bottom:1px solid var(--border);">
          <span style="font-family:var(--font-display);font-weight:700;font-size:0.95rem;color:var(--accent);letter-spacing:1px;">
            QUICK NOTE
          </span>
          <div class="d-flex align-items-center gap-3">
            <span style="font-size:0.75rem;color:var(--text-dim);">Ctrl+Enter to save &nbsp;·&nbsp; Esc to close</span>
            <button (click)="close()" class="btn p-0 d-flex align-items-center"
                    style="color:var(--text-dim);background:none;border:none;font-size:1.1rem;line-height:1;">
              &times;
            </button>
          </div>
        </div>

        <!-- Form -->
        <div class="p-4 d-flex flex-column gap-3">

          <!-- Optional title -->
          <input
            [(ngModel)]="title"
            placeholder="Title (optional)"
            class="qn-input"
            style="
              background:var(--bg-raised);border:1px solid var(--border);
              border-radius:6px;padding:0.4rem 0.75rem;
              color:var(--text-primary);font-size:0.875rem;
              font-family:var(--font-body);outline:none;width:100%;" />

          <!-- Body textarea — primary entry point -->
          <textarea
            #bodyTextarea
            [(ngModel)]="body"
            placeholder="What's on your mind? Markdown supported."
            rows="7"
            (keydown.control.enter)="submit()"
            (keydown.meta.enter)="submit()"
            class="qn-input"
            style="
              background:var(--bg-raised);border:1px solid var(--border);
              border-radius:6px;padding:0.6rem 0.75rem;
              color:var(--text-primary);font-size:0.9rem;
              font-family:var(--font-mono);line-height:1.6;
              resize:vertical;outline:none;width:100%;">
          </textarea>

          <!-- Tags -->
          <input
            [(ngModel)]="tags"
            placeholder="Tags: work, todo, client (comma-separated)"
            class="qn-input"
            style="
              background:var(--bg-raised);border:1px solid var(--border);
              border-radius:6px;padding:0.4rem 0.75rem;
              color:var(--text-secondary);font-size:0.8rem;
              font-family:var(--font-mono);outline:none;width:100%;" />
        </div>

        <!-- Footer -->
        <div class="d-flex align-items-center justify-content-between px-4 pb-4">
          <span style="font-size:0.75rem;color:var(--text-dim);">
            Saving as <strong style="color:var(--text-secondary);">{{ displayName() }}</strong>
          </span>
          <div class="d-flex gap-2">
            <button (click)="close()" class="btn btn-sm"
                    style="background:var(--bg-raised);border:1px solid var(--border);color:var(--text-secondary);">
              Cancel
            </button>
            <button (click)="submit()" [disabled]="submitting() || !body.trim()" class="btn btn-sm"
                    style="background:var(--accent);color:#000;font-weight:600;border:none;min-width:90px;">
              @if (submitting()) {
                Saving…
              } @else {
                Post Note
              }
            </button>
          </div>
        </div>
      </div>
    </div>

    <style>
      .qn-input:focus { border-color: var(--accent) !important; }
    </style>
  `
})
export class QuickNoteModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
  @Output() noteCreated = new EventEmitter<Note>();

  @ViewChild('bodyTextarea') bodyRef!: ElementRef<HTMLTextAreaElement>;

  private svc = inject(NotesService);

  title = '';
  body = '';
  tags = '';
  submitting = signal(false);
  displayName = signal('You');
  private nameLoaded = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      if (!this.nameLoaded) {
        this.svc.getDisplayName().subscribe({
          next: r => this.displayName.set(r.value),
          error: () => {}
        });
        this.nameLoaded = true;
      }
      setTimeout(() => this.bodyRef?.nativeElement?.focus(), 0);
    }
  }

  submit() {
    const b = this.body.trim();
    if (!b || this.submitting()) return;
    this.submitting.set(true);

    this.svc.createNote({
      body: b,
      title: this.title.trim() || null,
      tags: this.tags.trim() || null,
      authorName: this.displayName()
    }).subscribe({
      next: note => {
        this.noteCreated.emit(note);
        this.svc.notifyNoteCreated();
        this.reset();
        this.closed.emit();
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  close() {
    this.closed.emit();
  }

  private reset() {
    this.title = '';
    this.body = '';
    this.tags = '';
  }
}
