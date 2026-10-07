import { Component, Input, OnChanges, DestroyRef, inject, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed as untilComponentDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AnexoService, ToastService } from '@core/services';
import { DocumentoAnexo, TIPOS_DOCUMENTO_LABELS } from '@core/models';
import { BodyPortalDirective } from '@shared/directives/body-portal.directive';

@Component({selector:'app-anexo-manager',standalone:true,imports:[CommonModule,FormsModule,BodyPortalDirective],templateUrl:'./anexo-manager.component.html',styleUrl:'./anexo-manager.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class AnexoManagerComponent implements OnChanges {
  @Input({required:true}) entityId!: number;
  @Input({required:true}) kind!: 'CONTRATO' | 'ATA';
  private readonly requestDestroyRef = inject(DestroyRef);
  private readonly anexoService = inject(AnexoService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  ngOnChanges(): void { this.carregarAnexos(this.entityId); }
  selectedDocument(): {id:number} { return {id:this.entityId}; }
  hasOpenDialog(): boolean { return this.isPreviewModalOpen() || this.isUploadModalOpen(); }
  closeDialogs(): void { this.fecharPreviewModal(); this.fecharModalUploadAnexo(); }
  closeTopDialog(): void { if(this.isPreviewModalOpen()) this.fecharPreviewModal(); else this.fecharModalUploadAnexo(); }
  anexos = signal<DocumentoAnexo[]>([]);

  loadingAnexos = signal<boolean>(false);

  isUploadModalOpen = signal<boolean>(false);

  uploadingAnexo = signal<boolean>(false);

  uploadTipo = signal<string>('CONTRATO_INTEGRA');

  uploadDescricao = signal<string>('');

  selectedFile = signal<File | null>(null);

  tiposDocumento = TIPOS_DOCUMENTO_LABELS;

  readonly tiposDocumentoKeys = Object.keys(TIPOS_DOCUMENTO_LABELS);

  previewAnexo = signal<DocumentoAnexo | null>(null);

  previewUrl = signal<SafeResourceUrl | null>(null);

  isPreviewModalOpen = signal<boolean>(false);

  carregarAnexos(contratoId: number): void {
    this.loadingAnexos.set(true);
    (this.kind === 'CONTRATO' ? this.anexoService.listarPorContrato(contratoId) : this.anexoService.listarPorAta(contratoId)).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: (anexos) => {
        this.anexos.set(anexos || []);
        this.loadingAnexos.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar anexos do contrato:', err);
        this.loadingAnexos.set(false);
      }
    });
  }

  abrirModalUploadAnexo(): void {
    this.selectedFile.set(null);
    this.uploadTipo.set('CONTRATO_INTEGRA');
    this.uploadDescricao.set('');
    this.isUploadModalOpen.set(true);
  }

  fecharModalUploadAnexo(): void {
    this.isUploadModalOpen.set(false);
    this.selectedFile.set(null);
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  enviarAnexo(): void {
    const file = this.selectedFile();
    const contrato = this.selectedDocument();
    if (!file || !contrato) return;

    this.uploadingAnexo.set(true);
    this.anexoService.upload(file, this.uploadTipo(), this.uploadDescricao(), this.kind === 'CONTRATO' ? contrato.id : undefined, this.kind === 'ATA' ? contrato.id : undefined).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
      next: () => {
        this.toast.success('Documento anexado com sucesso!');
        this.uploadingAnexo.set(false);
        this.fecharModalUploadAnexo();
        this.carregarAnexos(contrato.id);
      },
      error: (err) => {
        console.error('Erro ao fazer upload do anexo:', err);

        this.uploadingAnexo.set(false);
      }
    });
  }

  downloadAnexo(anexo?: DocumentoAnexo | null): void {
    if (!anexo) return;
    const url = this.anexoService.getUrlDownload(anexo.id);
    window.open(url, '_blank');
  }

  visualizarAnexo(anexo: DocumentoAnexo): void {
    this.previewAnexo.set(anexo);
    const rawUrl = this.anexoService.getUrlVisualizar(anexo.id);
    this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl));
    this.isPreviewModalOpen.set(true);
  }

  fecharPreviewModal(): void {
    this.isPreviewModalOpen.set(false);
    this.previewAnexo.set(null);
    this.previewUrl.set(null);
  }

  abrirAnexoNovaAba(anexo?: DocumentoAnexo | null): void {
    if (!anexo) return;
    const url = this.anexoService.getUrlVisualizar(anexo.id);
    window.open(url, '_blank');
  }

  isArquivoVisualizavel(anexo?: DocumentoAnexo | null): boolean {
    if (!anexo) return false;
    const nome = (anexo.nomeOriginal || '').toLowerCase();
    const type = (anexo.contentType || '').toLowerCase();
    return (
      nome.endsWith('.pdf') ||
      nome.endsWith('.png') ||
      nome.endsWith('.jpg') ||
      nome.endsWith('.jpeg') ||
      type.includes('pdf') ||
      type.includes('image')
    );
  }

  excluirAnexo(anexo: DocumentoAnexo): void {
    if (confirm(`Tem certeza que deseja excluir o anexo "${anexo.nomeOriginal}"?`)) {
      this.anexoService.deletar(anexo.id).pipe(untilComponentDestroyed(this.requestDestroyRef)).subscribe({
        next: () => {
          this.toast.success('Anexo excluído com sucesso!');
          const contrato = this.selectedDocument();
          if (contrato) {
            this.carregarAnexos(contrato.id);
          }
        },
        error: (err) => {
          console.error('Erro ao excluir anexo:', err);

        }
      });
    }
  }

  formatarTamanho(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getTipoDocumentoLabel(tipo: string): string {
    return this.tiposDocumento[tipo] || tipo;
  }
}
