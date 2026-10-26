import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Disables the button and shows `loadingLabel` while work is running. */
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
};

const base =
  'inline-flex h-10 items-center justify-center gap-2 rounded-control px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  // Dark text on the orange fill: white text fails contrast (DESIGN.md).
  primary:
    'bg-action-primary text-on-action enabled:hover:brightness-95 enabled:active:brightness-90',
  secondary:
    'border border-border bg-surface text-text-primary enabled:hover:bg-canvas enabled:active:brightness-95',
  quiet:
    'px-2 text-action-text underline-offset-4 enabled:hover:underline enabled:active:brightness-90',
  // Destructive actions only (Delete); red is a status colour (DESIGN.md).
  danger:
    'border border-negative bg-surface text-negative enabled:hover:bg-negative-tint enabled:active:brightness-95',
};

export function Button({
  variant = 'secondary',
  loading = false,
  loadingLabel,
  icon,
  children,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
