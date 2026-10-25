const maxChars = 40;

// Long values are cut at 40 characters, with the full text on hover or focus (APP_FLOW "States").
export function Truncated({ value }: { value: string }) {
  if (value.length <= maxChars) return <>{value}</>;
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: focus reveals the full value
    <span title={value} tabIndex={0}>
      {`${value.slice(0, maxChars)}…`}
    </span>
  );
}
