/**
 * CSV Formula Injection Sanitizer (CWE-1236)
 * Prevents Excel / Google Sheets formula execution when user-controlled feedback or findings are exported.
 */
export class CSVFormulaSanitizer {
  private static readonly DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

  /**
   * Sanitizes a single cell value to eliminate formula injection.
   */
  public static sanitizeCell(value: any): string {
    if (value === null || value === undefined) {
      return '""';
    }

    let str = String(value);

    // If string starts with a dangerous spreadsheet trigger, prefix with single quote
    if (this.DANGEROUS_PREFIXES.some((char) => str.startsWith(char))) {
      str = `'${str}`;
    }

    // Escape double quotes inside CSV cell
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  /**
   * Converts a 2D array of rows into a sanitized CSV string.
   */
  public static toSafeCsv(rows: any[][]): string {
    return rows
      .map((row) => row.map((cell) => this.sanitizeCell(cell)).join(','))
      .join('\r\n');
  }
}
