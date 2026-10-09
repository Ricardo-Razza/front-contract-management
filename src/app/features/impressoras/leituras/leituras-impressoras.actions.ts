import { DestroyRef as LifecycleDestroyRef, inject as lifecycleInject } from '@angular/core';
import { takeUntilDestroyed as untilComponentDestroyed } from '@angular/core/rxjs-interop';

import { inject } from '@angular/core';

import { ImpressoraService } from '@core/services/impressora.service';

import { ToastService } from '@core/services/toast.service';

import { exportToCsv, getTodayLocalDateString } from '@core/utils';
import { LeituraContadorDTO, ItemGradeLeitura } from '@core/models';

import type { ImpressorasComponent } from '../impressoras.component';

type Context = Pick<ImpressorasComponent, 'showSecretariaDropdownLeituras' | 'secretariaFilterSearchLeituras' | 'filtroSecretariasLeituras' | 'secretariats' | 'mesCompetencia' | 'anoCompetencia' | 'leituras' | 'loadingGrade' | 'gradeLeituras' | 'salvandoEmLote' | 'filteredGradeLeituras'>;

/** Operações de leituras; o contexto compartilha o estado da rota, sem duplicá-lo. */
export class LeiturasImpressorasActions {
  private readonly requestDestroyRef = lifecycleInject(LifecycleDestroyRef);
  private impressoraService = inject(ImpressoraService);

  private toast = inject(ToastService);

  constructor(private readonly context: Context) {}

  toggleSecretariaDropdownLeituras(): void {
    this.context.showSecretariaDropdownLeituras.update(v => !v);
    if (this.context.showSecretariaDropdownLeituras()) {
      this.context.secretariaFilterSearchLeituras.set('');
    }
  }

  toggleSecretariaFilterLeituras(id: number): void {
    this.context.filtroSecretariasLeituras.update(ids => {
      const exists = ids.includes(id);
      return exists ? ids.filter(i => i !== id) : [...ids, id];
    });
  }

  isSecretariaFilterSelectedLeituras(id: number): boolean {
    return this.context.filtroSecretariasLeituras().includes(id);
  }

  selectAllSecretariasFilterLeituras(): void {
    this.context.filtroSecretariasLeituras.set(this.context.secretariats().map(s => s.id));
  }

  clearSecretariaFilterLeituras(): void {
    this.context.filtroSecretariasLeituras.set([]);
  }

  removeSecretariaFilterLeituras(id: number): void {
    this.context.filtroSecretariasLeituras.update(ids => ids.filter(i => i !== id));
  }

