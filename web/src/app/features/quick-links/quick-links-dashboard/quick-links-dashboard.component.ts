import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { QuickLinksService } from '../../../core/api/quick-links.service';
import { GitHubService } from '../../../core/api/github.service';
import { NotesService } from '../../../core/api/notes.service';
import { QuickLink, CreateQuickLinkRequest, UpdateQuickLinkRequest } from '../../../core/models/quick-link.model';
import { CiStatus } from '../../../core/models/github.model';
import { QuickLinkCardComponent } from '../quick-link-card/quick-link-card.component';
import { QuickLinkFormComponent } from '../quick-link-form/quick-link-form.component';
import { NotesDrawerComponent } from '../../notes/notes-drawer.component';

@Component({
  selector: 'app-quick-links-dashboard',
  standalone: true,
  imports: [CommonModule, DragDropModule, QuickLinkCardComponent, QuickLinkFormComponent, NotesDrawerComponent],
  template: `
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h4 class="mb-0" style="font-family:var(--font-display);font-weight:700;color:var(--text-primary);">
        Quick Links
      </h4>
      <button class="btn btn-accent btn-sm px-3" (click)="openAdd()">
        <i class="bi bi-plus-lg me-1"></i> Add Link
      </button>
    </div>

    @if (loading()) {
      <div class="d-flex justify-content-center py-5">
        <div class="spinner-border" style="color:var(--accent);" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    }

    @if (error()) {
      <div class="alert d-flex align-items-center gap-2"
           style="background:rgba(255,91,91,0.1);border:1px solid var(--red);color:var(--red);">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>{{ error() }}</span>
      </div>
    }

    @if (!loading() && !error() && links().length === 0) {
      <div class="text-center py-5" style="color:var(--text-dim);">
        <i class="bi bi-link-45deg" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
        <p class="mb-1" style="color:var(--text-secondary);font-size:1rem;">No quick links yet.</p>
        <p class="mb-3" style="font-size:0.875rem;">Add your first link to get started.</p>
        <button class="btn btn-accent btn-sm px-4" (click)="openAdd()">
          <i class="bi bi-plus-lg me-1"></i> Add Your First Link
        </button>
      </div>
    }

    @for (cat of categories(); track cat) {
      <div class="mb-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h6 class="mb-0 text-muted-nexus text-uppercase"
              style="font-size:0.7rem;letter-spacing:1.5px;font-weight:600;">
            {{ cat || 'Uncategorized' }}
          </h6>
          <button class="btn btn-sm py-0 px-2"
                  style="font-size:0.75rem;color:var(--text-dim);border:1px solid var(--border);"
                  (click)="openAdd(cat)">
            <i class="bi bi-plus"></i>
          </button>
        </div>

        <div cdkDropList
             [cdkDropListData]="linksByCategory()[cat]"
             [id]="'list-' + cat"
             (cdkDropListDropped)="onDrop($event, cat)"
             class="row g-2">
          @for (link of linksByCategory()[cat]; track link.id) {
            <div class="col-12 col-sm-6 col-lg-4 col-xl-3" cdkDrag>
              <app-quick-link-card
                [link]="link"
                [ciStatus]="ciStatusFor(link)"
                [notesCount]="notesCountFor(link.id)"
                (edit)="openEdit($event)"
                (delete)="deleteLink($event)"
                (openNotes)="openNotesDrawer($event)" />
            </div>
          }
        </div>
      </div>
    }

    @if (showForm()) {
      <app-quick-link-form
        [existing]="editingLink()"
        [existingCategories]="categories()"
        (save)="onSave($event)"
        (cancel)="closeForm()" />
    }

    @if (notesLink()) {
      <app-notes-drawer
        [link]="notesLink()!"
        (close)="closeNotesDrawer()"
        (notesCountChanged)="onNotesCountChanged($event)" />
    }
  `
})
export class QuickLinksDashboardComponent implements OnInit, OnDestroy {
  private svc: QuickLinksService;
  private ghSvc: GitHubService;
  private notesSvc: NotesService;
  private ciTimer?: ReturnType<typeof setInterval>;

