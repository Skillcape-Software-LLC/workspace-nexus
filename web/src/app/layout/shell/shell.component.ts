import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent],
  template: `
    <div class="d-flex flex-column" style="height:100vh;overflow:hidden;">
      <app-topbar />
      <main class="flex-grow-1 overflow-auto p-3 p-md-4">
        <router-outlet />
      </main>
    </div>
  `
})
export class ShellComponent {}
