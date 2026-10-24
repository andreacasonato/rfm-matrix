// Reading amounts and dates as exports write them (ADR-0012 rules 2 and 3).

export type DecimalSeparator = '.' | ',';
export type DateOrder = 'dmy' | 'mdy';
export type DetectedDateOrder = 'iso' | DateOrder | 'ambiguous' | 'unknown';

const scientific = /^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i;
const groupingSpaces = /[\s'’  ]/g;

/** A number, `null` for an empty cell, or NaN when the text is not an amount. */
export function parseAmount(text: string, decimal: DecimalSeparator): number | null {
  let s = text.trim();
  if (!s) return null;
  if (scientific.test(s)) return Number(s);

  let negative = false;
  const bracketed = /^\((.*)\)$/.exec(s);
  if (bracketed) {
    negative = true;
    s = bracketed[1]?.trim() ?? '';
  }
  if (/[-−]\s*$/.test(s)) {
    negative = true;
    s = s.replace(/[-−]\s*$/, '');
  }
  // Currency symbols or codes before or after the number, and a minus between them.
  s = s.replace(/[^\d.,]+$/, '').replace(/^[^\d.,\-−]+/, '');
  if (/^[-−]/.test(s)) {
    negative = true;
    s = s.slice(1).replace(/^[^\d.,]+/, '');
  }
  s = s.replace(groupingSpaces, '');

  const thousands = decimal === '.' ? ',' : '.';
  const t = `\\${thousands}`;
  const d = `\\${decimal}`;
  const valid = new RegExp(`^(?:\\d{1,3}(?:${t}\\d{3})+|\\d+)(?:${d}\\d+)?$`);
  if (!valid.test(s)) return Number.NaN;
  const value = Number(s.replaceAll(thousands, '').replace(decimal, '.'));
  return negative ? -value : value;
}

/** A comma followed by one or two final digits, with no point, marks a decimal comma. */
export function detectDecimal(samples: string[]): DecimalSeparator {
  let comma = 0;
  let point = 0;
  for (const sample of samples) {
    const s = sample.trim().replace(/[^\d.,]+$/, '');
    if (/,\d{1,2}$/.test(s)) comma++;
    else if (/\.\d{1,2}$/.test(s) || /,\d{3}$/.test(s)) point++;
  }
  return comma > point ? ',' : '.';
}

const isoDate =
  /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;
const numericDate =
  /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?:[T\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

function offsetMinutes(zone: string | undefined): number {
  if (!zone || zone.toUpperCase() === 'Z') return 0;
  const sign = zone.startsWith('-') ? -1 : 1;
  const digits = zone.slice(1).replace(':', '');
  return sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2)));
}

function build(
  y: number,
  m: number,
  d: number,
  time: (string | undefined)[],
  zone?: string | undefined,
): number {
  const [hText, minText, secText, meridiem] = time;
  let h = Number(hText ?? 0);
  const min = Number(minText ?? 0);
  const sec = Number(secText ?? 0);
  if (meridiem) {
    if (h < 1 || h > 12) return Number.NaN;
    h = (h % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
  }
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth || h > 23 || min > 59 || sec > 59) {
    return Number.NaN;
  }
  return Date.UTC(y, m - 1, d, h, min, sec) - offsetMinutes(zone) * 60_000;
}

/** UTC milliseconds, or NaN when the text is not a date in a supported form. */
export function parseDate(text: string, order: DateOrder): number {
  const s = text.trim();
  const iso = isoDate.exec(s);
  if (iso) {
    const [, y, m, d, h, min, sec, zone] = iso;
    return build(Number(y), Number(m), Number(d), [h, min, sec], zone);
  }
  const numeric = numericDate.exec(s);
  if (!numeric) return Number.NaN;
  const [, a, b, yText, h, min, sec, meridiem, zone] = numeric;
  const y = Number(yText) + (yText?.length === 2 ? 2000 : 0);
  const [d, m] = order === 'dmy' ? [Number(a), Number(b)] : [Number(b), Number(a)];
  return build(y, m, d, [h, min, sec, meridiem], zone);
}

export function detectDateOrder(samples: string[]): DetectedDateOrder {
  let parsed = 0;
  let iso = 0;
  let dayFirst = false;
  let monthFirst = false;
  for (const sample of samples) {
    const s = sample.trim();
    if (!Number.isNaN(parseDate(s, 'dmy')) && isoDate.test(s)) {
      parsed++;
      iso++;
      continue;
    }
    const numeric = numericDate.exec(s);
    if (!numeric) continue;
    const dmy = !Number.isNaN(parseDate(s, 'dmy'));
    const mdy = !Number.isNaN(parseDate(s, 'mdy'));
    if (!dmy && !mdy) continue;
    parsed++;
    if (dmy && !mdy) dayFirst = true;
    if (mdy && !dmy) monthFirst = true;
  }
  if (parsed === 0 || (dayFirst && monthFirst)) return 'unknown';
  if (iso === parsed) return 'iso';
  if (dayFirst) return 'dmy';
  if (monthFirst) return 'mdy';
  return 'ambiguous';
}
