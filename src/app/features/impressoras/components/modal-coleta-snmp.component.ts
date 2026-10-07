import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { ImpressorasComponent } from '../impressoras.component';

export type ModalColetaSnmpComponentContext = Pick<ImpressorasComponent, 'fecharModalSelecaoImpressoras' | 'buscaImpressoraModalColeta' | 'filtroSecretariaModalColeta' | 'onFiltroSecretariaModalChange' | 'secretariats' | 'filtroRedeModalColeta' | 'impressorasElegiveisParaColeta' | 'totalComIpParaColeta' | 'totalSemIpParaColeta' | 'selecionarTodasImpressorasColeta' | 'impressorasFiltradasModalColeta' | 'desmarcarTodasImpressorasColeta' | 'selecionarApenasComIpColeta' | 'marcarFiltradasModalColeta' | 'desmarcarFiltradasModalColeta' | 'totalImpressorasSelecionadasColeta' | 'todasFiltradasModalMarcadas' | 'alternarSelecaoFiltradasModalColeta' | 'isImpressoraSelecionadaColeta' | 'alternarSelecaoImpressoraColeta' | 'confirmarSelecaoImpressorasColeta'>;

@Component({selector: 'app-modal-coleta-snmp', standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule], templateUrl: './modal-coleta-snmp.component.html', styleUrl: './modal-coleta-snmp.component.scss', changeDetection: ChangeDetectionStrategy.OnPush})
export class ModalColetaSnmpComponent { @Input({required: true}) context!: ModalColetaSnmpComponentContext; }
