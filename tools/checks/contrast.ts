// WCAG 2.2 AA contrast for the design tokens (M5 H3): every text colour on every background the
// app pairs it with, and the edges that identify form controls, in the light and dark themes.

export type Theme = Record<string, string>;

/** The light theme from @theme, and the dark one as light plus its overrides. */
export function themes(css: string): { light: Theme; dark: Theme } {
  const read = (block: string) =>
    Object.fromEntries(
      [...block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]),
    ) as Theme;
  const light = read(css.slice(css.indexOf('@theme'), css.indexOf('@media')));
  const darkBlock = css.slice(css.indexOf(':root[data-theme="dark"]'));
  return { light, dark: { ...light, ...read(darkBlock) } };
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** [foreground, background, minimum ratio, where the app uses it]. */
export type Pair = [string, string, number, string];

const text = 4.5;
const control = 3;

export const pairs: Pair[] = [
  ['text-primary', 'canvas', text, 'page text'],
  ['text-primary', 'surface', text, 'panel text'],
  ['text-secondary', 'canvas', text, 'hints on the page'],
  ['text-secondary', 'surface', text, 'hints in panels'],
  ['action-text', 'canvas', text, 'quiet buttons on the page'],
  ['action-text', 'surface', text, 'quiet buttons in panels'],
  ['on-action', 'action-primary', text, 'primary button'],
  ['on-tooltip', 'tooltip', text, 'toast, undo bar, tooltip'],
  ['text-primary', 'negative-tint', text, 'error notice text'],
  ['negative', 'negative-tint', text, 'error notice title, At risk pill'],
  ['negative', 'surface', text, 'Delete buttons, error lines'],
  ['text-primary', 'warning-tint', text, 'warning notice text'],
  ['warning', 'warning-tint', text, 'warning notice title, Slipping pill'],
  ['warning', 'surface', text, 'blocked-delete message'],
  ['positive', 'positive-tint', text, 'Thriving pill'],
  ['action-text', 'heat-1', text, 'Growing pill'],
  ['text-secondary', 'canvas', text, 'Gone pill'],
  ['text-primary', 'heat-1', text, 'heatmap step 1'],
  ['text-primary', 'heat-2', text, 'heatmap step 2'],
  ['text-primary', 'heat-3', text, 'heatmap step 3'],
  ['text-primary', 'heat-4', text, 'heatmap step 4'],
  ['on-action', 'heat-5', text, 'heatmap step 5'],
  ['control-border', 'surface', control, 'edge of inputs, selects and buttons'],
  ['control-border', 'canvas', control, 'edge of controls on the page'],
  ['action-primary', 'surface', control, 'keyboard focus outline in panels'],
  ['action-primary', 'canvas', control, 'keyboard focus outline on the page'],
];

export type ContrastFailure = { theme: string; pair: Pair; ratio: number };

export function contrastFailures(css: string): ContrastFailure[] {
  const failures: ContrastFailure[] = [];
  for (const [name, theme] of Object.entries(themes(css))) {
    for (const pair of pairs) {
      const [fg, bg, min] = pair;
      const a = theme[fg];
      const b = theme[bg];
      const ratio = a && b ? contrast(a, b) : 0;
      if (ratio < min) failures.push({ theme: name, pair, ratio: Math.round(ratio * 100) / 100 });
    }
  }
  return failures;
}
