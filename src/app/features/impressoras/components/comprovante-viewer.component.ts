import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { ImpressorasComponent } from '../impressoras.component';

export type ComprovanteViewerComponentContext = Pick<ImpressorasComponent, 'fecharModalPrint' | 'printSelecionado' | 'zoomOutPrint' | 'printZoomLevel' | 'printFitMode' | 'toggleFitMode' | 'zoomInPrint' | 'rotatePrint' | 'downloadPrintImage' | 'getUrlImagemColeta' | 'onPrintWheel' | 'printRotation' | 'onPrintImageLoaded' | 'printImgDimensions'>;

@Component({selector: 'app-comprovante-viewer', standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule], templateUrl: './comprovante-viewer.component.html', styleUrl: './comprovante-viewer.component.scss', changeDetection: ChangeDetectionStrategy.OnPush})
export class ComprovanteViewerComponent { @Input({required: true}) context!: ComprovanteViewerComponentContext; }
