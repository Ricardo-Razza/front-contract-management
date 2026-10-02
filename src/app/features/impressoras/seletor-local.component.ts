import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { LocalInstalacao } from '@core/models';
import { matchesSearch } from '@core/utils';

@Component({
  selector: 'app-seletor-local',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="custom-multiselect">
      <button #trigger type="button" class="multiselect-trigger" [class.open]="aberto()"
              [attr.aria-expanded]="aberto()" [attr.aria-controls]="id + '-opcoes'" aria-haspopup="true"
              aria-label="Selecionar local de instalação" (click)="alternar()">
        <span class="trigger-text" [class.placeholder]="!selecionado()">
          {{ selecionado() ? selecionado()!.nome + ' — ' + (selecionado()!.secretariaSigla || '') : 'Selecione um local cadastrado...' }}
        </span>
        <svg class="trigger-arrow" [class.open]="aberto()" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      @if (aberto()) {
        <div class="multiselect-popover">
          <input #buscaInput type="search" class="multiselect-search" placeholder="Buscar local por nome ou endereço..."
                 aria-label="Buscar local" [value]="busca()" (input)="busca.set($any($event.target).value)"
                 (keydown.arrowdown)="focarOpcao($event)" />
          <div class="multiselect-list" [id]="id + '-opcoes'" role="group" aria-label="Locais cadastrados">
            @for (local of filtrados(); track local.id) {
              <button type="button" class="multiselect-item" [class.selected]="local.id === +valor"
                      [attr.aria-pressed]="local.id === +valor" (click)="selecionar(local)" (keydown)="navegar($event)">
                <span class="item-sigla">{{ local.secretariaSigla }}</span>
                <span class="item-nome">{{ local.nome }} @if (local.endereco) { <small>{{ local.endereco }}</small> }</span>
                @if (local.id === +valor) { <span aria-hidden="true">✓</span> }
              </button>
            } @empty {
              <p class="empty-local" role="status">{{ locais.length ? 'Nenhum local encontrado para esta busca.' : 'Nenhum local cadastrado para esta secretaria.' }}</p>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .custom-multiselect .multiselect-popover { position: relative; top: auto; margin-top: 4px; min-width: 0; box-sizing: border-box; }
    .multiselect-search { box-sizing: border-box; width: 100%; }
    .multiselect-item { width: 100%; border: 0; background: transparent; text-align: left; font-family: inherit; flex-shrink: 0; }
    .custom-multiselect .multiselect-popover .multiselect-list .multiselect-item .item-nome { white-space: normal; flex: 1; }
    small { display: block; color: #64748b; margin-top: 2px; }
    .empty-local { padding: .75rem; font-size: .8125rem; color: #64748b; margin: 0; }
    button:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }
  `]
})
export class SeletorLocalComponent implements OnChanges {
  @Input({ required: true }) id = '';
  @Input() locais: LocalInstalacao[] = [];
  @Input() valor: number | string = '';
  @Output() valorChange = new EventEmitter<number>();
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('buscaInput') set campoBusca(campo: ElementRef<HTMLInputElement> | undefined) {
    campo?.nativeElement.focus();
  }
  private element = inject<ElementRef<HTMLElement>>(ElementRef);

  aberto = signal(false);
  busca = signal('');
  locaisSignal = signal<LocalInstalacao[]>([]);
  valorSignal = signal<number | string>('');

  selecionado = computed(() => {
    const v = Number(this.valorSignal());
    return this.locaisSignal().find(l => l.id === v);
  });

  filtrados = computed(() => {
    const termo = this.busca();
    return this.locaisSignal().filter(l => matchesSearch([l.nome, l.endereco, l.secretariaNome, l.secretariaSigla], termo));
  });

  constructor() {
    const document = inject(DOCUMENT);
    const listener = (event: MouseEvent) => this.cliqueFora(event);
    document.addEventListener('click', listener, true);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('click', listener, true));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['locais']) {
      this.locaisSignal.set(this.locais || []);
      this.aberto.set(false);
      this.busca.set('');
    }
    if (changes['valor']) {
      this.valorSignal.set(this.valor);
    }
  }

  alternar(): void { this.busca.set(''); this.aberto.update(v => !v); }
  selecionar(local: LocalInstalacao): void {
    this.valorChange.emit(local.id);
    this.aberto.set(false);
    this.trigger?.nativeElement.focus();
  }
  cliqueFora(event: MouseEvent): void {
    if (this.aberto() && event.target instanceof Node && !this.element.nativeElement.contains(event.target)) {
      this.aberto.set(false);
    }
  }
  @HostListener('keydown.escape', ['$event'])
  fechar(event: Event): void {
    if (this.aberto()) { event.stopPropagation(); this.aberto.set(false); this.trigger?.nativeElement.focus(); }
  }
  @HostListener('focusout', ['$event'])
  sair(event: FocusEvent): void {
    if (this.aberto() && event.relatedTarget instanceof Node && !this.element.nativeElement.contains(event.relatedTarget)) {
      this.aberto.set(false);
    }
  }
  focarOpcao(event: Event): void {
    event.preventDefault(); this.element.nativeElement.querySelector<HTMLButtonElement>('.multiselect-item')?.focus();
  }
  navegar(event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const opcoes = Array.from(this.element.nativeElement.querySelectorAll<HTMLButtonElement>('.multiselect-item'));
    const atual = opcoes.indexOf(event.target as HTMLButtonElement);
    opcoes[(atual + (event.key === 'ArrowDown' ? 1 : -1) + opcoes.length) % opcoes.length]?.focus();
  }
}
