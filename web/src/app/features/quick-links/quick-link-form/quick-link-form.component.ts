import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { QuickLink, CreateQuickLinkRequest, UpdateQuickLinkRequest } from '../../../core/models/quick-link.model';

export type QuickLinkFormResult = CreateQuickLinkRequest | UpdateQuickLinkRequest;

@Component({
  selector: 'app-quick-link-form',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.6);" (click)="onBackdrop($event)">
      <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" style="font-family:var(--font-display);color:var(--text-primary);">
              {{ editing ? 'Edit Link' : 'Add Quick Link' }}
            </h5>
            <button type="button" class="btn-close" (click)="cancel.emit()"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label text-muted-nexus small">Name *</label>
              <input class="form-control" [(ngModel)]="form.name" placeholder="e.g. GitHub" />
            </div>
            <div class="mb-3">
              <label class="form-label text-muted-nexus small">URL *</label>
              <input class="form-control" [(ngModel)]="form.url" placeholder="https://..." />
            </div>
            <div class="mb-3">
              <label class="form-label text-muted-nexus small">Category</label>
              <input class="form-control" [(ngModel)]="form.category"
                     list="category-suggestions" placeholder="e.g. Dev, Work, Tools" />
              <datalist id="category-suggestions">
                @for (cat of existingCategories; track cat) {
                  <option [value]="cat"></option>
                }
              </datalist>
            </div>
            <div class="mb-3">
              <label class="form-label text-muted-nexus small">Description</label>
              <input class="form-control" [(ngModel)]="form.description" placeholder="Optional short description" />
            </div>

            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="isRepoSwitch" [(ngModel)]="form.isRepo" />
              <label class="form-check-label text-muted-nexus" for="isRepoSwitch">GitHub Repository</label>
            </div>

            @if (form.isRepo) {
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <label class="form-label text-muted-nexus small">Owner</label>
                  <input class="form-control" [(ngModel)]="form.repoOwner" placeholder="owner" />
                </div>
                <div class="col-6">
                  <label class="form-label text-muted-nexus small">Repo Name</label>
                  <input class="form-control" [(ngModel)]="form.repoName" placeholder="repo-name" />
                </div>
              </div>
            }
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" (click)="cancel.emit()">Cancel</button>
            <button class="btn btn-accent btn-sm" (click)="submit()" [disabled]="!isValid()">
              {{ editing ? 'Save Changes' : 'Add Link' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class QuickLinkFormComponent implements OnInit {
  @Input() existing?: QuickLink;
  @Input() existingCategories: string[] = [];
  @Output() save = new EventEmitter<QuickLinkFormResult>();
  @Output() cancel = new EventEmitter<void>();

  editing = false;
  form: QuickLinkFormResult = { name: '', url: '', category: '', description: '', isRepo: false, repoOwner: '', repoName: '' };

  ngOnInit() {
    if (this.existing) {
      this.editing = true;
      this.form = {
        name: this.existing.name,
        url: this.existing.url,
        category: this.existing.category,
        description: this.existing.description ?? '',
        isRepo: this.existing.isRepo,
        repoOwner: this.existing.repoOwner ?? '',
        repoName: this.existing.repoName ?? ''
      };
    }
  }

  isValid(): boolean {
    return !!this.form.name.trim() && !!this.form.url.trim();
  }

  submit() {
    if (!this.isValid()) return;
    this.save.emit({ ...this.form });
  }

  onBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal')) this.cancel.emit();
  }
}
