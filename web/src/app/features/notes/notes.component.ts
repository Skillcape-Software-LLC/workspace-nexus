import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { Subscription } from 'rxjs';
import { NotesService } from '../../core/api/notes.service';
import { Note, parseTags } from '../../core/models/note.model';
import { KeyboardShortcutService } from '../../core/services/keyboard-shortcut.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <!-- Page header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-3">
        <h4 class="mb-0" style="font-family:var(--font-display);font-weight:700;color:var(--text-primary);">Notes</h4>
        <div class="d-flex" style="background:var(--bg-raised);border:1px solid var(--border);border-radius:8px;overflow:hidden;">
          <button (click)="setView('active')"
                  [style.background]="activeView() === 'active' ? 'var(--accent)' : 'transparent'"
                  [style.color]="activeView() === 'active' ? '#000' : 'var(--text-secondary)'"
                  style="border:none;padding:0.25rem 0.75rem;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .15s;">
            Active
          </button>
          <button (click)="setView('archive')"
                  [style.background]="activeView() === 'archive' ? 'var(--text-dim)' : 'transparent'"
                  [style.color]="activeView() === 'archive' ? '#fff' : 'var(--text-secondary)'"
                  style="border:none;padding:0.25rem 0.75rem;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .15s;">
            Archive
          </button>
        </div>
      </div>
      @if (!loading() && allNotes().length > 0) {
        <span class="badge" style="background:var(--bg-raised);color:var(--text-secondary);border:1px solid var(--border);font-size:0.75rem;">
          {{ filteredNotes().length }}{{ filteredNotes().length !== allNotes().length ? ' of ' + allNotes().length : '' }}
          note{{ allNotes().length === 1 ? '' : 's' }}
        </span>
      }
    </div>

    @if (!loading() && allNotes().length > 0) {
      <!-- Search & filters -->
      <div class="mb-4 d-flex flex-column gap-2">
        <input #searchInput
          [(ngModel)]="searchQuery"
          placeholder="Search notes…"
          class="notes-search"
          style="
            background:var(--bg-raised);border:1px solid var(--border);
            border-radius:8px;padding:0.5rem 0.875rem;
            color:var(--text-primary);font-size:0.875rem;
            font-family:var(--font-body);outline:none;width:100%;max-width:480px;" />

        @if (availableTags().length > 0 || availableCategories().length > 0) {
          <div class="d-flex flex-wrap align-items-center gap-2">
            <span style="font-size:0.75rem;color:var(--text-dim);">Filter:</span>

            @for (tag of availableTags(); track tag) {
              <button (click)="toggleTag(tag)"
                      [style.background]="activeTag() === tag ? 'var(--accent)' : 'var(--bg-raised)'"
                      [style.color]="activeTag() === tag ? '#000' : 'var(--text-secondary)'"
                      [style.borderColor]="activeTag() === tag ? 'var(--accent)' : 'var(--border)'"
                      style="border:1px solid;border-radius:20px;padding:0.15rem 0.6rem;font-size:0.75rem;cursor:pointer;font-family:var(--font-mono);transition:all .15s;">
                #{{ tag }}
              </button>
            }

            @for (cat of availableCategories(); track cat) {
              <button (click)="toggleCategory(cat)"
                      [style.background]="activeCategory() === cat ? 'var(--blue)' : 'var(--bg-raised)'"
                      [style.color]="activeCategory() === cat ? '#fff' : 'var(--text-secondary)'"
                      [style.borderColor]="activeCategory() === cat ? 'var(--blue)' : 'var(--border)'"
                      style="border:1px solid;border-radius:20px;padding:0.15rem 0.6rem;font-size:0.75rem;cursor:pointer;font-family:var(--font-body);transition:all .15s;">
                {{ cat }}
              </button>
            }

            @if (activeTag() || activeCategory() || searchQuery) {
              <button (click)="clearFilters()"
                      style="border:none;background:none;color:var(--text-dim);font-size:0.75rem;cursor:pointer;padding:0.15rem 0.3rem;">
                × clear
              </button>
            }
          </div>
        }
      </div>
    }

    @if (loading()) {
      <div class="d-flex justify-content-center py-5">
        <div class="spinner-border" style="color:var(--accent);" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    } @else if (error()) {
      <div class="alert d-flex align-items-center gap-2"
           style="background:rgba(255,91,91,0.1);border:1px solid var(--red);color:var(--red);">
        <span>{{ error() }}</span>
      </div>
    } @else if (allNotes().length === 0) {
      <div class="text-center py-5" style="color:var(--text-dim);">
        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" class="d-block mx-auto mb-3" style="opacity:0.3;">
          <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
          <path d="M4.5 12.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/>
        </svg>
        @if (activeView() === 'archive') {
          <p class="mb-1" style="color:var(--text-secondary);font-weight:600;">No archived notes.</p>
        } @else {
          <p class="mb-1" style="color:var(--text-secondary);font-weight:600;">No notes yet.</p>
          <p style="font-size:0.875rem;">Press
            <kbd style="background:var(--bg-raised);border:1px solid var(--border);border-radius:3px;padding:1px 5px;font-family:var(--font-mono);font-size:0.8rem;">Alt+N</kbd>
            anywhere to capture your first note.
          </p>
        }
      </div>
    } @else if (filteredNotes().length === 0) {
      <div class="text-center py-4" style="color:var(--text-dim);font-size:0.875rem;">
        No notes match your filter.
        <button (click)="clearFilters()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.875rem;">Clear filters</button>
      </div>
    } @else {
      <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
        @for (note of filteredNotes(); track note.id) {
          <div class="col">
            <div class="h-100 note-card"
                 style="background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;">

              <!-- Card header -->
              <div class="d-flex align-items-start justify-content-between p-3 pb-2"
                   style="border-bottom:1px solid var(--border);">
                <div class="d-flex flex-column gap-1 flex-grow-1 min-w-0 me-2">
                  @if (editingNoteId() === note.id) {
                    <input [(ngModel)]="editTitle"
                           placeholder="Title (optional)"
                           class="edit-input"
                           style="font-size:0.875rem;font-weight:600;" />
                  } @else if (note.title) {
                    <span style="font-size:0.875rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      {{ note.title }}
                    </span>
                  }
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span style="font-size:0.72rem;color:var(--text-dim);">{{ note.createdAt | date:'MMM d · h:mm a' }}</span>
                    @if (note.updatedAt && note.updatedAt !== note.createdAt) {
                      <span style="font-size:0.68rem;color:var(--text-dim);font-style:italic;">edited</span>
                    }
                  </div>
                </div>

                <!-- Action buttons -->
                <div class="d-flex gap-1 flex-shrink-0">
                  @if (editingNoteId() === note.id) {
                    <button (click)="saveEdit(note)" title="Save"
                            style="background:var(--accent);color:#000;border:none;border-radius:5px;padding:0.2rem 0.5rem;font-size:0.75rem;font-weight:600;cursor:pointer;">
                      Save
                    </button>
                    <button (click)="cancelEdit()" title="Cancel"
                            style="background:var(--bg-raised);color:var(--text-secondary);border:1px solid var(--border);border-radius:5px;padding:0.2rem 0.5rem;font-size:0.75rem;cursor:pointer;">
                      Cancel
                    </button>
                  } @else if (activeView() === 'archive') {
                    <!-- Archive view: restore + permanent delete -->
                    <button (click)="restoreNote(note.id)" title="Restore note"
                            class="note-btn-restore"
                            style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:0.2rem 0.3rem;border-radius:4px;line-height:1;">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
                      </svg>
                    </button>
                    <button (click)="permanentlyDelete(note.id)" title="Delete permanently"
                            class="note-btn-del"
                            style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:0.2rem 0.3rem;border-radius:4px;line-height:1;">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                    </button>
                  } @else {
                    <!-- Active view: edit + archive -->
                    <button (click)="startEdit(note)" title="Edit note"
                            class="note-btn-edit"
                            style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:0.2rem 0.3rem;border-radius:4px;line-height:1;">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                        <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                      </svg>
                    </button>
                    <button (click)="archiveNote(note.id)" title="Archive note"
                            class="note-btn-archive"
                            style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:0.2rem 0.3rem;border-radius:4px;line-height:1;">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1V2zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5H2zm13-3H1v2h14V2zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>

              <!-- Card body -->
              <div class="p-3">
                @if (editingNoteId() === note.id) {
                  <textarea [(ngModel)]="editBody"
                            rows="6"
                            (keydown.control.enter)="saveEdit(note)"
                            (keydown.meta.enter)="saveEdit(note)"
                            (keydown.escape)="cancelEdit()"
                            class="edit-input"
                            style="font-size:0.85rem;font-family:var(--font-mono);resize:vertical;min-height:100px;line-height:1.6;">
                  </textarea>
                } @else {
                  <div class="note-body note-clamp note-clickable"
                       (click)="viewingNote.set(note)"
                       [innerHTML]="renderMarkdown(note.body)"
                       style="font-size:0.83rem;color:var(--text-secondary);line-height:1.6;cursor:pointer;"></div>
                }
              </div>

              <!-- Tags & metadata footer -->
              @if (editingNoteId() === note.id) {
                <div class="px-3 pb-3">
                  <input [(ngModel)]="editTags"
                         placeholder="Tags: work, todo (comma-separated)"
                         class="edit-input"
                         style="font-size:0.75rem;font-family:var(--font-mono);" />
                </div>
              } @else if (getTags(note).length > 0 || note.category || note.clientName) {
                <div class="px-3 pb-3 d-flex flex-wrap gap-1">
                  @for (tag of getTags(note); track tag) {
                    <button (click)="toggleTag(tag)"
                            style="background:var(--bg-raised);border:1px solid var(--border);border-radius:20px;
                                   padding:0.1rem 0.5rem;font-size:0.7rem;color:var(--text-dim);cursor:pointer;
                                   font-family:var(--font-mono);">
                      #{{ tag }}
                    </button>
                  }
                  @if (note.category) {
                    <button (click)="toggleCategory(note.category)"
                            style="background:var(--bg-raised);border:1px solid var(--border);border-radius:20px;
                                   padding:0.1rem 0.5rem;font-size:0.7rem;color:var(--text-dim);cursor:pointer;">
                      {{ note.category }}
                    </button>
                  }
                  @if (note.clientName) {
                    <span style="background:var(--bg-raised);border:1px solid var(--border);border-radius:20px;
                                 padding:0.1rem 0.5rem;font-size:0.7rem;color:var(--text-dim);">
                      {{ note.clientName }}
                    </span>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    }

    <!-- Note viewer offcanvas -->
    @if (viewingNote(); as note) {
      <div class="note-viewer-backdrop"></div>
      <div class="note-viewer-offcanvas" (keydown.escape)="viewingNote.set(null)">
        <div class="d-flex align-items-center justify-content-between px-4 py-3"
             style="border-bottom:1px solid var(--border);flex-shrink:0;">
          <div class="d-flex flex-column gap-1 min-w-0 me-3">
            @if (note.title) {
              <h5 class="mb-0" style="font-weight:700;color:var(--text-primary);font-family:var(--font-display);">{{ note.title }}</h5>
            }
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span style="font-size:0.75rem;color:var(--text-dim);">{{ note.createdAt | date:'MMM d, y · h:mm a' }}</span>
              @if (note.updatedAt && note.updatedAt !== note.createdAt) {
                <span style="font-size:0.72rem;color:var(--text-dim);font-style:italic;">edited {{ note.updatedAt | date:'MMM d · h:mm a' }}</span>
              }
              @if (note.authorName) {
                <span style="font-size:0.72rem;color:var(--text-dim);">by {{ note.authorName }}</span>
              }
            </div>
            @if (getTags(note).length > 0 || note.category || note.clientName) {
              <div class="d-flex flex-wrap gap-1 mt-1">
                @for (tag of getTags(note); track tag) {
                  <span style="background:var(--bg-raised);border:1px solid var(--border);border-radius:20px;
                               padding:0.1rem 0.5rem;font-size:0.7rem;color:var(--text-dim);font-family:var(--font-mono);">#{{ tag }}</span>
                }
                @if (note.category) {
                  <span style="background:var(--bg-raised);border:1px solid var(--border);border-radius:20px;
                               padding:0.1rem 0.5rem;font-size:0.7rem;color:var(--text-dim);">{{ note.category }}</span>
                }
                @if (note.clientName) {
                  <span style="background:var(--bg-raised);border:1px solid var(--border);border-radius:20px;
                               padding:0.1rem 0.5rem;font-size:0.7rem;color:var(--text-dim);">{{ note.clientName }}</span>
                }
              </div>
            }
          </div>
          <button (click)="viewingNote.set(null)" title="Close"
                  style="background:var(--bg-raised);border:1px solid var(--border);border-radius:6px;
                         padding:0.3rem 0.6rem;color:var(--text-secondary);cursor:pointer;font-size:0.85rem;flex-shrink:0;">
            ✕
          </button>
        </div>
        <div class="note-body px-4 py-3" style="overflow-y:auto;flex:1;font-size:0.9rem;color:var(--text-secondary);line-height:1.7;"
             [innerHTML]="renderMarkdown(note.body)"></div>
      </div>
    }

    <style>
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
      .note-body pre code { background: transparent; border: none; padding: 0; color: var(--text-primary); }
      .note-body strong { color: var(--text-primary); }
      .note-body a { color: var(--accent); }
      .note-body blockquote {
        border-left: 3px solid var(--accent);
        padding-left: 0.75rem;
        color: var(--text-dim);
        margin: 0;
      }
      .note-clamp {
        display: -webkit-box;
        -webkit-line-clamp: 8;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .edit-input {
        background: var(--bg-base);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.4rem 0.6rem;
        color: var(--text-primary);
        outline: none;
        width: 100%;
      }
      .edit-input:focus { border-color: var(--accent); }
      .notes-search:focus { border-color: var(--accent) !important; }
      .note-card { transition: border-color .15s; }
      .note-card:hover { border-color: var(--text-dim) !important; }
      .note-btn-edit:hover { color: var(--text-primary) !important; }
      .note-btn-del:hover { color: var(--red) !important; }
      .note-btn-archive:hover { color: var(--text-secondary) !important; }
      .note-btn-restore:hover { color: var(--accent) !important; }
      .note-clickable:hover { opacity: 0.8; }
      .note-viewer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1040;
        animation: fadeIn .15s ease;
      }
      .note-viewer-offcanvas {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 70vh;
        background: var(--bg-panel);
        border-top: 1px solid var(--border);
        border-radius: 16px 16px 0 0;
        z-index: 1045;
        display: flex;
        flex-direction: column;
        animation: slideUp .2s ease;
      }
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>
  `
})
export class NotesComponent implements OnInit, OnDestroy {
  private notesSvc = inject(NotesService);
  private shortcuts = inject(KeyboardShortcutService);
  private sub?: Subscription;

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;


  loading = signal(true);
  error = signal<string | null>(null);
  allNotes = signal<Note[]>([]);
  activeView = signal<'active' | 'archive'>('active');

  searchQuery = '';
  activeTag = signal<string | null>(null);
  activeCategory = signal<string | null>(null);

  editingNoteId = signal<string | null>(null);
  editTitle = '';
  editBody = '';
  editTags = '';

  viewingNote = signal<Note | null>(null);

  filteredNotes = computed(() => {
    const q = this.searchQuery.toLowerCase();
    const tag = this.activeTag();
    const cat = this.activeCategory();
    return this.allNotes().filter(n => {
      if (q && !n.body.toLowerCase().includes(q) && !(n.title ?? '').toLowerCase().includes(q)) return false;
      if (tag && !parseTags(n.tags).includes(tag)) return false;
      if (cat && n.category !== cat) return false;
      return true;
    });
  });

  availableTags = computed(() =>
    [...new Set(this.allNotes().flatMap(n => parseTags(n.tags)))].sort()
  );

  availableCategories = computed(() =>
    [...new Set(this.allNotes().map(n => n.category).filter((c): c is string => !!c))].sort()
  );

  ngOnInit() {
    this.load();
    this.sub = this.notesSvc.noteCreated$.subscribe(() => this.load());
    this.shortcuts.register({
      id: 'notes-search',
      key: '/',
      label: 'Search notes',
      category: 'action',
      callback: () => this.searchInputRef?.nativeElement.focus()
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.shortcuts.unregister('notes-search');
  }

  setView(view: 'active' | 'archive') {
    this.activeView.set(view);
    this.clearFilters();
    this.editingNoteId.set(null);
    this.load();
  }

  private load() {
    this.loading.set(true);
    const obs = this.activeView() === 'archive'
      ? this.notesSvc.getArchivedNotes()
      : this.notesSvc.getAllNotes();
    obs.subscribe({
      next: data => { this.allNotes.set(data); this.loading.set(false); },
      error: () => { this.error.set('Could not load notes.'); this.loading.set(false); }
    });
  }

  toggleTag(tag: string) {
    this.activeTag.set(this.activeTag() === tag ? null : tag);
  }

  toggleCategory(cat: string) {
    this.activeCategory.set(this.activeCategory() === cat ? null : cat);
  }

  clearFilters() {
    this.searchQuery = '';
    this.activeTag.set(null);
    this.activeCategory.set(null);
  }

  startEdit(note: Note) {
    this.editingNoteId.set(note.id);
    this.editTitle = note.title ?? '';
    this.editBody = note.body;
    this.editTags = note.tags ?? '';
  }

  cancelEdit() {
    this.editingNoteId.set(null);
  }

  saveEdit(note: Note) {
    const body = this.editBody.trim();
    if (!body) return;

    this.notesSvc.updateNote(note.id, {
      title: this.editTitle.trim() || null,
      body,
      tags: this.editTags.trim() || null,
      category: note.category,
      clientName: note.clientName
    }).subscribe({
      next: updated => {
        this.allNotes.update(notes => notes.map(n => n.id === updated.id ? { ...n, ...updated } : n));
        this.editingNoteId.set(null);
      }
    });
  }

  archiveNote(id: string) {
    this.notesSvc.archiveNote(id).subscribe({
      next: () => this.allNotes.update(notes => notes.filter(n => n.id !== id))
    });
  }

  restoreNote(id: string) {
    this.notesSvc.restoreNote(id).subscribe({
      next: () => this.allNotes.update(notes => notes.filter(n => n.id !== id))
    });
  }

  permanentlyDelete(id: string) {
    this.notesSvc.permanentlyDeleteNote(id).subscribe({
      next: () => this.allNotes.update(notes => notes.filter(n => n.id !== id))
    });
  }

  getTags(note: Note): string[] {
    return parseTags(note.tags);
  }

  renderMarkdown(body: string): string {
    return marked.parse(body, { async: false }) as string;
  }
}
