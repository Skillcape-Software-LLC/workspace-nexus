import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { ChatSpace, ChatMessage } from '../../core/models/google.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);

  getSpaces(): Observable<ChatSpace[]> {
    return this.http.get<ChatSpace[]>(`${API_BASE_URL}/api/chat/spaces`);
  }

  getMessages(spaceName: string, maxResults = 10): Observable<ChatMessage[]> {
    const encoded = encodeURIComponent(spaceName.replace('spaces/', ''));
    return this.http.get<ChatMessage[]>(
      `${API_BASE_URL}/api/chat/spaces/${encoded}/messages?maxResults=${maxResults}`
    );
  }
}
