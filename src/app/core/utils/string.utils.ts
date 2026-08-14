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
