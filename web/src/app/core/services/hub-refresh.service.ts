import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HubRefreshService {
  private refresh$ = new Subject<void>();
  readonly onRefresh$ = this.refresh$.asObservable();

  refreshAll(): void {
    this.refresh$.next();
  }
}
