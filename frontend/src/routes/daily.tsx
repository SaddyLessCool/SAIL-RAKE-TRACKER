import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Activity, Clock, Anchor } from "lucide-react";
import { api } from "@/lib/api";
import { KpiCard } from "@/components/KpiCard";
import { LoadingBox, ErrorBox } from "./index";

export const Route = createFileRoute("/daily")({
  component: DailyPage,
});

function DailyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["daily"],
    queryFn: api.daily,
  });

  if (isLoading) return <LoadingBox />;
  if (error) return <ErrorBox msg={(error as Error).message} />;
  if (!data) return null;

  const stabled = data.still_stabled_rakes ?? [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-10 mt-8">
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
      </div>

      <div className="md-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Anchor className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Currently Still Stabled</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            Idle time today
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Rake</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-right">Idle Today (h)</th>
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
                <tr key={i} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2.5 font-medium">{r.rake_name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.locn ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {(r.duration_hours ?? 0).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
