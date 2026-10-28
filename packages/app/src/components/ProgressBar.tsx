type Props = {
  label: string;
  done: number /** Unknown when opening a saved snapshot. */;
  total?: number;
};

/** How much of a job is done. Without a total it shows an empty track and no value, so screen
 * readers hear that work is running without a made-up percentage. No animation (DESIGN.md). */
export function ProgressBar({ label, done, total }: Props) {
  const percent = total ? Math.min(100, Math.floor((done / total) * 100)) : undefined;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-control bg-border"
    >
      {percent !== undefined && (
        <div className="h-full bg-action-primary" style={{ width: `${percent}%` }} />
      )}
    </div>
  );
}
