import { cn } from "@/lib/utils";

type Variant = "info" | "success" | "warning" | "danger" | "muted";

const map: Record<string, { label: string; variant: Variant }> = {
  ST: { label: "Stabled", variant: "info" },
  PL: { label: "Placed", variant: "success" },
  RN: { label: "Running", variant: "muted" },
};

const styles: Record<Variant, string> = {
  info: "bg-[oklch(var(--info)_/_0.12)] text-[var(--info)] ring-[oklch(var(--info)_/_0.25)]",
  success:
    "bg-[oklch(var(--success)_/_0.12)] text-[var(--success)] ring-[oklch(var(--success)_/_0.25)]",
  warning:
    "bg-[oklch(var(--warning)_/_0.18)] text-[oklch(0.55_0.16_70)] dark:text-[var(--warning)] ring-[oklch(var(--warning)_/_0.3)]",
  danger:
    "bg-[oklch(var(--danger)_/_0.12)] text-[var(--danger)] ring-[oklch(var(--danger)_/_0.25)]",
  muted: "bg-muted text-muted-foreground ring-border",
};

export function StatusBadge({
  code,
  delayed,
  className,
}: {
  code: string;
  delayed?: boolean;
  className?: string;
}) {
  if (delayed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
          styles.warning,
          className,
        )}
      >
        Delayed
      </span>
    );
  }
  const cfg = map[code] ?? { label: code || "—", variant: "muted" as Variant };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        styles[cfg.variant],
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
