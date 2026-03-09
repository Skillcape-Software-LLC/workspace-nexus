import { Component } from '@angular/core';
import { GmailPanelComponent } from '../../panels/gmail/gmail-panel.component';
import { ChatPanelComponent } from '../../panels/gchat/chat-panel.component';
import { CalendarPanelComponent } from '../../panels/calendar/calendar-panel.component';
import { GithubPanelComponent } from '../../panels/github/github-panel.component';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [GmailPanelComponent, ChatPanelComponent, CalendarPanelComponent, GithubPanelComponent],
  template: `
    <div class="row g-3">
      <!-- Gmail -->
      <div class="col-12 col-lg-4">
        @defer (on idle) {
          <app-gmail-panel />
        } @loading {
          <div class="card" style="height:200px;border-color:var(--border);"></div>
        }
      </div>

      <!-- Google Chat -->
      <div class="col-12 col-lg-4">
        @defer (on idle) {
          <app-chat-panel />
        } @loading {
          <div class="card" style="height:200px;border-color:var(--border);"></div>
        }
      </div>

      <!-- Calendar -->
      <div class="col-12 col-lg-4">
        @defer (on idle) {
          <app-calendar-panel />
        } @loading {
          <div class="card" style="height:200px;border-color:var(--border);"></div>
        }
      </div>

      <!-- GitHub CI -->
      <div class="col-12">
        @defer (on idle) {
          <app-github-panel />
        } @loading {
          <div class="card" style="height:120px;border-color:var(--border);"></div>
        }
      </div>
    </div>
  `
})
export class HubComponent {}
