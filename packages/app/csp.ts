// The Content-Security-Policy (ADR-0015), added to the production build as a meta tag because
// GitHub Pages cannot send headers. Changing it needs the maintainer's approval (AGENTS.md).
export const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "require-trusted-types-for 'script'",
  // Only the app's default policy (src/trusted-types.ts), which allows the worker's own URL.
  'trusted-types default',
].join('; ');
