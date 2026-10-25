// Safe CSV export (PRD story 7, ADR-0014): text that a spreadsheet could run as a formula is made
// inert, values are quoted per RFC 4180, and Excel gets the BOM and CRLF it expects.

/** Text from the file; a number the app computed; or money, written with two decimals. */
export type CsvValue = string | number | { money: number } | null | undefined;

// OWASP CSV injection: cells starting with these can be read as formulas.
const formulaStart = /^[=+\-@\t\r]/;

export function escapeTextCell(text: string): string {
  return formulaStart.test(text) ? `'${text}` : text;
}

const quote = (text: string) => (/[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return quote(escapeTextCell(value));
  // Numbers are computed by the app, never copied from the file, so they cannot hold formula
  // text; a negative amount must stay a number in the spreadsheet (ADR-0014).
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return Number.isFinite(value.money) ? value.money.toFixed(2) : '';
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [header, ...rows].map((row) => row.map(cell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}
