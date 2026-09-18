export interface PrintItemData {
  tipoDocumento: 'Contrato' | 'Ata de Registro de Preços';
  numero: string | number;
  ano: string | number;
  tipo?: string;
  situacao?: string;
  objeto: string;
  nomeContratado?: string;
  dataInicio?: string;
  dataFim?: string;
  portariaDesignacao?: string;
  dataDesignacao?: string;
  observacao?: string;
  secretarias?: { sigla?: string; nome?: string }[];
  equipe?: {
    funcao?: string;
    funcaoNome?: string;
    servidor?: string;
    servidorNome?: string;
    servidorCargo?: string;
  }[];
}

/**
 * Abre janela de impressão com ficha limpa formatada para folha A4 oficial.
 */
export function printFichaDocumento(data: PrintItemData): void {
  const printWindow = window.open('', '_blank', 'width=840,height=900');
  if (!printWindow) return;

  const formatDate = (d?: string) => {
    if (!d) return '-';
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-BR');
  };

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Ficha Cadastral - ${data.tipoDocumento} ${data.numero}/${data.ano}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 30px;
          color: #1e293b;
          line-height: 1.5;
          font-size: 13px;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          color: #0f172a;
          font-weight: 700;
        }
        .header .meta {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 11px;
          background: #e2e8f0;
          color: #334155;
          margin-left: 6px;
        }
        .section {
          margin-bottom: 18px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .field-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .field-value {
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
        }
        .highlight-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          white-space: pre-wrap;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          text-align: left;
          font-size: 12px;
        }
        th {
          background: #f1f5f9;
          font-weight: 600;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          @page { size: A4; margin: 1.5cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="meta">Sistema de Gestão de Contratos e Atas de Registro de Preços</div>
          <h1>${data.tipoDocumento} Nº ${data.numero}/${data.ano}</h1>
        </div>
        <div>
          <span class="badge">${data.situacao || 'ATIVO'}</span>
          <span class="badge">${data.tipo || 'PRODUTO'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Identificação Geral</div>
        <div class="grid">
          <div>
            <div class="field-label">Número / Ano</div>
            <div class="field-value">${data.numero}/${data.ano}</div>
          </div>
          ${data.nomeContratado ? `
          <div>
            <div class="field-label">Contratado</div>
            <div class="field-value">${data.nomeContratado}</div>
          </div>` : ''}
          <div>
            <div class="field-label">Data de Início da Vigência</div>
            <div class="field-value">${formatDate(data.dataInicio)}</div>
          </div>
          <div>
            <div class="field-label">Data de Término da Vigência</div>
            <div class="field-value">${formatDate(data.dataFim)}</div>
          </div>
          <div>
            <div class="field-label">Portaria de Designação</div>
            <div class="field-value">${data.portariaDesignacao || '-'}</div>
          </div>
          <div>
            <div class="field-label">Data da Portaria</div>
            <div class="field-value">${formatDate(data.dataDesignacao)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. Objeto</div>
        <div class="highlight-box">${data.objeto || '-'}</div>
      </div>

      ${data.secretarias && data.secretarias.length > 0 ? `
      <div class="section">
        <div class="section-title">3. Secretarias Participantes</div>
        <div>${data.secretarias.map(s => s.sigla ? `<strong>${s.sigla}</strong> - ${s.nome}` : s.nome).join('; ')}</div>
      </div>` : ''}

      ${data.equipe && data.equipe.length > 0 ? `
      <div class="section">
        <div class="section-title">4. Equipe de Gestão e Fiscalização</div>
        <table>
          <thead>
            <tr>
              <th>Função</th>
              <th>Servidor</th>
              <th>Cargo</th>
            </tr>
          </thead>
          <tbody>
            ${data.equipe.map(e => `
              <tr>
                <td><strong>${e.funcaoNome || e.funcao || '-'}</strong></td>
                <td>${e.servidorNome || e.servidor || '-'}</td>
                <td>${e.servidorCargo || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${data.observacao ? `
      <div class="section">
        <div class="section-title">5. Observações Administrativas</div>
        <div class="highlight-box">${data.observacao}</div>
      </div>` : ''}

      <div style="margin-top: 35px; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
        <span>Documento gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
        <span>ARP System • Controle Municipal</span>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
