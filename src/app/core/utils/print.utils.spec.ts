import { escapeHtml, buildFichaHtml, PrintItemData } from './print.utils';

describe('print.utils', () => {
  describe('escapeHtml', () => {
    it('escapa caracteres perigosos HTML: <, >, &, ", \'', () => {
      expect(escapeHtml('<script>alert("xss & fun")</script>\'')).toBe(
        '&lt;script&gt;alert(&quot;xss &amp; fun&quot;)&lt;/script&gt;&#39;'
      );
    });

    it('trata valores nulos, indefinidos e números com segurança', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(12345)).toBe('12345');
    });
  });

  describe('buildFichaHtml', () => {
    it('neutraliza injeções XSS em campos de usuário', () => {
      const maliciousData: PrintItemData = {
        tipoDocumento: 'Contrato',
        numero: '<script>1</script>',
        ano: 2026,
        objeto: '<img src=x onerror=alert(1)>',
        nomeContratado: 'Empresa <XSS> & Cia',
        observacao: '<b>negrito injetado</b>',
        secretarias: [{ sigla: '<sec>', nome: 'Secretaria <script>' }],
        equipe: [
          {
            funcao: 'Fiscal <1>',
            servidor: 'João <alert>',
            servidorCargo: 'Analista <script>'
          }
        ]
      };

      const html = buildFichaHtml(maliciousData);

      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).not.toContain('<script>1</script>');
      expect(html).toContain('&lt;script&gt;1&lt;/script&gt;');
      expect(html).toContain('Empresa &lt;XSS&gt; &amp; Cia');
      expect(html).toContain('&lt;b&gt;negrito injetado&lt;/b&gt;');
      expect(html).toContain('&lt;sec&gt;');
      expect(html).toContain('Secretaria &lt;script&gt;');
      expect(html).toContain('Fiscal &lt;1&gt;');
      expect(html).toContain('João &lt;alert&gt;');
    });

    it('monta ficha de contrato normal corretamente com valores esperados', () => {
      const normalData: PrintItemData = {
        tipoDocumento: 'Contrato',
        numero: '10',
        ano: '2026',
        objeto: 'Prestação de serviços de TI',
        nomeContratado: 'Empresa Alfa Ltda',
        situacao: 'ATIVO',
        tipo: 'SERVIÇO'
      };

      const html = buildFichaHtml(normalData);

      expect(html).toContain('Contrato Nº 10/2026');
      expect(html).toContain('Prestação de serviços de TI');
      expect(html).toContain('Empresa Alfa Ltda');
      expect(html).toContain('ATIVO');
      expect(html).toContain('SERVIÇO');
    });
  });
});
