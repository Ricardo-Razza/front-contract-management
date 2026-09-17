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

  // Verifica se todos os tokens da busca estão presentes na composição
  return searchTokens.every(token => composite.includes(token));
}
