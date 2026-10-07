import { DestroyRef as LifecycleDestroyRef, inject as lifecycleInject } from '@angular/core';
import { takeUntilDestroyed as untilComponentDestroyed } from '@angular/core/rxjs-interop';

import { inject } from '@angular/core';

import { ImpressoraService } from '@core/services/impressora.service';

import { ToastService } from '@core/services/toast.service';

import { IniciarColetaRequest, ColetaItem } from '@core/models';

import { possuiIpColeta } from './coleta-selecao.utils';

import type { ImpressorasComponent } from '../impressoras.component';

type Context = Pick<ImpressorasComponent, 'coletaAtiva' | 'coletaSessao' | 'filtroSecretariaModalColeta' | 'coletarTodasImpressoras' | 'paginaColeta' | 'impressorasSelecionadasColeta' | 'impressorasElegiveisParaColeta' | 'modalSelecaoImpressorasAberto' | 'selecaoConfirmadaColeta' | 'idsImpressorasSelecionadasEfetivas' | 'impressorasFiltradasModalColeta' | 'filtroRedeModalColeta' | 'todasFiltradasModalMarcadas' | 'anoColeta' | 'mesColeta' | 'loadingColeta' | 'pollingColetaInterval' | 'carregarLeiturasCompetencia' | 'idsImpressorasConfirmadasColeta' | 'selecionadasColetaSet' | 'buscaImpressoraModalColeta' | 'filtroEmpenhoModalColeta' | 'filtroLoteModalColeta' | 'filtroTipoModalColeta' | 'filtroSelecaoModalColeta' | 'paginaSelecaoColeta'>;

/** Operações de coleta; o contexto compartilha o estado da rota, sem duplicá-lo. */
export class ColetaImpressorasActions {
  private selecaoAntesDoModal?: { todas: boolean; ids: number[] };
  private readonly requestDestroyRef = lifecycleInject(LifecycleDestroyRef);
  private impressoraService = inject(ImpressoraService);

  private toast = inject(ToastService);

  constructor(private readonly context: Context) {}

  carregarDadosColeta(): void {
    this.verificarColetaAtivaOuUltima();
  }

  verificarColetaAtivaOuUltima(): void {
    this.impressoraService.getColetaAtiva().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (progresso) => {
        if (progresso && progresso.emAndamento) {
          this.context.coletaAtiva.set(progresso);
          this.iniciarPollingColeta();
          this.carregarSessaoColeta(progresso.sessaoId, false);
        } else {
          this.carregarUltimaSessaoColeta();
        }
      },
      error: () => {
        this.carregarUltimaSessaoColeta();
      }
    });
  }

  carregarUltimaSessaoColeta(): void {
    this.impressoraService.getUltimaColeta().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (sessao) => {
        if (sessao) this.context.coletaSessao.set(sessao);
      }
    });
  }

  onSecretariaFiltroColetaChange(val: unknown): void {
    this.onFiltroSecretariaModalChange(val);
  }

  onFiltroSecretariaModalChange(val: unknown): void {
    const id = val === null || val === undefined || val === '' || val === 'null' ? null : Number(val);
    this.context.filtroSecretariaModalColeta.set(id);
    this.context.paginaSelecaoColeta.set(1);
  }

  abrirModalSelecaoImpressoras(): void {
    if (this.context.modalSelecaoImpressorasAberto()) return;
    this.selecaoAntesDoModal = {
      todas: this.context.coletarTodasImpressoras(), ids: [...this.context.impressorasSelecionadasColeta()]
    };
    this.context.modalSelecaoImpressorasAberto.set(true);
  }

  fecharModalSelecaoImpressoras(): void {
    if (this.selecaoAntesDoModal) {
      this.context.coletarTodasImpressoras.set(this.selecaoAntesDoModal.todas);
      this.context.impressorasSelecionadasColeta.set(this.selecaoAntesDoModal.ids);
      this.selecaoAntesDoModal = undefined;
    }
    this.context.modalSelecaoImpressorasAberto.set(false);
  }

  confirmarSelecaoImpressorasColeta(): void {
    const ids = [...this.context.idsImpressorasSelecionadasEfetivas()];
    this.context.selecaoConfirmadaColeta.set(ids);
    this.context.impressorasSelecionadasColeta.set(ids);
    this.context.coletarTodasImpressoras.set(false);
    this.selecaoAntesDoModal = undefined;
    this.context.paginaColeta.set(1);
    this.fecharModalSelecaoImpressoras();
  }

  isImpressoraSelecionadaColeta(id: number): boolean {
    return this.context.selecionadasColetaSet().has(id);
  }

  alternarSelecaoImpressoraColeta(id: number): void {
    const atuais = new Set(this.context.idsImpressorasSelecionadasEfetivas());
    if (atuais.has(id)) atuais.delete(id); else atuais.add(id);
    this.definirSelecao([...atuais]);
  }

  selecionarTodasImpressorasColeta(): void {
    this.definirSelecao(this.context.impressorasElegiveisParaColeta().map(p => p.id));
  }

  desmarcarTodasImpressorasColeta(): void { this.definirSelecao([]); }

  selecionarApenasComIpColeta(): void {
    this.definirSelecao(this.context.impressorasElegiveisParaColeta().filter(p => possuiIpColeta(p.ip)).map(p => p.id));
  }

  marcarFiltradasModalColeta(): void {
    const ids = new Set(this.context.idsImpressorasSelecionadasEfetivas());
    this.context.impressorasFiltradasModalColeta().forEach(p => ids.add(p.id));
    this.definirSelecao([...ids]);
  }

  desmarcarFiltradasModalColeta(): void {
    const filtradas = new Set(this.context.impressorasFiltradasModalColeta().map(p => p.id));
    this.definirSelecao(this.context.idsImpressorasSelecionadasEfetivas().filter(id => !filtradas.has(id)));
  }

  alternarSelecaoFiltradasModalColeta(): void {
    if (this.context.todasFiltradasModalMarcadas()) this.desmarcarFiltradasModalColeta();
    else this.marcarFiltradasModalColeta();
  }

  limparFiltrosModalColeta(): void {
    this.context.buscaImpressoraModalColeta.set('');
    this.context.filtroSecretariaModalColeta.set(null);
    this.context.filtroEmpenhoModalColeta.set(null);
    this.context.filtroLoteModalColeta.set(null);
    this.context.filtroTipoModalColeta.set('TODOS');
    this.context.filtroRedeModalColeta.set('TODAS');
    this.context.filtroSelecaoModalColeta.set('TODAS');
    this.context.paginaSelecaoColeta.set(1);
  }

  private definirSelecao(ids: number[]): void {
    this.context.impressorasSelecionadasColeta.set(ids);
    this.context.coletarTodasImpressoras.set(false);
  }

  iniciarColetaAutomatica(): void {
    if (this.context.coletaAtiva()?.emAndamento) {
      this.toast.info('Já existe uma sessão de coleta em andamento.');
      return;
    }

    const selecionadas = this.context.idsImpressorasConfirmadasColeta();
    if (selecionadas.length === 0) {
      this.toast.info('Selecione pelo menos uma impressora para iniciar a coleta.');
      return;
    }

    const req: IniciarColetaRequest = {
      ano: this.context.anoColeta(),
      mes: this.context.mesColeta(),
      impressoraIds: selecionadas
    };

    this.context.loadingColeta.set(true);
    this.impressoraService.iniciarColeta(req).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (progresso) => {
        this.context.coletaAtiva.set(progresso);
        this.toast.success('Coleta de contadores iniciada em segundo plano!');
        if (progresso.ultimaMensagem?.includes('ignorada(s)')) this.toast.info(progresso.ultimaMensagem);
        this.iniciarPollingColeta();
        this.carregarSessaoColeta(progresso.sessaoId, false);
        this.context.loadingColeta.set(false);
      },
      error: (err) => {

        this.context.loadingColeta.set(false);
      }
    });
  }

  iniciarPollingColeta(): void {
    this.pararPollingColeta();
    this.context.pollingColetaInterval = setInterval(() => {
      this.impressoraService.getColetaAtiva().pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: (progresso) => {
          if (progresso && progresso.emAndamento) {
            this.context.coletaAtiva.set(progresso);
            if (progresso.sessaoId) {
              this.carregarSessaoColeta(progresso.sessaoId, false);
            }
          } else {
            this.pararPollingColeta();
            this.context.coletaAtiva.set(null);
            this.toast.success('Coleta automática de contadores concluída!');
            this.carregarUltimaSessaoColeta();
          }
        },
        error: () => {
          this.pararPollingColeta();
        }
      });
    }, 2500);
  }

  pararPollingColeta(): void {
    if (this.context.pollingColetaInterval) {
      clearInterval(this.context.pollingColetaInterval);
      this.context.pollingColetaInterval = null;
    }
  }

  carregarSessaoColeta(id: number, showLoading = true): void {
    if (showLoading) this.context.loadingColeta.set(true);
    this.impressoraService.getColetaPorId(id, !showLoading).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (sessao) => {
        this.context.coletaSessao.set(sessao);
        if (showLoading) this.context.loadingColeta.set(false);
      },
      error: (err) => {
        if (showLoading) {

          this.context.loadingColeta.set(false);
        }
      }
    });
  }

  baixarZipColeta(): void {
    const sessao = this.context.coletaSessao();
    if (!sessao) return;

    this.toast.info('Preparando download do pacote de prints...');
    this.impressoraService.baixarZipColeta(sessao.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contadores_${sessao.anoReferencia}_${String(sessao.mesReferencia).padStart(2, '0')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success('Pacote de prints baixado com sucesso!');
      },
      error: (err) => {

      }
    });
  }

  aplicarLeiturasColeta(): void {
    const sessao = this.context.coletaSessao();
    if (!sessao) return;

    this.context.loadingColeta.set(true);
    this.impressoraService.aplicarLeiturasColeta(sessao.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (res) => {
        this.toast.success(res.mensagem);
        this.context.loadingColeta.set(false);
        this.context.carregarLeiturasCompetencia();
      },
      error: (err) => {

        this.context.loadingColeta.set(false);
      }
    });
  }

  recoletarItem(item: ColetaItem): void {
    if (!item || item.id <= 0 || item.sessaoId <= 0) return;
    const statusAnterior = item.status;
    this.toast.info(`Tentando reconectar ao IP ${item.ip}...`);
    item.status = 'PENDENTE';
    this.impressoraService.recoletarItem(item.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success(`Coleta disparada para o equipamento ${item.itemPedido}!`);
        setTimeout(() => {
          if (this.context.coletaSessao()) {
            this.carregarSessaoColeta(this.context.coletaSessao()!.id, false);
          }
        }, 3500);
      },
      error: (err) => {
        item.status = statusAnterior;

      }
    });
  }

  recoletarTodasFalhas(): void {
    const sessao = this.context.coletaSessao();
    if (!sessao) return;

    this.toast.info('Tentando reconectar a todos os equipamentos offline...');
    this.impressoraService.recoletarFalhas(sessao.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (res) => {
        this.toast.success(res.mensagem);
        this.iniciarPollingColeta();
      },
      error: (err) => {

      }
    });
  }
}
