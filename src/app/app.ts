import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ToastModule } from 'primeng/toast';

import { SessionExpiryModalComponent } from './shared/session-expiry-modal/session-expiry-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule, SessionExpiryModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
