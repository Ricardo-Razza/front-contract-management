import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DocumentoAnexo } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class AnexoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/anexos`;

  listarPorContrato(contratoId: number): Observable<DocumentoAnexo[]> {
    return this.http.get<DocumentoAnexo[]>(`${this.apiUrl}/contrato/${contratoId}`);
  }

  listarPorAta(ataId: number): Observable<DocumentoAnexo[]> {
    return this.http.get<DocumentoAnexo[]>(`${this.apiUrl}/ata/${ataId}`);
  }

  upload(file: File, tipoDocumento: string, descricao?: string, contratoId?: number, ataId?: number): Observable<DocumentoAnexo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipoDocumento', tipoDocumento);
    if (descricao) formData.append('descricao', descricao);
    if (contratoId) formData.append('contratoId', contratoId.toString());
    if (ataId) formData.append('ataId', ataId.toString());

    return this.http.post<DocumentoAnexo>(`${this.apiUrl}/upload`, formData);
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getUrlDownload(id: number): string {
    return `${this.apiUrl}/${id}/download`;
  }

  getUrlVisualizar(id: number): string {
    return `${this.apiUrl}/${id}/visualizar`;
  }
}
