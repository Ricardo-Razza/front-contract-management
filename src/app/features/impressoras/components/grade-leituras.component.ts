import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import type { ImpressorasComponent } from '../impressoras.component';

export type GradeLeiturasComponentContext = Pick<ImpressorasComponent, 'termoBuscaLeituras' | 'mesCompetencia' | 'carregarLeiturasCompetencia' | 'paginaLeituras' | 'anoCompetencia' | 'showSecretariaDropdownLeituras' | 'toggleSecretariaDropdownLeituras' | 'filtroSecretariasLeituras' | 'getSecretariaNome' | 'selectAllSecretariasFilterLeituras' | 'clearSecretariaFilterLeituras' | 'secretariaFilterSearchLeituras' | 'filteredSecretariasForLeituras' | 'isSecretariaFilterSelectedLeituras' | 'toggleSecretariaFilterLeituras' | 'filtroStatusLeituras' | 'filtroTipoLeituras' | 'removeSecretariaFilterLeituras' | 'itensAlteradosCount' | 'nomeMesCompetencia' | 'descartarAlteracoes' | 'salvandoEmLote' | 'salvarTodasAlteracoes' | 'totalSalvosGrade' | 'totalEquipamentosGrade' | 'percentualConcluidoGrade' | 'totalCopiasMonoMes' | 'totalCopiasColorMes' | 'totalExcedenteMes' | 'totalValorFaturaMes' | 'filteredGradeLeituras' | 'loadingGrade' | 'paginadosGradeLeituras' | 'onLeituraMonoChange' | 'salvarLinhaLeitura' | 'focarProximoInput' | 'onLeituraColorChange' | 'paginaAtualLeituras' | 'tamanhoLeituras'>;

@Component({selector: 'app-grade-leituras', standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent], templateUrl: './grade-leituras.component.html', styleUrl: './grade-leituras.component.scss', changeDetection: ChangeDetectionStrategy.OnPush})
export class GradeLeiturasComponent { @Input({required: true}) context!: GradeLeiturasComponentContext; }
