import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import type { ImpressorasComponent } from '../impressoras.component';

export type LocaisImpressorasComponentContext = Pick<ImpressorasComponent,
  'buscaLocais' |
  'filtroSecretariasLocais' |
  'showSecretariaDropdownLocais' |
  'toggleSecretariaDropdownLocais' |
  'getSecretariaNome' |
  'selectAllSecretariasFilterLocais' |
  'clearSecretariaFilterLocais' |
  'secretariaFilterSearchLocais' |
  'filteredSecretariasForLocais' |
  'isSecretariaFilterSelectedLocais' |
  'toggleSecretariaFilterLocais' |
  'removeSecretariaFilterLocais' |
  'filteredLocais' |
  'paginadosLocais' |
  'historicoLocal' |
  'abrirModalEditarLocal' |
  'paginaAtualLocais' |
  'tamanhoLocais' |
  'paginaLocais'
>;

@Component({
  selector: 'app-locais-impressoras',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './locais-impressoras.component.html',
  styleUrl: './locais-impressoras.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocaisImpressorasComponent {
  @Input({required: true}) context!: LocaisImpressorasComponentContext;
}
