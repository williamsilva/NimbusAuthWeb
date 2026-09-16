import { RouterOutlet } from '@angular/router';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FooterComponent, SidebarComponent, TopbarComponent } from '@williamsilva/nimbus-web-commons';

import { LayoutStateService } from './layout-state.service';

@Component({
  standalone: true,
  selector: 'app-layout',
  styleUrl: './layout.component.css',
  templateUrl: './layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent, FooterComponent],
})
export class LayoutComponent {
  private readonly layout = inject(LayoutStateService);
  readonly sidebarVisible = this.layout.sidebarVisible;
}
