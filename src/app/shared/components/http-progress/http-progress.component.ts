import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HttpLoadingService } from '@core/services/http-loading.service';

@Component({
  selector: 'app-http-progress', standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (loading()) { <div class="http-progress" role="progressbar" aria-label="Carregando dados"><span></span></div> }`,
  styles: [`
    .http-progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 10000; pointer-events: none; background: #dbeafe; }
    span { display: block; height: 100%; width: 35%; background: #2563eb; animation: progress 1.2s ease-in-out infinite; }
    @keyframes progress { from { transform: translateX(-100%); } to { transform: translateX(385%); } }
    @media (prefers-reduced-motion: reduce) { span { width: 100%; animation: none; } }
  `]
})
export class HttpProgressComponent { readonly loading = inject(HttpLoadingService).loading; }
