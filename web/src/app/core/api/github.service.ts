import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { CiStatus, WatchedAccount, AddWatchedAccountRequest } from '../models/github.model';

@Injectable({ providedIn: 'root' })
export class GitHubService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/github`;

  getCiStatuses(): Observable<CiStatus[]> {
    return this.http.get<CiStatus[]>(`${this.base}/ci-status`);
  }

  getCiStatus(owner: string, repo: string): Observable<CiStatus> {
    return this.http.get<CiStatus>(`${this.base}/ci-status/${owner}/${repo}`);
  }

  getWatchedAccounts(): Observable<WatchedAccount[]> {
    return this.http.get<WatchedAccount[]>(`${this.base}/watched-accounts`);
  }

  addWatchedAccount(req: AddWatchedAccountRequest): Observable<WatchedAccount> {
    return this.http.post<WatchedAccount>(`${this.base}/watched-accounts`, req);
  }

  deleteWatchedAccount(accountName: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/watched-accounts/${encodeURIComponent(accountName)}`);
  }
}
