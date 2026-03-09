import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { CiStatus, WatchedRepo, AddWatchedRepoRequest, GitHubOAuthStatus } from '../models/github.model';

@Injectable({ providedIn: 'root' })
export class GitHubService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/github`;

  getCiStatuses(): Observable<CiStatus[]> {
    return this.http.get<CiStatus[]>(`${this.base}/ci-status`);
  }

  forceSync(): Observable<void> {
    return this.http.post<void>(`${this.base}/sync`, null);
  }

  refreshCi(): Observable<void> {
    return this.http.post<void>(`${this.base}/refresh`, null);
  }

  getCiStatus(owner: string, repo: string): Observable<CiStatus> {
    return this.http.get<CiStatus>(`${this.base}/ci-status/${owner}/${repo}`);
  }

  getWatchedRepos(): Observable<WatchedRepo[]> {
    return this.http.get<WatchedRepo[]>(`${this.base}/watched-repos`);
  }

  addWatchedRepo(req: AddWatchedRepoRequest): Observable<WatchedRepo> {
    return this.http.post<WatchedRepo>(`${this.base}/watched-repos`, req);
  }

  deleteWatchedRepo(repoFullName: string): Observable<void> {
    const [owner, repo] = repoFullName.split('/');
    return this.http.delete<void>(`${this.base}/watched-repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  }

  getOAuthStatus(): Observable<GitHubOAuthStatus> {
    return this.http.get<GitHubOAuthStatus>(`${this.base}/oauth/status`);
  }

  startAuth(): Observable<{ authUrl: string }> {
    return this.http.get<{ authUrl: string }>(`${this.base}/oauth/authorize`);
  }

  disconnect(): Observable<void> {
    return this.http.post<void>(`${this.base}/oauth/disconnect`, null);
  }
}
