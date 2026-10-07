import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import type { ImpressorasComponent } from '../impressoras.component';

export type ColetaImpressorasComponentContext = Pick<ImpressorasComponent, 'anoColeta' | 'mesColeta' | 'abrirModalSelecaoImpressoras' | 'todasImpressorasSelecionadasColeta' | 'impressorasFiltradasModalColeta' | 'totalImpressorasSelecionadasColeta' | 'loadingColeta' | 'coletaAtiva' | 'iniciarColetaAutomatica' | 'metricasColeta' | 'itensColetaFiltrados' | 'paginadosColeta' | 'abrirModalPrint' | 'paginaAtualColeta' | 'tamanhoColeta' | 'paginaColeta' | 'impressorasElegiveisParaColeta' | 'totalImpressorasConfirmadasColeta'>;

@Component({selector: 'app-coleta-impressoras', standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent], templateUrl: './coleta-impressoras.component.html', styleUrl: './coleta-impressoras.component.scss', changeDetection: ChangeDetectionStrategy.OnPush})
export class ColetaImpressorasComponent { @Input({required: true}) context!: ColetaImpressorasComponentContext; }
