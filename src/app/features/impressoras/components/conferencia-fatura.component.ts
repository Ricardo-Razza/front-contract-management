import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EspelhoFatura } from '@core/models';
import { ImpressoraService } from '@core/services/impressora.service';
import { compararFaturas, competenciaAnterior, resumirFatura } from '../financeiro/conferencia-fatura.utils';

@Component({
  selector: 'app-conferencia-fatura', standalone: true, imports: [CommonModule],
  templateUrl: './conferencia-fatura.component.html', styleUrl: './conferencia-fatura.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConferenciaFaturaComponent {
  readonly fatura = input.required<EspelhoFatura>();
  readonly resumo = computed(() => resumirFatura(this.fatura()));
  readonly anterior = signal<EspelhoFatura | null>(null);
  readonly estadoComparacao = signal<'CARREGANDO' | 'PRONTO' | 'ERRO'>('CARREGANDO');
  readonly periodoAnterior = computed(() => competenciaAnterior(this.fatura().mesReferencia, this.fatura().anoReferencia));
  readonly comparacao = computed(() => {
    const anterior = this.anterior();
    return anterior ? compararFaturas(this.fatura(), anterior) : null;
  });
  readonly leiturasAbertas = signal(new Set<number>());
  private readonly tentativa = signal(0);
  private readonly service = inject(ImpressoraService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(onCleanup => {
      const fatura = this.fatura();
      const periodo = this.periodoAnterior();
      this.tentativa();
      this.leiturasAbertas.set(new Set());
      this.anterior.set(null);
      this.estadoComparacao.set('CARREGANDO');
      const subscription = this.service.getEspelhoFatura(fatura.empenhoId, periodo.mes, periodo.ano, true)
        .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: anterior => {
            this.anterior.set(anterior.equipamentos.length || anterior.itens.length || anterior.totalFatura !== 0 ? anterior : null);
            this.estadoComparacao.set('PRONTO');
          },
          error: () => this.estadoComparacao.set('ERRO')
        });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  tentarComparacao(): void { this.tentativa.update(valor => valor + 1); }

  toggleLeitura(index: number): void {
    this.leiturasAbertas.update(abertas => {
      const novas = new Set(abertas);
      if (novas.has(index)) novas.delete(index); else novas.add(index);
      return novas;
    });
  }
}