  links = signal<QuickLink[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingLink = signal<QuickLink | undefined>(undefined);
  presetCategory = signal<string>('');
  ciStatuses = signal<CiStatus[]>([]);
  notesCounts = signal<Record<string, number>>({});
  notesLink = signal<QuickLink | undefined>(undefined);

  categories = computed(() =>
    [...new Set(this.links().map(l => l.category))].sort()
  );

  linksByCategory = computed(() => {
    const map: Record<string, QuickLink[]> = {};
    for (const cat of this.categories()) {
      map[cat] = this.links().filter(l => l.category === cat);
    }
    return map;
  });

  ciStatusMap = computed(() => {
    const map: Record<string, CiStatus> = {};
    for (const s of this.ciStatuses()) map[s.repoFullName.toLowerCase()] = s;
    return map;
  });

  constructor(svc: QuickLinksService, ghSvc: GitHubService, notesSvc: NotesService) {
    this.svc = svc;
    this.ghSvc = ghSvc;
    this.notesSvc = notesSvc;
  }

  ngOnInit() {
    this.load();
    this.loadCiStatuses();
    this.ciTimer = setInterval(() => this.loadCiStatuses(), 60_000);
  }

  ngOnDestroy() {
    if (this.ciTimer) clearInterval(this.ciTimer);
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getAll().subscribe({
      next: (data: QuickLink[]) => {
        this.links.set(data);
        this.loading.set(false);
        this.loadNotesCounts(data);
      },
      error: () => { this.error.set('Could not load quick links. Is the API running?'); this.loading.set(false); }
    });
  }

  loadNotesCounts(links: QuickLink[]) {
    for (const link of links) {
      this.notesSvc.getNotes(link.id).subscribe({
        next: notes => {
          this.notesCounts.update(m => ({ ...m, [link.id]: notes.length }));
        },
        error: () => {}
      });
    }
  }

  notesCountFor(id: string): number {
    return this.notesCounts()[id] ?? 0;
  }

  loadCiStatuses() {
    this.ghSvc.getCiStatuses().subscribe({
      next: (data: CiStatus[]) => this.ciStatuses.set(data),
      error: () => {}
    });
  }

  ciStatusFor(link: QuickLink): CiStatus | undefined {
    if (!link.isRepo || !link.repoOwner || !link.repoName) return undefined;
    return this.ciStatusMap()[`${link.repoOwner}/${link.repoName}`.toLowerCase()];
  }

  openNotesDrawer(link: QuickLink) {
    this.notesLink.set(link);
  }

  closeNotesDrawer() {
    this.notesLink.set(undefined);
  }

  onNotesCountChanged(event: { quickLinkId: string; count: number }) {
    this.notesCounts.update(m => ({ ...m, [event.quickLinkId]: event.count }));
  }

  openAdd(category = '') {
    this.editingLink.set(undefined);
    this.presetCategory.set(category);
    this.showForm.set(true);
  }

  openEdit(link: QuickLink) {
    this.editingLink.set(link);
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  onSave(req: CreateQuickLinkRequest | UpdateQuickLinkRequest) {
    const editing = this.editingLink();
    if (editing) {
      this.svc.update(editing.id, req as UpdateQuickLinkRequest).subscribe({
        next: (updated: QuickLink) => {
          this.links.update(all => all.map(l => l.id === updated.id ? updated : l));
          this.closeForm();
        },
        error: () => this.error.set('Failed to save changes.')
      });
    } else {
      const create = req as CreateQuickLinkRequest;
      if (this.presetCategory() && !create.category) create.category = this.presetCategory();
      this.svc.create(create).subscribe({
        next: (created: QuickLink) => { this.links.update(all => [...all, created]); this.closeForm(); },
        error: () => this.error.set('Failed to create link.')
      });
    }
  }

  deleteLink(id: string) {
    if (!confirm('Delete this link?')) return;
    this.svc.delete(id).subscribe({
      next: () => this.links.update(all => all.filter(l => l.id !== id)),
      error: () => this.error.set('Failed to delete link.')
    });
  }

  onDrop(event: CdkDragDrop<QuickLink[]>, category: string) {
    const catLinks = [...this.linksByCategory()[category]];
    moveItemInArray(catLinks, event.previousIndex, event.currentIndex);
    const other = this.links().filter(l => l.category !== category);
    const reordered = [...other, ...catLinks];
    this.links.set(reordered);
    this.svc.reorder(reordered.map(l => l.id)).subscribe({
      error: () => this.error.set('Failed to save order.')
    });
  }
}
