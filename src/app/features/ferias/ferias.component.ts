import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  DestroyRef,
  afterNextRender,
  Injector,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { forkJoin, of, Subject, timer } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";
import { HeaderComponent, LoadingSkeletonComponent } from "@shared";
import {
  FeriasService,
  ServidorService,
  SecretariaService,
  ToastService,
} from "@core/services";
import {
  AgendamentoFerias,
  AgendamentoFeriasDTO,
  PeriodoAquisitivo,
  Servant,
  Secretariat,
  TipoAfastamento,
  StatusFerias,
  VerificacaoConflitoResponse,
  EscalaAnual,
  DiaInfo,
} from "@core/models";

import {
  montarEscala,
  corPeriodo,
  corAgendamento,
  LinhaEscala,
  FaixaEscala,
} from "./ferias-escala.utils";

export interface DiaCalendarioGrid {
  data: string;
  diaNumero: number;
  mesAtual: boolean;
  ehHoje: boolean;
  ehFimDeSemana: boolean;
  ehFeriado: boolean;
  nomeFeriado?: string;
  eventos: AgendamentoFerias[];
}

export interface MesTimelineInfo {
  numero: number;
  nome: string;
  totalDias: number;
  diasValidos: DiaInfo[];
  diaHoje: number | null;
  linhas: LinhaEscala[];
}

