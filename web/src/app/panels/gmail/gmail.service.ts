import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { EmailSummary, ThreadDetail } from '../../core/models/google.model';

@Injectable({ providedIn: 'root' })
export class GmailService {
  private http = inject(HttpClient);

  getInbox(maxResults = 20): Observable<EmailSummary[]> {
    return this.http.get<EmailSummary[]>(
      `${API_BASE_URL}/api/gmail/inbox?maxResults=${maxResults}`
    );
  }

  getThread(threadId: string, maxMessages = 3): Observable<ThreadDetail> {
    return this.http.get<ThreadDetail>(
      `${API_BASE_URL}/api/gmail/thread/${threadId}?maxMessages=${maxMessages}`
    );
  }
}
