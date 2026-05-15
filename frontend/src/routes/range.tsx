import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, AlertTriangle, CalendarRange } from "lucide-react";
import { api } from "@/lib/api";
import { LoadingBox, ErrorBox } from "./index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/range")({
  component: RangePage,
});

const PRESETS = [
  { label: "7 days", value: "7d" as const },
  { label: "15 days", value: "15d" as const },
  { label: "1 month", value: "1m" as const },
  { label: "6 months", value: "6m" as const },
];

function RangePage() {
  const [range, setRange] = useState<"7d" | "15d" | "1m" | "6m">("7d");

  const { data, isLoading, error } = useQuery({
    queryKey: ["range", range],
    queryFn: () => api.range({ range_type: range }),
  });

  return (
    <div className="space-y-6">
      <div className="md-card p-4 flex flex-wrap items-center gap-2">
        <CalendarRange className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium mr-2">Range:</span>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setRange(p.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              range === p.value
                ? "bg-primary text-primary-foreground shadow-md-soft"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {p.label}
          </button>
        ))}
        {data?.start_date && data?.end_date && (
          <span className="ml-auto text-xs font-mono text-muted-foreground">
            {data.start_date} → {data.end_date}
          </span>
        )}
      </div>

      {isLoading && <LoadingBox />}
      {error && <ErrorBox msg={(error as Error).message} />}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="md-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Location Summary</h2>
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {(data.location_summary ?? []).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No data
                </p>
              )}
              {(data.location_summary ?? []).map((l, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{l.locn}</p>
                    <p className="text-xs text-muted-foreground">{l.count ?? 0} rakes handled</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {l.total_hours.toFixed(1)}h
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="md-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              <h2 className="font-semibold">Idle &gt; 3 Hrs</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {(data.idle_over_3hrs ?? []).length} alerts
              </span>
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {(data.idle_over_3hrs ?? []).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No idle alerts
                </p>
              )}
              {(data.idle_over_3hrs ?? []).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{r.rake_name}</p>
                    <p className="text-xs text-muted-foreground">{r.locn ?? "—"}</p>
                  </div>
                  <span className="rounded-full bg-[oklch(var(--warning)_/_0.18)] px-2.5 py-0.5 text-xs font-semibold text-[oklch(0.55_0.16_70)] dark:text-[var(--warning)]">
                    {r.duration_hours.toFixed(1)}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
