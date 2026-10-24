/**
 * One cell of a CSV an organiser opens in Excel or Sheets.
 *
 * Everything is quoted, and a value that starts with =, +, - or @ is prefixed
 * with an apostrophe: a spreadsheet would otherwise read a guest's name or a
 * cashbook note as a formula and run it.
 */
export function spreadsheetCell(value: unknown): string {
  const text = String(value ?? '');
  return '"' + (/^[\s]*[=+\-@]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
}

/** A CSV of `rows`, one column per field, with the byte-order mark Excel wants. */
export function spreadsheetCsv(fields: string[], rows: Record<string, unknown>[]): string {
  return (
    '﻿' +
    [
      fields.map(spreadsheetCell).join(','),
      ...rows.map((row) => fields.map((key) => spreadsheetCell(row[key])).join(',')),
    ].join('\r\n')
  );
}
