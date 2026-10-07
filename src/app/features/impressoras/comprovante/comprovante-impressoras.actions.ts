

import { inject } from '@angular/core';

import { ImpressoraService } from '@core/services/impressora.service';

import { ColetaItem } from '@core/models';

import type { ImpressorasComponent } from '../impressoras.component';

type Context = Pick<ImpressorasComponent, 'printSelecionado' | 'printZoomLevel' | 'printRotation' | 'printFitMode' | 'printImgDimensions' | 'modalPrintAberto'>;

/** Operações de comprovante; o contexto compartilha o estado da rota, sem duplicá-lo. */
export class ComprovanteImpressorasActions {

  private impressoraService = inject(ImpressoraService);

  constructor(private readonly context: Context) {}

  abrirModalPrint(item: ColetaItem): void {
    this.context.printSelecionado.set(item);
    this.context.printZoomLevel.set(1);
    this.context.printRotation.set(0);
    this.context.printFitMode.set('fit');
    this.context.printImgDimensions.set(null);
    this.context.modalPrintAberto.set(true);
  }

  fecharModalPrint(): void {
    this.context.modalPrintAberto.set(false);
    this.context.printSelecionado.set(null);
    this.context.printZoomLevel.set(1);
    this.context.printRotation.set(0);
    this.context.printFitMode.set('fit');
    this.context.printImgDimensions.set(null);
  }

  onPrintImageLoaded(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.naturalWidth) {
      this.context.printImgDimensions.set({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    }
  }

  toggleFitMode(): void {
    if (this.context.printFitMode() === 'fit') {
      this.context.printFitMode.set('original');
      this.context.printZoomLevel.set(1);
    } else {
      this.context.printFitMode.set('fit');
      this.context.printZoomLevel.set(1);
    }
  }

  zoomInPrint(): void {
    if (this.context.printFitMode() === 'fit') {
      this.context.printFitMode.set('original');
      this.context.printZoomLevel.set(1.25);
    } else {
      this.context.printZoomLevel.update(z => Math.min(Number((z + 0.25).toFixed(2)), 3.5));
    }
  }

  zoomOutPrint(): void {
    if (this.context.printZoomLevel() <= 1 && this.context.printFitMode() === 'original') {
      this.context.printFitMode.set('fit');
      this.context.printZoomLevel.set(1);
    } else {
      this.context.printZoomLevel.update(z => Math.max(Number((z - 0.25).toFixed(2)), 0.5));
    }
  }

  resetZoomPrint(): void {
    this.context.printFitMode.set('fit');
    this.context.printZoomLevel.set(1);
    this.context.printRotation.set(0);
  }

  onPrintWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomInPrint();
    } else {
      this.zoomOutPrint();
    }
  }

  rotatePrint(): void {
    this.context.printRotation.update(r => (r + 90) % 360);
  }

  downloadPrintImage(item: ColetaItem): void {
    const url = this.getUrlImagemColeta(item);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = item.nomeArquivo || `print-${item.modelo || 'impressora'}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  getUrlImagemColeta(item: ColetaItem): string {
    if (!item || !item.sessaoId || !item.nomeArquivo) return '';
    const url = this.impressoraService.getUrlImagemColeta(item.sessaoId, item.nomeArquivo);
    return item.modelo?.toUpperCase().includes('PANTUM')
      ? `${url}?comprovante=snmp-v1&coleta=${encodeURIComponent(item.dataColeta || '')}`
      : url;
  }
}
