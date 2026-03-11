import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { UptimeKumaMonitor } from '../models/uptime-kuma.model';

@Injectable({ providedIn: 'root' })
export class UptimeKumaService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/uptime-kuma`;

  getMonitors(): Observable<UptimeKumaMonitor[]> {
    return this.http.get<UptimeKumaMonitor[]>(`${this.base}/monitors`);
  }

  sync(): Observable<void> {
    return this.http.post<void>(`${this.base}/sync`, null);
  }
}
