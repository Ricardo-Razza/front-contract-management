/**
 * Normaliza um texto removendo acentos, diacríticos e convertendo para minúsculo.
 * Exemplo: "João da Silva" -> "joao da silva", "Aquisição" -> "aquisicao"
 */
export function normalizeText(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Verifica se o texto alvo contém o termo de busca, ignorando caixa alta/baixa e acentos.
 */
export function includesNormalized(
  target: string | number | null | undefined,
  search: string | number | null | undefined
): boolean {
  if (!search) return true;
  if (!target) return false;
  return normalizeText(target).includes(normalizeText(search));
}

/**
 * Realiza busca inteligente multi-termo (tokenizada).
 * Garante que todas as palavras digitadas na busca estejam presentes no alvo (em qualquer ordem).
 * Também suporta arrays de campos para pesquisa em múltiplos atributos de uma só vez.
 * Exemplo: busca "smed merenda" bate com objeto "Fornecimento de merenda escolar" e secretaria "SMED".
 */
export function matchesSearch(
  targets: (string | number | null | undefined)[] | string | number | null | undefined,
  search: string | number | null | undefined
): boolean {
  if (!search || !search.toString().trim()) return true;
  if (!targets) return false;

  const searchTokens = normalizeText(search)
    .split(/[\s/,-]+/)
    .filter(t => t.length > 0);

  if (searchTokens.length === 0) return true;

  let composite = '';
  if (Array.isArray(targets)) {
    composite = targets.map(t => normalizeText(t)).join(' ');
  } else {
    composite = normalizeText(targets);
  }

  const compositeTokens = composite.split(/[\s/,-]+/).filter(t => t.length > 0);

  // Verifica se todos os tokens da busca estão presentes na composição
  return searchTokens.every(token => {
    // Se o token for puramente numérico (ex: "1", "10"), exige match exato de token ou fronteira de barra
    if (/^\d+$/.test(token)) {
      return compositeTokens.some(ct => ct === token) || composite.includes(`/${token}`) || composite.includes(`${token}/`);
    }
    // Para termos alfabéticos ou mistos, busca inclusão textual
    return composite.includes(token);
  });
}

/**
 * Converte de forma segura uma data (string YYYY-MM-DD ou ISO) para Date local sem recuo UTC.
 */
export function parseDateSafe(dateVal?: string | Date | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  const str = String(dateVal).trim();
  if (!str) return null;

  // Formato YYYY-MM-DD puro: constrói Date no fuso local para evitar offset UTC de -3h
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

  // Formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const parts = str.split('/').map(Number);
    return new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formata data no padrão brasileiro dd/MM/yyyy de forma consistente e segura contra UTC off-by-one.
 */
export function formatDatePtBr(dateVal?: string | Date | null): string {
  const d = parseDateSafe(dateVal);
  if (!d) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Retorna a data de hoje no fuso local no formato YYYY-MM-DD para formulários (evita bug de UTC pós 21h).
 */
export function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
