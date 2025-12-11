/**
 * CSV Export Utility
 * Provides functions to export data to CSV files
 */

export interface CSVColumn {
  header: string;
  key: string;
  format?: (value: any) => string;
}

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: any[], columns: CSVColumn[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headers = columns.map(col => `"${col.header}"`).join(',');

  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      const formattedValue = col.format ? col.format(value) : value;

      // Handle null/undefined
      if (formattedValue === null || formattedValue === undefined) {
        return '""';
      }

      // Escape quotes and wrap in quotes
      const stringValue = String(formattedValue).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Export data to CSV file
 */
export function exportToCSV(data: any[], columns: CSVColumn[], filename: string): void {
  const csvContent = convertToCSV(data, columns);
  if (csvContent) {
    downloadCSV(csvContent, filename);
  }
}

/**
 * Format date for CSV
 */
export function formatDateForCSV(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format currency for CSV (IDR)
 */
export function formatCurrencyForCSV(amount: number): string {
  return `IDR ${amount.toLocaleString('id-ID')}`;
}
