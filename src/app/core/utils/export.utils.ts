export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | null | undefined;
}

/**
 * Exporta uma coleção de dados para arquivo CSV formatado com BOM UTF-8 e delimitador ponto-e-vírgula (padrão Excel Brasil).
 */
export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]): void {
  if (!data || data.length === 0) return;

  const headerRow = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(';');
  const rows = data.map(item =>
    columns.map(c => {
      const val = c.accessor(item);
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(';')
  );

  const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
