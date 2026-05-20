import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { CalendarDays, Activity, Clock, Anchor, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { KpiCard } from "@/components/KpiCard";
import { toast } from "sonner";
import { KpiCardSkeleton, TableSkeleton } from "@/components/Skeletons";
import { ErrorBox } from "./index";

export const Route = createFileRoute("/daily")({
  component: DailyPage,
});

function DailyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["daily"],
    queryFn: api.daily,
  });

  useEffect(() => {
    if (error) {
      toast.error(`Failed to load daily summary: ${(error as Error).message}`);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton rows={4} />
          <TableSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (error) return <ErrorBox msg={(error as Error).message} />;
  if (!data) return null;

  const stabled = data.still_stabled_rakes ?? [];
  const idleRakes = data.idle_rakes ?? [];

  return (
    <div className="space-y-8">
      {/* 4-Column KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <KpiCard
          title="Total Stabled Rakes Today"
          value={data.total_rakes ?? 0}
          icon={CalendarDays}
          color="info"
        />
        <KpiCard
          title="Movements Today"
          value={data.total_movements ?? 0}
          icon={Activity}
          color="success"
        />
        <KpiCard
          title="Total Stabled (h) Today"
          value={(data.total_duration_hours ?? 0).toFixed(1)}
          icon={Clock}
          color="warning"
        />
        <KpiCard
          title="Total Idle Rakes Today"
          value={data.idle_count ?? 0}
          icon={AlertTriangle}
          color="danger"
        />
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currently Still Stabled */}
        <div className="md-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Currently Still Stabled</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {stabled.length} rakes stabled
            </span>
          </div>
          <div className="max-h-[300px] overflow-y-auto overflow-x-auto rounded-lg border border-border custom-scrollbar relative">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-border shadow-sm">
                <tr>
                  <th className="px-3 py-2.5 text-left">Rake</th>
                  <th className="px-3 py-2.5 text-left">Location</th>
                  <th className="px-3 py-2.5 text-right">Idle Today (h)</th>
                </tr>
              </thead>
              <tbody>
                {stabled.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No stabled rakes today.
                    </td>
                  </tr>
                )}
                {stabled.map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{r.rake_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.locn ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-primary font-semibold">
                      {(r.duration_hours ?? 0).toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Currently Idle > 3 Hrs */}
        <div className="md-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-danger animate-pulse" />
            <h2 className="font-semibold">Currently Idle &gt; 3 Hrs</h2>
            <span className="ml-auto text-xs text-muted-foreground text-danger font-semibold">
              {idleRakes.length} alerts
            </span>
          </div>
          <div className="max-h-[300px] overflow-y-auto overflow-x-auto rounded-lg border border-border custom-scrollbar relative">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-border shadow-sm">
                <tr>
                  <th className="px-3 py-2.5 text-left">Rake</th>
                  <th className="px-3 py-2.5 text-left">Location</th>
                  <th className="px-3 py-2.5 text-right">Total Idle (h)</th>
                </tr>
              </thead>
              <tbody>
                {idleRakes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No idle rakes today.
                    </td>
                  </tr>
                )}
                {idleRakes.map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{r.rake_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.locn ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-danger font-semibold">
                      {(r.duration_hours ?? 0).toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
