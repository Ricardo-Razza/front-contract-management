import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpProgressComponent } from './shared/components/http-progress/http-progress.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpProgressComponent],
  template: `<app-http-progress /><router-outlet></router-outlet>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent { }
