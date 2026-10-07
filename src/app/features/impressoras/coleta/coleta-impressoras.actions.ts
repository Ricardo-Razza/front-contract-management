import { DestroyRef as LifecycleDestroyRef, inject as lifecycleInject } from '@angular/core';
import { takeUntilDestroyed as untilComponentDestroyed } from '@angular/core/rxjs-interop';

import { inject } from '@angular/core';

import { ImpressoraService } from '@core/services/impressora.service';

import { ToastService } from '@core/services/toast.service';

import { IniciarColetaRequest, ColetaItem } from '@core/models';

import type { ImpressorasComponent } from '../impressoras.component';

type Context = Pick<ImpressorasComponent, 'coletaAtiva' | 'coletaSessao' | 'secretariaFiltroColeta' | 'filtroSecretariaModalColeta' | 'coletarTodasImpressoras' | 'paginaColeta' | 'impressorasSelecionadasColeta' | 'impressorasElegiveisParaColeta' | 'modalSelecaoImpressorasAberto' | 'selecaoConfirmadaColeta' | 'idsImpressorasSelecionadasEfetivas' | 'impressorasFiltradasModalColeta' | 'filtroRedeModalColeta' | 'todasFiltradasModalMarcadas' | 'anoColeta' | 'mesColeta' | 'empenhoFiltroColeta' | 'loadingColeta' | 'pollingColetaInterval' | 'carregarLeiturasCompetencia'>;

/** Operações de coleta; o contexto compartilha o estado da rota, sem duplicá-lo. */
export class ColetaImpressorasActions {
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

  onSecretariaFiltroColetaChange(val: any): void {
    const id = (val === null || val === 'null' || val === undefined || val === '') ? null : Number(val);
    this.context.secretariaFiltroColeta.set(id);
    this.context.filtroSecretariaModalColeta.set(id);
    this.context.coletarTodasImpressoras.set(true);
    this.context.paginaColeta.set(1);
  }

  onFiltroSecretariaModalChange(val: any): void {
    const id = (val === null || val === 'null' || val === undefined || val === '') ? null : Number(val);
    this.context.filtroSecretariaModalColeta.set(id);
    // O filtro do modal substitui a secretaria anterior do escopo da coleta.
    this.context.secretariaFiltroColeta.set(id);
    this.context.paginaColeta.set(1);
  }

  abrirModalSelecaoImpressoras(): void {
    this.context.filtroSecretariaModalColeta.set(this.context.secretariaFiltroColeta());
    if (this.context.coletarTodasImpressoras()) {
      this.context.impressorasSelecionadasColeta.set(this.context.impressorasElegiveisParaColeta().map(p => p.id));
    }
    this.context.modalSelecaoImpressorasAberto.set(true);
  }

  fecharModalSelecaoImpressoras(): void {
    this.context.modalSelecaoImpressorasAberto.set(false);
  }

  confirmarSelecaoImpressorasColeta(): void {
    this.context.selecaoConfirmadaColeta.set([...this.context.idsImpressorasSelecionadasEfetivas()]);
    this.context.paginaColeta.set(1);
    this.fecharModalSelecaoImpressoras();
  }

  isImpressoraSelecionadaColeta(id: number): boolean {
    return this.context.idsImpressorasSelecionadasEfetivas().includes(id);
  }

  alternarSelecaoImpressoraColeta(id: number): void {
    const current = [...this.context.idsImpressorasSelecionadasEfetivas()];
    const ativas = this.context.impressorasFiltradasModalColeta();
    let updated: number[];
    if (current.includes(id)) {
      updated = current.filter(x => x !== id);
    } else {
      updated = [...current, id];
    }
    this.context.impressorasSelecionadasColeta.set(updated);
    this.context.coletarTodasImpressoras.set(updated.length === ativas.length);
  }

  selecionarTodasImpressorasColeta(): void {
    this.marcarFiltradasModalColeta();
  }

  desmarcarTodasImpressorasColeta(): void {
    this.context.coletarTodasImpressoras.set(false);
    this.context.impressorasSelecionadasColeta.set([]);
  }

  selecionarApenasComIpColeta(): void {
    this.context.filtroRedeModalColeta.set('COM_IP');
    this.marcarFiltradasModalColeta();
  }

  marcarFiltradasModalColeta(): void {
    const filtradas = this.context.impressorasFiltradasModalColeta().map(p => p.id);
    this.context.impressorasSelecionadasColeta.set(filtradas);
    this.context.coletarTodasImpressoras.set(true);
  }

  desmarcarFiltradasModalColeta(): void {
    const filtradas = this.context.impressorasFiltradasModalColeta().map(p => p.id);
    const current = this.context.idsImpressorasSelecionadasEfetivas();
    const restante = current.filter(id => !filtradas.includes(id));
    this.context.coletarTodasImpressoras.set(false);
    this.context.impressorasSelecionadasColeta.set(restante);
  }

  alternarSelecaoFiltradasModalColeta(): void {
    if (this.context.todasFiltradasModalMarcadas()) {
      this.desmarcarFiltradasModalColeta();
    } else {
      this.marcarFiltradasModalColeta();
    }
  }

  iniciarColetaAutomatica(): void {
    if (this.context.coletaAtiva()?.emAndamento) {
      this.toast.info('Já existe uma sessão de coleta em andamento.');
      return;
    }

    const selecionadas = this.context.idsImpressorasSelecionadasEfetivas();
    if (selecionadas.length === 0) {
      this.toast.info('Selecione pelo menos uma impressora para iniciar a coleta.');
      return;
    }

    const req: IniciarColetaRequest = {
      ano: this.context.anoColeta(),
      mes: this.context.mesColeta(),
      empenhoId: this.context.empenhoFiltroColeta() || undefined,
      secretariaId: this.context.secretariaFiltroColeta() || undefined,
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
