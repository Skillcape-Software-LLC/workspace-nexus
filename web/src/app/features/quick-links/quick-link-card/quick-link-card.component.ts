import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuickLink } from '../../../core/models/quick-link.model';
import { CiStatus, CiStatusValue } from '../../../core/models/github.model';

@Component({
  selector: 'app-quick-link-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quick-link-card card h-100" style="cursor:grab;transition:border-color .15s;"
         [style.border-color]="link.isRepo ? 'var(--border-bright)' : 'var(--border)'">
      <div class="card-body d-flex flex-column gap-1 p-3">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <a [href]="link.url" target="_blank" rel="noopener noreferrer"
             class="text-decoration-none flex-grow-1"
             style="font-weight:600;color:var(--text-primary);font-size:0.9rem;line-height:1.3;"
             (click)="$event.stopPropagation()">
            {{ link.name }}
            <i class="bi bi-box-arrow-up-right ms-1" style="font-size:0.7rem;color:var(--text-dim);"></i>
          </a>
          <div class="d-flex gap-1 flex-shrink-0">
            <button class="btn btn-sm p-1" style="color:var(--text-dim);line-height:1;" title="Edit"
                    (click)="edit.emit(link)">
              <i class="bi bi-pencil" style="font-size:0.75rem;"></i>
            </button>
            <button class="btn btn-sm p-1" style="color:var(--red);line-height:1;" title="Delete"
                    (click)="delete.emit(link.id)">
              <i class="bi bi-trash3" style="font-size:0.75rem;"></i>
            </button>
          </div>
        </div>

        @if (link.description) {
          <p class="mb-0 text-dim" style="font-size:0.78rem;line-height:1.4;">{{ link.description }}</p>
        }

        <div class="d-flex align-items-center gap-2 mt-auto pt-1 flex-wrap">
          @if (link.category) {
            <span class="badge"
                  style="background:var(--bg-raised);color:var(--text-secondary);border:1px solid var(--border);font-size:0.7rem;font-weight:500;">
              {{ link.category }}
            </span>
          }
          @if (link.isRepo) {
            <span class="badge font-mono"
                  style="background:var(--bg-raised);color:var(--text-dim);border:1px solid var(--border);font-size:0.68rem;">
              <i class="bi bi-github me-1"></i>
              {{ link.repoOwner }}/{{ link.repoName }}
            </span>
            <!-- CI status badge -->
            @if (ciStatus) {
              <a [href]="ciStatus.runUrl ?? link.url" target="_blank" rel="noopener noreferrer"
                 class="badge font-mono text-decoration-none d-flex align-items-center gap-1"
                 [style.background]="badgeBg(ciStatus.status)"
                 [style.color]="badgeColor(ciStatus.status)"
                 style="font-size:0.68rem;border:1px solid transparent;"
                 (click)="$event.stopPropagation()">
                <i [class]="badgeIcon(ciStatus.status)"
                   [class.spin]="ciStatus.status === 'Running'"></i>
                {{ ciStatus.status }}
              </a>
            } @else if (link.isRepo) {
              <span class="badge font-mono"
                    style="background:var(--bg-raised);color:var(--text-dim);border:1px solid var(--border);font-size:0.68rem;">
                <i class="bi bi-dash-circle me-1"></i>Unknown
              </span>
            }
          }
          <!-- Notes badge -->
          <button class="btn p-0 d-flex align-items-center gap-1 ms-auto"
                  style="color:var(--text-dim);font-size:0.75rem;line-height:1;"
                  title="Notes" (click)="openNotes.emit(link); $event.stopPropagation()">
            <i class="bi bi-journal-text"></i>
            @if (notesCount > 0) {
              <span class="badge rounded-pill"
                    style="background:var(--accent-dim);color:var(--accent);font-size:0.65rem;padding:2px 5px;">
                {{ notesCount }}
              </span>
            }
          </button>
          <span style="cursor:grab;color:var(--text-dim);">
            <i class="bi bi-grip-vertical"></i>
          </span>
        </div>
      </div>
    </div>

    <style>
      .spin { animation: spin 1s linear infinite; display:inline-block; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `
})
export class QuickLinkCardComponent {
  @Input() link!: QuickLink;
  @Input() ciStatus?: CiStatus;
  @Input() notesCount = 0;
  @Output() edit = new EventEmitter<QuickLink>();
  @Output() delete = new EventEmitter<string>();
  @Output() openNotes = new EventEmitter<QuickLink>();

  badgeBg(status: CiStatusValue): string {
    return { Passing: 'rgba(61,220,132,0.15)', Failing: 'rgba(255,91,91,0.15)', Running: 'rgba(244,200,66,0.15)', Unknown: 'var(--bg-raised)' }[status];
  }

  badgeColor(status: CiStatusValue): string {
    return { Passing: 'var(--green)', Failing: 'var(--red)', Running: 'var(--yellow)', Unknown: 'var(--text-dim)' }[status];
  }

  badgeIcon(status: CiStatusValue): string {
    return { Passing: 'bi bi-check-circle-fill', Failing: 'bi bi-x-circle-fill', Running: 'bi bi-arrow-clockwise', Unknown: 'bi bi-dash-circle' }[status];
  }
}
