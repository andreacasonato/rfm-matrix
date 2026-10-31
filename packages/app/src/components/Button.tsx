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
  'inline-flex h-10 items-center justify-center gap-2 rounded-control font-semibold disabled:cursor-not-allowed';

// Buttons drawn as a box. Disabled, they keep readable text (secondary on canvas passes AA,
// tools/checks/contrast.ts) and a dashed edge, instead of fading: faded text fell to 1.6:1.
const boxed =
  'px-4 disabled:border-dashed disabled:border-control-border disabled:bg-canvas disabled:text-text-secondary';

const variants: Record<Variant, string> = {
  // Dark text on the orange fill: white text fails contrast (DESIGN.md).
  primary: `border border-transparent bg-action-primary text-on-action enabled:hover:brightness-95 enabled:active:brightness-90 ${boxed}`,
  secondary: `border border-control-border bg-surface text-text-primary enabled:hover:bg-canvas enabled:active:brightness-95 ${boxed}`,
  // No side padding, so the text lines up with the headings and paragraphs around it.
  quiet:
    'text-action-text underline-offset-4 enabled:hover:underline enabled:active:brightness-90 disabled:text-text-secondary',
  // Destructive actions only (Delete); red is a status colour (DESIGN.md).
  danger: `border border-negative bg-surface text-negative enabled:hover:bg-negative-tint enabled:active:brightness-95 ${boxed}`,
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