@Component({
  selector: "app-ferias",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    LoadingSkeletonComponent,
  ],
  templateUrl: "./ferias.component.html",
  styleUrls: ["./ferias.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeriasComponent implements OnInit {
  private api = inject(FeriasService);
  private servidorService = inject(ServidorService);
  private secretariaService = inject(SecretariaService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private recarregar = new Subject<void>();
  private verificar = new Subject<void>();
  aba = signal<"agendamentos" | "escala" | "saldos">("escala");
  modoVisualizacao = signal<"timeline" | "calendario" | "matriz">("timeline");
  mesNavegacao = signal<number>(new Date().getMonth() + 1);
  nomeMesNavegacao = computed(() => this.meses[this.mesNavegacao() - 1]);
  calendarioReferencia = signal<EscalaAnual | null>(null);
  mesEscala = signal(0);
  periodoDestaque = signal("");
  corPeriodo = corPeriodo;
  corAgendamento = corAgendamento;
  ano = signal(new Date().getFullYear());
  mes = signal(0);
  busca = signal("");
  secretaria = signal<number | null>(null);
  setor = signal("");
  status = signal("");
  pagina = signal(1);
  readonly meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  readonly anos = Array.from(
    { length: 11 },
    (_, i) => new Date().getFullYear() - 5 + i,
  );
  readonly tipos: Record<TipoAfastamento, string> = {
    FERIAS: "Férias",
    LICENCA_SAUDE: "Licença saúde",
    LICENCA_PREMIO: "Licença prêmio",
    FOLGA: "Folga",
  };
  readonly situacoes: Record<StatusFerias, string> = {
    PLANEJADO: "Planejado",
    CONFIRMADO: "Confirmado",
    CANCELADO: "Cancelado",
  };
  readonly hoje = this.dataLocal(new Date());
  agendamentos = signal<AgendamentoFerias[]>([]);
  periodos = signal<PeriodoAquisitivo[]>([]);
  servidores = signal<Servant[]>([]);
  secretarias = signal<Secretariat[]>([]);
  carregando = signal(true);
  erro = signal(false);
  painel = signal(false);
  cadastroPeriodo = signal(false);
  edicao = signal<AgendamentoFerias | null>(null);
  cancelamento = signal<AgendamentoFerias | null>(null);
  salvando = signal(false);
  salvandoPeriodo = signal(false);
  cancelando = signal(false);
  erroForm = signal("");
  erroPeriodo = signal("");
  conflito = signal<VerificacaoConflitoResponse | null>(null);
  verificando = signal(false);
  falhaConflito = signal(false);
  buscaServidor = signal("");
  menuServidoresAberto = signal(false);
  formValor = signal<Partial<{
    servidorId: string | null;
    tipoAfastamento: string | null;
    periodoAquisitivoId: string | null;
    fracao: string | null;
    dataInicio: string | null;
    dataFim: string | null;
    status: string | null;
    observacao: string | null;
    confirmarComConflito: boolean | null;
  }>>({});
  periodoServidor = signal<number | null>(null);
  private ultimoFoco: HTMLElement | null = null;
  form = this.fb.group({
    servidorId: ["", Validators.required],
    tipoAfastamento: ["FERIAS", Validators.required],
    periodoAquisitivoId: [""],
    fracao: [""],
    dataInicio: ["", Validators.required],
    dataFim: ["", Validators.required],
    status: ["PLANEJADO", Validators.required],
    observacao: [""],
    confirmarComConflito: [false],
  });
  formPeriodo = this.fb.group({
    servidorId: ["", Validators.required],
    dataInicio: ["", Validators.required],
    dataFim: ["", Validators.required],
    limiteGozo: [""],
    totalDias: [
      30,
      [Validators.required, Validators.min(1), Validators.max(60)],
    ],
  });
  setores = computed(() =>
    [
      ...new Set(
        this.servidores()
          .filter((s) => this.pertenceSecretaria(s))
          .map((s) => s.setor)
          .filter((s): s is string => !!s),
      ),
    ].sort(),
  );
  servidoresBusca = computed(() => {
    const termo = this.normalizar(this.buscaServidor().trim());
    if (!termo) return this.servidores();
    return this.servidores().filter((s) =>
      this.normalizar(
        s.nome + " " + s.matricula + " " + (s.setor || ""),
      ).includes(termo),
    );
  });
  servidoresFiltrados = computed(() =>
    this.servidores().filter(
      (s) =>
        this.pertenceSecretaria(s) &&
        (!this.setor() || s.setor === this.setor()) &&
        this.normalizar(s.nome + " " + s.matricula).includes(
          this.normalizar(this.busca()),
        ),
    ),
  );
  base = computed(() =>
    this.agendamentos().filter(
      (a) =>
        (!this.secretaria() || a.secretariaId === Number(this.secretaria())) &&
        (!this.setor() || a.servidorSetor === this.setor()) &&
        this.normalizar(a.servidorNome + " " + a.servidorMatricula).includes(
          this.normalizar(this.busca()),
        ),
    ),
  );
  filtrados = computed(() =>
    this.base().filter(
      (a) =>
        (!this.status() || a.status === this.status()) &&
        (!this.mes() || this.interceptaMes(a, Number(this.mes()))),
    ),
  );
  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / 12)),
  );
  paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  visiveis = computed(() =>
    this.filtrados().slice(
      (this.paginaAtual() - 1) * 12,
      this.paginaAtual() * 12,
    ),
  );
  periodosFiltrados = computed(() =>
    this.periodos().filter(
      (p) =>
        (!this.secretaria() || p.secretariaId === Number(this.secretaria())) &&
        (!this.setor() || p.servidorSetor === this.setor()) &&
        this.normalizar(p.servidorNome + " " + p.servidorMatricula).includes(
          this.normalizar(this.busca()),
        ),
    ),
  );
  saldos = computed(() =>
    this.servidoresFiltrados().map((s) => {
      const periodos = this.periodos().filter((p) => p.servidorId === s.id);
      return {
        servidor: s,
        periodos,
        disponiveis: periodos.reduce((t, p) => t + p.diasRestantes, 0),
        reservados: periodos.reduce((t, p) => t + p.diasReservados, 0),
        gozados: periodos.reduce((t, p) => t + p.diasGozados, 0),
      };
    }),
  );
  emFerias = computed(
    () =>
      new Set(
        this.base()
          .filter(
            (a) =>
              a.tipoAfastamento === "FERIAS" &&
              a.status === "CONFIRMADO" &&
              a.dataInicio <= this.hoje &&
              a.dataFim >= this.hoje,
          )
          .map((a) => a.servidorId),
      ).size,
  );
  proximas = computed(
    () =>
      this.base().filter(
        (a) =>
          a.status === "CONFIRMADO" &&
          a.dataInicio > this.hoje &&
          a.dataInicio <= this.somarDias(this.hoje, 30),
      ).length,
  );
  vencendo = computed(
    () =>
      this.periodosFiltrados().filter(
        (p) =>
          p.diasRestantes > 0 &&
          p.limiteGozo &&
          p.limiteGozo <= this.somarDias(this.hoje, 90),
      ).length,
  );
  servidorSelecionado = computed(() => {
    const id = Number(this.formValor().servidorId);
    return this.servidores().find((s) => s.id === id) || null;
  });
  periodosFormulario = computed(() =>
    this.periodos()
      .filter((p) => p.servidorId === Number(this.formValor().servidorId))
      .sort(
        (a, b) =>
          (a.limiteGozo || "9999").localeCompare(b.limiteGozo || "9999") ||
          a.dataInicio.localeCompare(b.dataInicio),
      ),
  );
  totalSaldoServidor = computed(() =>
    this.periodosFormulario().reduce(
      (acc, p) => acc + (p.diasRestantes || 0),
      0,
    ),
  );
  periodoSelecionado = computed(() =>
    this.periodosFormulario().find(
      (p) => p.id === Number(this.formValor().periodoAquisitivoId),
    ),
  );

  selecionarTipoAfastamento(tipo: TipoAfastamento): void {
    this.form.patchValue({ tipoAfastamento: tipo });
    if (tipo !== "FERIAS") {
      this.form.patchValue({ periodoAquisitivoId: "", fracao: "" });
    }
  }

  selecionarPeriodo(id: number): void {
    this.form.patchValue({ periodoAquisitivoId: String(id) });
  }

  selecionarFracao(f: string): void {
    this.form.patchValue({ fracao: f });
  }

  selecionarStatus(status: StatusFerias): void {
    this.form.patchValue({ status });
  }

  aplicarDuracao(dias: number): void {
    const v = this.form.getRawValue();
    const inicio = v.dataInicio || this.hoje;
    const fim = this.somarDias(inicio, dias - 1);
    this.form.patchValue({ dataInicio: inicio, dataFim: fim });
  }

  abrirMenuServidores(): void {
    this.menuServidoresAberto.set(true);
  }

  fecharMenuServidores(): void {
    setTimeout(() => {
      this.menuServidoresAberto.set(false);
    }, 250);
  }

  selecionarServidor(s: Servant): void {
    this.form.patchValue({ servidorId: String(s.id) });
    this.buscaServidor.set("");
    this.menuServidoresAberto.set(false);
  }

  limparServidor(): void {
    this.form.patchValue({ servidorId: "", periodoAquisitivoId: "" });
    this.buscaServidor.set("");
    this.menuServidoresAberto.set(true);
  }
  dias = computed(() => {
    const v = this.formValor();
    return v.dataInicio && v.dataFim
      ? Math.max(
          0,
          Math.round(
            (Date.parse(v.dataFim) - Date.parse(v.dataInicio)) / 86400000,
          ) + 1,
        )
      : 0;
  });
  saldoDisponivel = computed(() => {
    const p = this.periodoSelecionado(),
      ag = this.edicao();
    return (
      (p?.diasRestantes || 0) +
      (p && ag?.periodoAquisitivoId === p.id && ag.status !== "CANCELADO"
        ? ag.dias
        : 0)
    );
  });
  escalaCompleta = computed(() =>
    montarEscala(this.ano(), this.base(), this.calendarioReferencia()),
  );
  escalaVisivel = computed(() =>
    this.escalaCompleta().filter(
      (m) => !this.mesEscala() || m.numero === Number(this.mesEscala()),
    ),
  );
  tituloEscala = computed(
    () =>
      this.secretarias().find((s) => s.id === Number(this.secretaria()))
        ?.nome || "Todas as secretarias",
  );
  legendasPeriodos = computed(() => {
    const itens = new Map<string, string>();
    for (const a of this.base())
      if (a.status !== "CANCELADO" && a.tipoAfastamento === "FERIAS")
        itens.set(
          a.periodoIdentificador || "Período não informado",
          corAgendamento(a),
        );
    return [...itens]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([label, cor]) => ({ label, cor }));
  });

  timelineMes = computed<MesTimelineInfo | null>(() => {
    const mesNum = this.mesNavegacao();
    const mesObj = this.escalaCompleta().find((m) => m.numero === mesNum);
    if (!mesObj) return null;
    const hojeDate = new Date();
    const ehMesAtual =
      this.ano() === hojeDate.getFullYear() &&
      mesNum === hojeDate.getMonth() + 1;
    return {
      numero: mesObj.numero,
      nome: mesObj.nome,
      totalDias: mesObj.totalDias,
      diasValidos: mesObj.dias.slice(0, mesObj.totalDias),
      diaHoje: ehMesAtual ? hojeDate.getDate() : null,
      linhas: mesObj.linhas,
    };
  });

  diasCalendario = computed<DiaCalendarioGrid[]>(() => {
    const ano = this.ano();
    const mes = this.mesNavegacao();
    const totalDias = new Date(ano, mes, 0).getDate();
    const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
    const hojeStr = this.hoje;
    const agendamentosAtivos = this.base().filter(
      (a) => a.status !== "CANCELADO",
    );
    const refMes = this.calendarioReferencia()?.meses.find(
      (m) => m.mesNumero === mes,
    );

    const celulas: DiaCalendarioGrid[] = [];

    if (primeiroDiaSemana > 0) {
      const diasMesAnterior = new Date(ano, mes - 1, 0).getDate();
      const mesAntNum = mes === 1 ? 12 : mes - 1;
      const anoAntNum = mes === 1 ? ano - 1 : ano;
      for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
        const diaNum = diasMesAnterior - i;
        const dataStr = `${anoAntNum}-${String(mesAntNum).padStart(2, "0")}-${String(diaNum).padStart(2, "0")}`;
        const diaSemana = new Date(anoAntNum, mesAntNum - 1, diaNum).getDay();
        const eventos = agendamentosAtivos.filter(
          (a) => a.dataInicio <= dataStr && a.dataFim >= dataStr,
        );
        celulas.push({
          data: dataStr,
          diaNumero: diaNum,
          mesAtual: false,
          ehHoje: dataStr === hojeStr,
          ehFimDeSemana: diaSemana === 0 || diaSemana === 6,
          ehFeriado: false,
          eventos,
        });
      }
    }

    for (let d = 1; d <= totalDias; d++) {
      const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const diaSemana = new Date(ano, mes - 1, d).getDay();
      const diaRef = refMes?.dias[d - 1];
      const eventos = agendamentosAtivos.filter(
        (a) => a.dataInicio <= dataStr && a.dataFim >= dataStr,
      );
      celulas.push({
        data: dataStr,
        diaNumero: d,
        mesAtual: true,
        ehHoje: dataStr === hojeStr,
        ehFimDeSemana: diaSemana === 0 || diaSemana === 6,
        ehFeriado: diaRef?.ehFeriado ?? false,
        nomeFeriado: diaRef?.nomeFeriado,
        eventos,
      });
    }

    const resto = celulas.length % 7;
    if (resto > 0) {
      const faltam = 7 - resto;
      const mesProxNum = mes === 12 ? 1 : mes + 1;
      const anoProxNum = mes === 12 ? ano + 1 : ano;
      for (let d = 1; d <= faltam; d++) {
        const dataStr = `${anoProxNum}-${String(mesProxNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const diaSemana = new Date(anoProxNum, mesProxNum - 1, d).getDay();
        const eventos = agendamentosAtivos.filter(
          (a) => a.dataInicio <= dataStr && a.dataFim >= dataStr,
        );
        celulas.push({
          data: dataStr,
          diaNumero: d,
          mesAtual: false,
          ehHoje: dataStr === hojeStr,
          ehFimDeSemana: diaSemana === 0 || diaSemana === 6,
          ehFeriado: false,
          eventos,
        });
      }
    }

    return celulas;
  });

  mesAnterior(): void {
    if (this.mesNavegacao() === 1) {
      this.mudarAno(this.ano() - 1);
      this.mesNavegacao.set(12);
    } else {
      this.mesNavegacao.update((m) => m - 1);
    }
  }

  proximoMes(): void {
    if (this.mesNavegacao() === 12) {
      this.mudarAno(this.ano() + 1);
      this.mesNavegacao.set(1);
    } else {
      this.mesNavegacao.update((m) => m + 1);
    }
  }

  selecionarMes(m: number): void {
    this.mesNavegacao.set(m);
  }

  irParaHoje(): void {
    const hoje = new Date();
    const anoHoje = hoje.getFullYear();
    if (this.ano() !== anoHoje) {
      this.mudarAno(anoHoje);
    }
    this.mesNavegacao.set(hoje.getMonth() + 1);
  }

  agendarNoDia(data: string, servidorId?: number): void {
    this.abrir(null, servidorId);
    this.form.patchValue({ dataInicio: data, dataFim: data });
  }

  calcPercent(val: number, total: number): number {
    return total > 0 ? Math.min(100, Math.round((val / total) * 100)) : 0;
  }

  agendarNoMes(mes: number, servidorId?: number, dia = 1): void {
    this.abrir(null, servidorId);
    const data = `${this.ano()}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    this.form.patchValue({ dataInicio: data, dataFim: data });
  }
  descricaoFaixa(a: AgendamentoFerias): string {
    const data = (v: string) => v.split("-").reverse().join("/");
    return `${a.servidorNome} · ${this.tipos[a.tipoAfastamento]} · ${data(a.dataInicio)} a ${data(a.dataFim)} · ${a.dias} dias · ${a.periodoIdentificador || "Sem período aquisitivo"} · ${this.situacoes[a.status]}${a.alertaConflito ? " · Sobreposição na escala" : ""}. Clique para ver detalhes.`;
  }

  ngOnInit(): void {
    this.recarregar
      .pipe(
        tap(() => {
          this.carregando.set(true);
          this.erro.set(false);
        }),
        switchMap(() =>
          forkJoin({
            agendamentos: this.api.listarAgendamentos(this.ano()),
            periodos: this.api.listarPeriodos(),
            servidores: this.servidorService.getAll(),
            secretarias: this.secretariaService.getAll(),
            calendario: this.api.getEscalaAnual(this.ano()),
          }).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((d) => {
        this.carregando.set(false);
        if (!d) {
          this.erro.set(true);
          return;
        }
        this.agendamentos.set(d.agendamentos);
        this.periodos.set(d.periodos);
        this.servidores.set(d.servidores);
        this.secretarias.set(d.secretarias);
        this.calendarioReferencia.set(d.calendario);
      });
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formValor.set(this.form.getRawValue());
        this.erroForm.set("");
      });
    this.form.controls.servidorId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.form.patchValue({ periodoAquisitivoId: "" }, { emitEvent: false });
        const sugerido = this.periodos()
          .filter((p) => p.servidorId === Number(id) && p.diasRestantes > 0)
          .sort(
            (a, b) =>
              (a.limiteGozo || "9999").localeCompare(b.limiteGozo || "9999") ||
              a.dataInicio.localeCompare(b.dataInicio),
          )[0];
        if (sugerido)
          this.form.patchValue(
            { periodoAquisitivoId: String(sugerido.id) },
            { emitEvent: false },
          );
        this.invalidarConflito();
      });
    for (const campo of ["dataInicio", "dataFim", "tipoAfastamento"] as const)
      this.form.controls[campo].valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.invalidarConflito());
    this.verificar
      .pipe(
        switchMap(() =>
          timer(250).pipe(
            switchMap(() => {
              const v = this.form.getRawValue();
              if (
                !this.painel() ||
                !v.servidorId ||
                !v.dataInicio ||
                !v.dataFim ||
                v.dataFim < v.dataInicio
              )
                return of(null);
              this.verificando.set(true);
              return this.api
                .verificarConflito({
                  servidorId: Number(v.servidorId),
                  dataInicio: v.dataInicio,
                  dataFim: v.dataFim,
                  agendamentoId: this.edicao()?.id,
                })
                .pipe(
                  catchError(() => {
                    this.falhaConflito.set(true);
                    return of(null);
                  }),
                );
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((c) => {
        this.conflito.set(c);
        this.verificando.set(false);
      });
    this.carregar();
  }
  carregar(): void {
    this.recarregar.next();
  }
  mudarAno(v: number): void {
    this.ano.set(Number(v));
    this.pagina.set(1);
    this.carregar();
  }
  mudarSecretaria(v: number | null): void {
    this.secretaria.set(v ? Number(v) : null);
    this.setor.set("");
    this.pagina.set(1);
  }
  limparFiltros(): void {
    this.busca.set("");
    this.secretaria.set(null);
    this.setor.set("");
    this.mes.set(0);
    this.status.set("");
    this.mesEscala.set(0);
    this.periodoDestaque.set("");
    this.pagina.set(1);
  }
  private pertenceSecretaria(s: Servant): boolean {
    const sec = this.secretarias().find(
      (x) => x.id === Number(this.secretaria()),
    );
    return (
      !sec ||
      s.secretariaId === sec.id ||
      s.secretariaNome === sec.nome ||
      s.secretaria === sec.nome ||
      s.secretaria === sec.sigla
    );
  }
  private normalizar(v: string): string {
    return v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }
  private dataLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  private somarDias(data: string, dias: number): string {
    const d = new Date(data + "T12:00:00");
    d.setDate(d.getDate() + dias);
    return this.dataLocal(d);
  }
  private interceptaMes(a: AgendamentoFerias, mes: number): boolean {
    const ini = `${this.ano()}-${String(mes).padStart(2, "0")}-01`;
    const fim = `${this.ano()}-${String(mes).padStart(2, "0")}-${new Date(this.ano(), mes, 0).getDate()}`;
    return a.dataInicio <= fim && a.dataFim >= ini;
  }
  prazo(p: PeriodoAquisitivo): string {
    if (!p.limiteGozo || !p.diasRestantes) return "";
    return p.limiteGozo < this.hoje
      ? "Prazo vencido"
      : p.limiteGozo <= this.somarDias(this.hoje, 90)
        ? "Vence em breve"
        : "";
  }
  iniciais(nome: string): string {
    return nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("");
  }
  abrir(ag: AgendamentoFerias | null = null, servidorId?: number): void {
    this.ultimoFoco = document.activeElement as HTMLElement;
    this.edicao.set(ag);
    this.painel.set(true);
    this.cadastroPeriodo.set(false);
    this.buscaServidor.set("");
    this.erroForm.set("");
    this.form.reset(
      {
        servidorId: String(ag?.servidorId || servidorId || ""),
        tipoAfastamento: ag?.tipoAfastamento || "FERIAS",
        periodoAquisitivoId: String(ag?.periodoAquisitivoId || ""),
        fracao: String(ag?.fracao || ""),
        dataInicio: ag?.dataInicio || "",
        dataFim: ag?.dataFim || "",
        status: ag?.status || "PLANEJADO",
        observacao: ag?.observacao || "",
        confirmarComConflito: false,
      },
      { emitEvent: false },
    );
    if (!ag && servidorId) {
      const p = this.periodos()
        .filter((p) => p.servidorId === servidorId && p.diasRestantes > 0)
        .sort((a, b) =>
          (a.limiteGozo || "9999").localeCompare(b.limiteGozo || "9999"),
        )[0];
      if (p)
        this.form.patchValue(
          { periodoAquisitivoId: String(p.id) },
          { emitEvent: false },
        );
    }
    this.form.controls.servidorId[ag ? "disable" : "enable"]({
      emitEvent: false,
    });
    this.formValor.set(this.form.getRawValue());
    this.invalidarConflito();
    this.focarPainel();
  }
  fechar(): void {
    if (this.salvando() || this.salvandoPeriodo()) return;
    this.painel.set(false);
    this.cadastroPeriodo.set(false);
    this.verificar.next();
    this.restaurarFoco();
  }
  invalidarConflito(): void {
    this.form.patchValue({ confirmarComConflito: false }, { emitEvent: false });
    this.conflito.set(null);
    this.falhaConflito.set(false);
    this.verificando.set(
      this.painel() &&
        !!this.form.getRawValue().servidorId &&
        !!this.form.getRawValue().dataInicio &&
        !!this.form.getRawValue().dataFim,
    );
    this.formValor.set(this.form.getRawValue());
    this.verificar.next();
  }
  salvar(): void {
    if (this.salvando()) return;
    const v = this.form.getRawValue();
    this.form.markAllAsTouched();
    if (this.form.invalid || this.dias() < 1) {
      this.erroForm.set(
        "Selecione o servidor e informe um intervalo de datas válido.",
      );
      return;
    }
    if (
      v.tipoAfastamento === "FERIAS" &&
      (!this.periodoSelecionado() ||
        this.dias() > 30 ||
        this.dias() > this.saldoDisponivel())
    ) {
      this.erroForm.set(
        "Confira o período aquisitivo: férias devem ter até 30 dias e caber no saldo disponível.",
      );
      return;
    }
    if (this.verificando() || this.falhaConflito()) {
      this.erroForm.set(
        "Aguarde ou tente novamente a verificação de conflitos.",
      );
      return;
    }
    if (this.conflito()?.bloqueante) {
      this.erroForm.set(
        "O servidor já tem um afastamento nesse intervalo. Escolha outras datas.",
      );
      return;
    }
    if (this.conflito()?.temConflito && !v.confirmarComConflito) {
      this.erroForm.set("Revise o alerta de cobertura e confirme sua ciência.");
      return;
    }
    const dto: AgendamentoFeriasDTO = {
      servidorId: Number(v.servidorId),
      tipoAfastamento: v.tipoAfastamento as TipoAfastamento,
      periodoAquisitivoId:
        v.tipoAfastamento === "FERIAS" ? Number(v.periodoAquisitivoId) : null,
      dataInicio: v.dataInicio!,
      dataFim: v.dataFim!,
      status: v.status as StatusFerias,
      observacao: v.observacao || "",
      confirmarComConflito: !!v.confirmarComConflito,
      fracao:
        v.tipoAfastamento === "FERIAS" && v.fracao ? Number(v.fracao) : null,
    };
    this.salvando.set(true);
    (this.edicao()
      ? this.api.atualizarAgendamento(this.edicao()!.id, dto)
      : this.api.criarAgendamento(dto)
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.fechar();
          this.toast.success("Agendamento salvo.");
          this.carregar();
        },
        error: (e) => {
          this.salvando.set(false);
          this.erroForm.set(
            e.error?.message || "Não foi possível salvar. Tente novamente.",
          );
          this.invalidarConflito();
        },
      });
  }
  pedirCancelamento(ag: AgendamentoFerias): void {
    this.ultimoFoco = document.activeElement as HTMLElement;
    this.cancelamento.set(ag);
    this.focarPainel();
  }
  cancelar(): void {
    const ag = this.cancelamento();
    if (!ag || this.cancelando()) return;
    this.cancelando.set(true);
    this.api
      .cancelarAgendamento(ag.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelando.set(false);
          this.cancelamento.set(null);
          this.restaurarFoco();
          this.toast.success("Agendamento cancelado. O saldo foi devolvido.");
          this.carregar();
        },
        error: (e) => {
          this.cancelando.set(false);
          this.toast.error(e.error?.message || "Não foi possível cancelar.");
        },
      });
  }
  abrirPeriodo(servidorId?: number): void {
    if (!this.painel()) this.ultimoFoco = document.activeElement as HTMLElement;
    this.periodoServidor.set(
      servidorId || Number(this.formValor().servidorId) || null,
    );
    this.erroPeriodo.set("");
    this.formPeriodo.reset({
      servidorId: String(this.periodoServidor() || ""),
      dataInicio: "",
      dataFim: "",
      limiteGozo: "",
      totalDias: 30,
    });
    this.cadastroPeriodo.set(true);
    this.focarPainel();
  }
  fecharPeriodo(): void {
    if (this.salvandoPeriodo()) return;
    this.cadastroPeriodo.set(false);
    if (this.painel()) this.focarPainel();
    else this.restaurarFoco();
  }
  salvarPeriodo(): void {
    if (this.salvandoPeriodo()) return;
    const v = this.formPeriodo.getRawValue();
    this.formPeriodo.markAllAsTouched();
    if (
      this.formPeriodo.invalid ||
      v.dataFim! < v.dataInicio! ||
      (v.limiteGozo && v.limiteGozo < v.dataFim!)
    ) {
      this.erroPeriodo.set(
        "Preencha o servidor, as datas em ordem e o total entre 1 e 60 dias.",
      );
      return;
    }
    this.salvandoPeriodo.set(true);
    this.api
      .criarPeriodo({
        servidorId: Number(v.servidorId),
        anoInicio: Number(v.dataInicio!.slice(0, 4)),
        anoFim: Number(v.dataFim!.slice(0, 4)),
        dataInicio: v.dataInicio!,
        dataFim: v.dataFim!,
        limiteGozo: v.limiteGozo || undefined,
        totalDias: v.totalDias!,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.periodos.update((ps) => [...ps, p]);
          if (
            this.painel() &&
            Number(this.formValor().servidorId) === p.servidorId
          )
            this.form.patchValue({ periodoAquisitivoId: String(p.id) });
          this.salvandoPeriodo.set(false);
          this.fecharPeriodo();
          this.toast.success("Período cadastrado.");
        },
        error: (e) => {
          this.salvandoPeriodo.set(false);
          this.erroPeriodo.set(
            e.error?.message || "Não foi possível cadastrar o período.",
          );
        },
      });
  }
  imprimir(): void {
    window.print();
  }
  private focarPainel(): void {
    afterNextRender(
      () =>
        document
          .querySelector<HTMLElement>(
            '[role="dialog"] button:not([disabled]), [role="dialog"] input:not([disabled])',
          )
          ?.focus(),
      { injector: this.injector },
    );
  }
  private restaurarFoco(): void {
    afterNextRender(() => this.ultimoFoco?.focus(), {
      injector: this.injector,
    });
  }
  @HostListener("document:keydown", ["$event"]) teclado(
    e: KeyboardEvent,
  ): void {
    if (!this.painel() && !this.cadastroPeriodo() && !this.cancelamento())
      return;
    if (e.key === "Escape") {
      if (this.cancelamento() && !this.cancelando()) {
        this.cancelamento.set(null);
        this.restaurarFoco();
      } else if (this.cadastroPeriodo()) this.fecharPeriodo();
      else this.fechar();
    }
    if (e.key === "Tab") {
      const dialog = document.querySelector('[role="dialog"]');
      const els = Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        ) || [],
      );
      const first = els[0],
        last = els[els.length - 1];
      if (!dialog?.contains(document.activeElement)) {
        e.preventDefault();
        first?.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
}