  carregarLeiturasCompetencia(): void {
    this.carregarGradeLeituras();
    this.impressoraService.getLeituras(this.context.mesCompetencia(), this.context.anoCompetencia()).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: list => this.context.leituras.set(list),
      error: () => this.toast.error('Erro ao carregar leituras da competência.')
    });
  }

  carregarGradeLeituras(): void {
    this.context.loadingGrade.set(true);
    this.impressoraService.getGradeLeituras(this.context.mesCompetencia(), this.context.anoCompetencia()).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (grade) => {
        const items = grade.map(item => ({
          ...item,
          valorOriginalMono: item.leituraMonoAtual,
          valorOriginalColor: item.leituraColorAtual,
          editado: false,
          salvando: false,
          sucesso: false
        }));
        this.context.gradeLeituras.set(items);
        this.context.loadingGrade.set(false);
      },
      error: () => {

        this.context.loadingGrade.set(false);
      }
    });
  }

  onLeituraMonoChange(item: ItemGradeLeitura, valorStr: string | number): void {
    const str = String(valorStr ?? '').trim();
    const valor = str === '' ? null : Math.max(0, parseInt(str.replace(/\D/g, ''), 10) || 0);
    item.leituraMonoAtual = valor;

    if (valor !== null && valor !== undefined) {
      item.copiasMono = Math.max(0, valor - (item.leituraMonoAnterior || 0));
    } else {
      item.copiasMono = 0;
    }

    item.editado = (item.leituraMonoAtual !== item.valorOriginalMono) || (item.leituraColorAtual !== item.valorOriginalColor);
    item.sucesso = false;
    this.recalcularExcedenteEValorItem(item);
    this.context.gradeLeituras.update(lista => [...lista]);
  }

  onLeituraColorChange(item: ItemGradeLeitura, valorStr: string | number): void {
    const str = String(valorStr ?? '').trim();
    const valor = str === '' ? null : Math.max(0, parseInt(str.replace(/\D/g, ''), 10) || 0);
    item.leituraColorAtual = valor;

    if (valor !== null && valor !== undefined) {
      item.copiasColor = Math.max(0, valor - (item.leituraColorAnterior || 0));
    } else {
      item.copiasColor = 0;
    }

    item.editado = (item.leituraMonoAtual !== item.valorOriginalMono) || (item.leituraColorAtual !== item.valorOriginalColor);
    item.sucesso = false;
    this.recalcularExcedenteEValorItem(item);
    this.context.gradeLeituras.update(lista => [...lista]);
  }

  recalcularExcedenteEValorItem(item: ItemGradeLeitura): void {
    const fMono = item.franquiaMono || 0;
    const fColor = item.franquiaColor || 0;
    item.excedenteMono = Math.max(0, (item.copiasMono || 0) - fMono);
    item.excedenteColor = Math.max(0, (item.copiasColor || 0) - fColor);
  }

  salvarLinhaLeitura(item: ItemGradeLeitura): void {
    if (item.leituraMonoAtual === null || item.leituraMonoAtual === undefined) {
      this.toast.warning(`Informe a leitura mono para o Item #${item.itemPedido || item.impressoraId}`);
      return;
    }

    if (item.leituraMonoAtual < item.leituraMonoAnterior) {
      this.toast.warning(`Leitura Mono (${item.leituraMonoAtual}) não pode ser menor que a anterior (${item.leituraMonoAnterior}) para o Item #${item.itemPedido || item.impressoraId}`);
      return;
    }

    if (item.tipoImpressao === 'COLOR' && item.leituraColorAtual !== null && item.leituraColorAtual !== undefined) {
      if (item.leituraColorAtual < item.leituraColorAnterior) {
        this.toast.warning(`Leitura Color (${item.leituraColorAtual}) não pode ser menor que a anterior (${item.leituraColorAnterior}) para o Item #${item.itemPedido || item.impressoraId}`);
        return;
      }
    }

    item.salvando = true;
    const dto: LeituraContadorDTO = {
      impressoraId: item.impressoraId,
      mesReferencia: this.context.mesCompetencia(),
      anoReferencia: this.context.anoCompetencia(),
      dataLeitura: getTodayLocalDateString(),
      leituraMonoAtual: item.leituraMonoAtual,
      leituraColorAtual: item.tipoImpressao === 'COLOR' ? (item.leituraColorAtual ?? 0) : 0,
      origemLeitura: 'MANUAL',
      observacoes: item.observacoes
    };

    this.impressoraService.lancarLeitura(dto).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (resp) => {
        item.salvando = false;
        item.editado = false;
        item.sucesso = true;
        item.status = 'SALVO';
        item.leituraId = resp.id;
        item.valorOriginalMono = item.leituraMonoAtual;
        item.valorOriginalColor = item.leituraColorAtual;
        item.copiasMono = resp.copiasMono;
        item.copiasColor = resp.copiasColor;
        item.excedenteMono = resp.excedenteMono;
        item.excedenteColor = resp.excedenteColor;
        item.valorLocacao = resp.valorLocacao;
        item.valorTotal = resp.valorTotal;
        this.toast.success(`Leitura do Item #${item.itemPedido || item.impressoraId} salva!`);
        this.context.gradeLeituras.update(lista => [...lista]);
        setTimeout(() => {
          item.sucesso = false;
          this.context.gradeLeituras.update(lista => [...lista]);
        }, 3000);
      },
      error: (err) => {
        item.salvando = false;

      }
    });
  }

  salvarTodasAlteracoes(): void {
    const alterados = this.context.gradeLeituras().filter(item => item.editado);
    if (alterados.length === 0) {
      this.toast.info('Nenhuma leitura foi alterada.');
      return;
    }

    for (const item of alterados) {
      if (item.leituraMonoAtual === null || item.leituraMonoAtual === undefined) {
        this.toast.warning(`Informe a leitura mono para o Item #${item.itemPedido || item.impressoraId}`);
        return;
      }
      if (item.leituraMonoAtual < item.leituraMonoAnterior) {
        this.toast.warning(`Leitura Mono do Item #${item.itemPedido || item.impressoraId} não pode ser menor que a anterior.`);
        return;
      }
      if (item.tipoImpressao === 'COLOR' && item.leituraColorAtual !== null && item.leituraColorAtual !== undefined) {
        if (item.leituraColorAtual < item.leituraColorAnterior) {
          this.toast.warning(`Leitura Color do Item #${item.itemPedido || item.impressoraId} não pode ser menor que a anterior.`);
          return;
        }
      }
    }

    this.context.salvandoEmLote.set(true);
    const dtos: LeituraContadorDTO[] = alterados.map(item => ({
      impressoraId: item.impressoraId,
      mesReferencia: this.context.mesCompetencia(),
      anoReferencia: this.context.anoCompetencia(),
      dataLeitura: getTodayLocalDateString(),
      leituraMonoAtual: item.leituraMonoAtual!,
      leituraColorAtual: item.tipoImpressao === 'COLOR' ? (item.leituraColorAtual ?? 0) : 0,
      origemLeitura: 'MANUAL',
      observacoes: item.observacoes
    }));

    this.impressoraService.salvarLeiturasLote(dtos).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (resps) => {
        this.context.salvandoEmLote.set(false);
        this.toast.success(`${resps.length} leitura(s) salvas com sucesso!`);
        this.carregarGradeLeituras();
      },
      error: (err) => {
        this.context.salvandoEmLote.set(false);

      }
    });
  }

  descartarAlteracoes(): void {
    this.carregarGradeLeituras();
    this.toast.info('Alterações descartadas.');
  }

  focarProximoInput(event: Event): void {
    const target = event.target as HTMLElement;
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.input-inline-leitura:not([disabled])'));
    const index = inputs.indexOf(target as HTMLInputElement);
    if (index >= 0 && index < inputs.length - 1) {
      inputs[index + 1].focus();
      inputs[index + 1].select();
    }
  }

  exportarMedicaoCSV(): void {
    const list = this.context.filteredGradeLeituras();
    const columns = [
      { header: 'Item', accessor: (l: ItemGradeLeitura) => l.itemPedido || l.impressoraId || '' },
      { header: 'Secretaria', accessor: (l: ItemGradeLeitura) => l.secretariaSigla || '' },
      { header: 'Local Instalacao', accessor: (l: ItemGradeLeitura) => l.localInstalacao || '' },
      { header: 'Modelo', accessor: (l: ItemGradeLeitura) => l.modelo || '' },
      { header: 'Tipo', accessor: (l: ItemGradeLeitura) => l.tipoImpressao || '' },
      { header: 'IP', accessor: (l: ItemGradeLeitura) => l.ip || '' },
      { header: 'Leitura Mono Anterior', accessor: (l: ItemGradeLeitura) => (l.leituraMonoAnterior || 0).toLocaleString('pt-BR') },
      { header: 'Leitura Mono Atual', accessor: (l: ItemGradeLeitura) => l.leituraMonoAtual !== null && l.leituraMonoAtual !== undefined ? Number(l.leituraMonoAtual).toLocaleString('pt-BR') : '' },
      { header: 'Copias Mono', accessor: (l: ItemGradeLeitura) => (l.copiasMono || 0).toLocaleString('pt-BR') },
      { header: 'Franquia Mono', accessor: (l: ItemGradeLeitura) => (l.franquiaMono || 0).toLocaleString('pt-BR') },
      { header: 'Excedente Mono', accessor: (l: ItemGradeLeitura) => (l.excedenteMono || 0).toLocaleString('pt-BR') },
      { header: 'Leitura Color Anterior', accessor: (l: ItemGradeLeitura) => l.tipoImpressao === 'COLOR' ? (l.leituraColorAnterior || 0).toLocaleString('pt-BR') : '' },
      { header: 'Leitura Color Atual', accessor: (l: ItemGradeLeitura) => l.tipoImpressao === 'COLOR' && l.leituraColorAtual !== null && l.leituraColorAtual !== undefined ? Number(l.leituraColorAtual).toLocaleString('pt-BR') : '' },
      { header: 'Copias Color', accessor: (l: ItemGradeLeitura) => l.tipoImpressao === 'COLOR' ? (l.copiasColor || 0).toLocaleString('pt-BR') : '' },
      { header: 'Franquia Color', accessor: (l: ItemGradeLeitura) => l.tipoImpressao === 'COLOR' ? (l.franquiaColor || 0).toLocaleString('pt-BR') : '' },
      { header: 'Excedente Color', accessor: (l: ItemGradeLeitura) => l.tipoImpressao === 'COLOR' ? (l.excedenteColor || 0).toLocaleString('pt-BR') : '' },
      { header: 'Valor Locacao', accessor: (l: ItemGradeLeitura) => (l.valorLocacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Valor Total', accessor: (l: ItemGradeLeitura) => (l.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      { header: 'Status', accessor: (l: ItemGradeLeitura) => l.status || '' }
    ];
    exportToCsv('medicao_impressoras_' + this.context.mesCompetencia() + '_' + this.context.anoCompetencia(), columns, list);
    this.toast.success('Medição mensal exportada em .CSV com sucesso!');
  }
}
