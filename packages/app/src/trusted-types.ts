// The Content-Security-Policy turns on Trusted Types (ADR-0015): the browser refuses strings
// written into HTML, script or script-URL sinks. Only one sink is needed: starting the analysis
// worker. This default policy allows script URLs inside the app's own folder and nothing else;
// it defines no HTML or script rule, so those sinks stay blocked.

export type PolicyFactory = {
  createPolicy(name: string, rules: { createScriptURL(input: string): string | null }): unknown;
};

export function appScriptUrl(input: string, base: string): string | null {
  const appFolder = new URL('./', base).href;
  return new URL(input, base).href.startsWith(appFolder) ? input : null;
}

export function installTrustedTypes(factory: PolicyFactory | undefined, base: string) {
  factory?.createPolicy('default', { createScriptURL: (input) => appScriptUrl(input, base) });
}
