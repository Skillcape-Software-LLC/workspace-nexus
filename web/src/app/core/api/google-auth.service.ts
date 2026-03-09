import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface GoogleAuthStatus {
  connected: boolean;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private http = inject(HttpClient);

  getStatus(): Observable<GoogleAuthStatus> {
    return this.http.get<GoogleAuthStatus>(`${API_BASE_URL}/api/google/auth/status`);
  }

  startAuth(): Observable<{ authUrl: string }> {
    return this.http.get<{ authUrl: string }>(`${API_BASE_URL}/api/google/auth/start`);
  }

  disconnect(): Observable<{ disconnected: boolean }> {
    return this.http.post<{ disconnected: boolean }>(`${API_BASE_URL}/api/google/auth/disconnect`, {});
  }
}
