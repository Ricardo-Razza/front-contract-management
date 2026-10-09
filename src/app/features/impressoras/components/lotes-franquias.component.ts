import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import type { ImpressorasComponent } from '../impressoras.component';

export type LotesFranquiasComponentContext = Pick<ImpressorasComponent,
  'mesBalanco' |
  'anoBalanco' |
  'carregarBalancoFranquias' |
  'exportarBalancoFranquiasCSV' |
  'balancoFranquias' |
  'lotes' |
  'paginaAtualLotes' |
  'tamanhoLotes' |
  'paginaLotes' |
  'lotesVisiveis'
>;

@Component({
  selector: 'app-lotes-franquias',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './lotes-franquias.component.html',
  styleUrl: './lotes-franquias.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LotesFranquiasComponent {
  @Input({required: true}) context!: LotesFranquiasComponentContext;
}
