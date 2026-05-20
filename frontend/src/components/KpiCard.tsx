import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "dark" | "info" | "success" | "danger" | "warning" | "primary";
const tone: Record<Tone, string> = {
  dark: "var(--dark-card)",
  info: "var(--info)",
  success: "var(--success)",
  danger: "var(--danger)",
  warning: "var(--warning)",
  primary: "var(--primary)",
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  color = "info",
  items,
  emptyText = "No rakes",
  onClick,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: Tone;
  items?: Array<{ primary: string; secondary?: string }>;
  emptyText?: string;
  onClick?: () => void;
}) {
  const kpiColor = tone[color];

  return (
    <div 
      className={cn(
        "md-card p-3 pt-4 animate-fade-in-up relative flex flex-col h-full min-w-0 mt-4",
        onClick && "cursor-pointer interactive-kpi-card hover:bg-muted/30 transition-all duration-300"
      )}
      onClick={onClick}
      style={{
        "--kpi-color": kpiColor,
        "--kpi-glow-color": `color-mix(in srgb, ${kpiColor} 45%, transparent)`
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="absolute -top-4 left-4 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
          style={{ 
            background: `linear-gradient(195deg, color-mix(in oklab, ${tone[color]} 80%, white), ${tone[color]})`,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-auto text-right min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 truncate">
            {title}
          </p>
          <p className="text-xl font-bold leading-tight mt-0.5">{value}</p>
        </div>
      </div>
      {items !== undefined && (
        <div className="mt-2 border-t border-border/50 pt-2">
          {items.length > 0 ? (
            <ul className="max-h-32 space-y-1 overflow-y-auto pr-1 text-xs custom-scrollbar">
              {items.slice(0, 5).map((it, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted/60"
                >
                  <span className="truncate font-medium">{it.primary}</span>
                  {it.secondary && (
                    <span className="shrink-0 text-muted-foreground">
                      {it.secondary}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn("text-xs text-muted-foreground py-2")}>{emptyText}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MiniKpiCard({
  title,
  value,
  icon: Icon,
  color = "info",
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: Tone;
}) {
  return (
    <div className="md-card p-4 pt-3 animate-fade-in-up relative flex flex-col items-end min-h-[85px] mt-4">
      <div
        className="absolute -top-4 left-4 h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
        style={{ 
          background: `linear-gradient(195deg, color-mix(in oklab, ${tone[color]} 80%, white), ${tone[color]})`,
        }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-right">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </p>
        <p className="text-2xl font-bold text-foreground mt-0.5 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
