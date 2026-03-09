import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { Note, CreateNoteRequest, UpdateNoteRequest, HealthStatus } from '../models/note.model';

export interface NoteFilters {
  search?: string;
  category?: string;
  clientName?: string;
  tag?: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  private http = inject(HttpClient);

  getAllNotes(filters?: NoteFilters): Observable<Note[]> {
    let params = new HttpParams();
    if (filters?.search)     params = params.set('search', filters.search);
    if (filters?.category)   params = params.set('category', filters.category);
    if (filters?.clientName) params = params.set('clientName', filters.clientName);
    if (filters?.tag)        params = params.set('tag', filters.tag);
    return this.http.get<Note[]>(`${API_BASE_URL}/api/notes`, { params });
  }

  getNotes(quickLinkId: string): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_BASE_URL}/api/notes?quickLinkId=${quickLinkId}`);
  }

  getNote(id: string): Observable<Note> {
    return this.http.get<Note>(`${API_BASE_URL}/api/notes/${id}`);
  }

  createNote(req: CreateNoteRequest): Observable<Note> {
    return this.http.post<Note>(`${API_BASE_URL}/api/notes`, req);
  }

  updateNote(id: string, req: UpdateNoteRequest): Observable<Note> {
    return this.http.put<Note>(`${API_BASE_URL}/api/notes/${id}`, req);
  }

  archiveNote(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/api/notes/${id}`);
  }

  restoreNote(id: string): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/api/notes/${id}/restore`, null);
  }

  permanentlyDeleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/api/notes/${id}/permanent`);
  }

  getArchivedNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_BASE_URL}/api/notes/archived`);
  }

  getDisplayName(): Observable<{ value: string }> {
    return this.http.get<{ value: string }>(`${API_BASE_URL}/api/config/display-name`);
  }

  setDisplayName(value: string): Observable<{ value: string }> {
    return this.http.put<{ value: string }>(`${API_BASE_URL}/api/config/display-name`, { value });
  }

  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${API_BASE_URL}/api/health`);
  }
}
