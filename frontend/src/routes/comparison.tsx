import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowRightLeft, LogIn, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useSnapshots } from "@/components/snapshot-provider";
import { toast } from "sonner";
import { ComparisonSkeleton } from "@/components/Skeletons";
import { ErrorBox, EmptyBox } from "./index";

export const Route = createFileRoute("/comparison")({
  component: ComparisonPage,
});

function ComparisonPage() {
  const { selectedId } = useSnapshots();
  const { data, isLoading, error } = useQuery({
    queryKey: ["compare", selectedId],
    queryFn: () => api.compare(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (error) {
      toast.error(`Failed to load comparison: ${(error as Error).message}`);
    }
  }, [error]);

  if (!selectedId) return <EmptyBox msg="No snapshot selected." />;
  if (isLoading) return <ComparisonSkeleton />;
  if (error) return <ErrorBox msg={(error as Error).message} />;
  if (!data) return <EmptyBox msg="No comparison data." />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Column
        title="Still Stabled"
        count={data.still_stabled?.length ?? data.still_stabled_count ?? 0}
        icon={ArrowRightLeft}
        color="var(--info)"
        rows={data.still_stabled ?? []}
        showDuration
      />
      <Column
        title="New Arrivals"
        count={data.new_stabled?.length ?? data.new_stabled_count ?? 0}
        icon={LogIn}
        color="var(--success)"
        rows={data.new_stabled ?? []}
      />
      <Column
        title="Moved Out"
        count={data.moved?.length ?? data.moved_count ?? 0}
        icon={LogOut}
        color="var(--danger)"
        rows={data.moved ?? []}
      />
    </div>
  );
}

function Column({
  title,
  count,
  icon: Icon,
  color,
  rows,
  showDuration,
}: {
  title: string;
  count: number;
  icon: any;
  color: string;
  rows: any[];
  showDuration?: boolean;
}) {
  return (
    <div className="md-card overflow-hidden animate-fade-in-up">
      <div
        className="flex items-center justify-between px-5 py-4 text-white"
        style={{ background: `linear-gradient(195deg, color-mix(in oklab, ${color} 88%, white), ${color})` }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
          {count}
        </span>
      </div>
      <div className="max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-border">
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No rakes</p>
        )}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{r.rake_name ?? r.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{r.locn ?? r.location ?? ""}</p>
            </div>
            {showDuration && r.duration_hours != null && (
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                {Number(r.duration_hours).toFixed(1)}h
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
