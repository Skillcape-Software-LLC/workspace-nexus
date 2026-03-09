import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { CalendarEvent } from '../../core/models/google.model';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);

  getEvents(days = 7): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(
      `${API_BASE_URL}/api/calendar/events?days=${days}`
    );
  }
}
