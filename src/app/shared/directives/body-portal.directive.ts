import { Directive, DestroyRef, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Mantém overlays fora de containers com overflow ou transform. */
@Directive({selector:'ng-template[appBodyPortal]',standalone:true})
export class BodyPortalDirective implements OnInit {
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  ngOnInit(): void {
    const view = this.container.createEmbeddedView(this.template);
    for (const node of view.rootNodes) this.document.body.appendChild(node);
    this.destroyRef.onDestroy(() => {
      view.destroy();
      for (const node of view.rootNodes) node.parentNode?.removeChild(node);
    });
  }
}
