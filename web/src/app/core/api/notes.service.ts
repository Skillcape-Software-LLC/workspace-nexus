import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { Note, CreateNoteRequest, HealthStatus } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private http = inject(HttpClient);

  getNotes(quickLinkId: string): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_BASE_URL}/api/notes?quickLinkId=${quickLinkId}`);
  }

  createNote(req: CreateNoteRequest): Observable<Note> {
    return this.http.post<Note>(`${API_BASE_URL}/api/notes`, req);
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/api/notes/${id}`);
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
