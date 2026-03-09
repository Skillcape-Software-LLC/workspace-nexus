import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { QuickLink, CreateQuickLinkRequest, UpdateQuickLinkRequest } from '../models/quick-link.model';

@Injectable({ providedIn: 'root' })
export class QuickLinksService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/quick-links`;

  getAll(): Observable<QuickLink[]> {
    return this.http.get<QuickLink[]>(this.base);
  }

  create(req: CreateQuickLinkRequest): Observable<QuickLink> {
    return this.http.post<QuickLink>(this.base, req);
  }

  update(id: string, req: UpdateQuickLinkRequest): Observable<QuickLink> {
    return this.http.put<QuickLink>(`${this.base}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  reorder(ids: string[]): Observable<void> {
    return this.http.post<void>(`${this.base}/reorder`, { ids });
  }
}
