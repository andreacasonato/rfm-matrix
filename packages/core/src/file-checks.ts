// Checks for data read from a file the user opens (S9): each check records a plain problem with
// where it is, and returns the value only when it is usable. Nothing is copied from the data
// without passing a check, so unknown fields are dropped and never reach the app.

const shown = (value: unknown) => {
  const text = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
  return `"${text.length > 40 ? `${text.slice(0, 40)}…` : text}"`;
};

export type Fields = Record<string, unknown>;

export class FileCheck {
  /** The first problems in full; a file with thousands of bad cells only counts the rest. */
  readonly problems: string[] = [];
  total = 0;

  fail(path: string, message: string): undefined {
    this.total++;
    if (this.problems.length < 100) this.problems.push(`${path} ${message}`);
    return undefined;
  }

  object(path: string, value: unknown): Fields | undefined {
    const ok = typeof value === 'object' && value !== null && !Array.isArray(value);
    return ok ? (value as Fields) : this.fail(path, 'must be an object.');
  }

  text(path: string, value: unknown, max = 200): string | undefined {
    if (typeof value !== 'string') return this.fail(path, 'must be text.');
    return value.length > max ? this.fail(path, `is longer than ${max} characters.`) : value;
  }

  whole(path: string, value: unknown, min = -Infinity, max = Infinity): number | undefined {
    if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max) {
      return value;
    }
    const range =
      max < Infinity ? ` from ${min} to ${max}` : min > -Infinity ? ` of at least ${min}` : '';
    return this.fail(path, `must be a whole number${range}.`);
  }

  number(path: string, value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : this.fail(path, 'must be a number.');
  }

  boolean(path: string, value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : this.fail(path, 'must be true or false.');
  }

  oneOf<T extends string>(path: string, value: unknown, options: readonly T[]): T | undefined {
    return options.includes(value as T)
      ? (value as T)
      : this.fail(path, `must be one of: ${options.join(', ')}.`);
  }

  day(path: string, value: unknown): string | undefined {
    const ok = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    return ok && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
      ? value
      : this.fail(path, 'must be a date like 2026-10-01.');
  }

  /** A list of at most `max` entries, or exactly `length` when given. */
  list(path: string, value: unknown, max: number, length?: number): unknown[] | undefined {
    if (!Array.isArray(value)) return this.fail(path, 'must be a list.');
    if (length !== undefined && value.length !== length) {
      return this.fail(path, `must have ${length} entries.`);
    }
    return value.length > max ? this.fail(path, `has more than ${max} entries.`) : value;
  }

  /** Each entry of a list through one check; undefined if any entry fails. */
  each<T>(path: string, list: unknown[], check: (path: string, v: unknown) => T | undefined) {
    const out: T[] = [];
    let ok = true;
    list.forEach((value, i) => {
      const checked = check(`${path}[${i}]`, value);
      if (checked === undefined) ok = false;
      else out.push(checked);
    });
    return ok ? out : undefined;
  }

  /** Only the allowed fields, each through its check; unknown fields are problems. */
  record<K extends string, T>(
    path: string,
    value: unknown,
    allowed: readonly K[],
    check: (path: string, v: unknown) => T | undefined,
  ): Partial<Record<K, T>> | undefined {
    const fields = this.object(path, value);
    if (!fields) return undefined;
    const out: Partial<Record<K, T>> = {};
    for (const [key, v] of Object.entries(fields)) {
      if (!allowed.includes(key as K)) {
        this.fail(path, `has an unknown field ${shown(key)}.`);
        continue;
      }
      const checked = check(`${path}.${key}`, v);
      if (checked !== undefined) out[key as K] = checked;
    }
    return out;
  }

  quote = shown;
}
