import { Component, Input, ChangeDetectionStrategy, AfterViewInit, OnDestroy, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { ImpressorasComponent } from '../impressoras.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';

export type ModalColetaSnmpComponentContext = Pick<ImpressorasComponent, 'fecharModalSelecaoImpressoras' | 'buscaImpressoraModalColeta' | 'filtroSecretariaModalColeta' | 'onFiltroSecretariaModalChange' | 'secretariats' | 'filtroRedeModalColeta' | 'impressorasElegiveisParaColeta' | 'totalComIpParaColeta' | 'totalSemIpParaColeta' | 'selecionarTodasImpressorasColeta' | 'impressorasFiltradasModalColeta' | 'desmarcarTodasImpressorasColeta' | 'selecionarApenasComIpColeta' | 'marcarFiltradasModalColeta' | 'desmarcarFiltradasModalColeta' | 'totalImpressorasSelecionadasColeta' | 'todasFiltradasModalMarcadas' | 'alternarSelecaoFiltradasModalColeta' | 'isImpressoraSelecionadaColeta' | 'alternarSelecaoImpressoraColeta' | 'confirmarSelecaoImpressorasColeta' | 'limparFiltrosModalColeta' | 'verSelecionadasColeta' | 'filtroEmpenhoModalColeta' | 'filtroLoteModalColeta' | 'filtroTipoModalColeta' | 'filtroSelecaoModalColeta' | 'paginaSelecaoColeta' | 'tamanhoSelecaoColeta' | 'paginaAtualSelecaoColeta' | 'paginadasModalColeta' | 'totalSelecionadasFiltradasColeta' | 'totalSelecionadasOcultasColeta' | 'algumasFiltradasModalMarcadas' | 'possuiIpColeta' | 'empenhos' | 'lotes'>;

@Component({selector: 'app-modal-coleta-snmp', standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent], templateUrl: './modal-coleta-snmp.component.html', styleUrl: './modal-coleta-snmp.component.scss', changeDetection: ChangeDetectionStrategy.OnPush})
export class ModalColetaSnmpComponent implements AfterViewInit, OnDestroy {
  @Input({required: true}) context!: ModalColetaSnmpComponentContext;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private returnFocus?: HTMLElement;
  private frame?: number;

  ngAfterViewInit(): void {
    if (document.activeElement instanceof HTMLElement) this.returnFocus = document.activeElement;
    this.frame = requestAnimationFrame(() => this.element.nativeElement.querySelector<HTMLInputElement>('#coleta-busca')?.focus());
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      this.context.fecharModalSelecaoImpressoras();
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select, summary, [tabindex="0"]'))
      .filter(control => control.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  ngOnDestroy(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.returnFocus?.focus();
  }
}
