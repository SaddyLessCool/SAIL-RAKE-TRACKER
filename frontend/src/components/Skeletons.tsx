import { Skeleton } from "@/components/ui/skeleton";

export function MiniKpiCardSkeleton() {
  return (
    <div className="md-card p-4 pt-3 relative flex flex-col items-end min-h-[85px] mt-4 animate-pulse">
      <div className="absolute -top-4 left-4 h-12 w-12 rounded-xl bg-muted shadow-md-soft" />
      <div className="text-right space-y-2 w-32">
        <Skeleton className="h-3 w-20 ml-auto bg-muted-foreground/10" />
        <Skeleton className="h-6 w-12 ml-auto bg-muted-foreground/15" />
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="md-card p-3 pt-4 relative flex flex-col h-full min-w-0 mt-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="absolute -top-4 left-4 h-10 w-10 rounded-xl bg-muted shadow-md-soft" />
        <div className="ml-auto text-right space-y-1.5 w-32">
          <Skeleton className="h-2.5 w-24 ml-auto bg-muted-foreground/10" />
          <Skeleton className="h-5 w-10 ml-auto bg-muted-foreground/15" />
        </div>
      </div>
      <div className="mt-2 border-t border-border/50 pt-2 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1 px-2">
            <Skeleton className="h-3 w-16 bg-muted-foreground/10" />
            <Skeleton className="h-3 w-10 bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8 animate-pulse">
      <div className="lg:col-span-2 md-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44 bg-muted-foreground/10" />
          <Skeleton className="h-4 w-28 bg-muted-foreground/10" />
        </div>
        <div className="h-[280px] flex items-end justify-between gap-4 pt-4 border-b border-l border-border/50 px-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-full space-y-2 flex flex-col items-center">
              <Skeleton 
                className="w-full bg-muted-foreground/10 rounded-t-md" 
                style={{ height: `${[60, 120, 180, 90, 150, 220, 110, 80, 170, 200, 130, 95][i]}px` }}
              />
              <Skeleton className="h-2 w-8 bg-muted-foreground/5" />
            </div>
          ))}
        </div>
      </div>
      <div className="md-card p-5 space-y-4">
        <Skeleton className="h-5 w-32 bg-muted-foreground/10" />
        <div className="h-[280px] flex items-center justify-center relative">
          {/* Mock Pie Chart Skeleton */}
          <div className="h-48 w-48 rounded-full border-[20px] border-muted-foreground/10 flex items-center justify-center">
            <div className="text-center space-y-1">
              <Skeleton className="h-4 w-12 mx-auto bg-muted-foreground/10" />
              <Skeleton className="h-3 w-16 mx-auto bg-muted-foreground/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="md-card p-5 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48 bg-muted-foreground/10" />
          <Skeleton className="h-3.5 w-32 bg-muted-foreground/10" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg bg-muted-foreground/10" />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-full divide-y divide-border">
          <div className="bg-muted/60 p-3 flex justify-between gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-16 bg-muted-foreground/10" />
            ))}
          </div>
          <div className="divide-y divide-border bg-card">
            {Array.from({ length: rows }).map((_, idx) => (
              <div key={idx} className="p-3.5 flex justify-between items-center gap-4 hover:bg-muted/10">
                <Skeleton className="h-4 w-24 bg-muted-foreground/10" />
                <Skeleton className="h-4 w-16 bg-muted-foreground/10" />
                <Skeleton className="h-4 w-28 bg-muted-foreground/10" />
                <Skeleton className="h-4 w-14 bg-muted-foreground/10" />
                <Skeleton className="h-5 w-16 rounded bg-muted-foreground/15" />
                <Skeleton className="h-4 w-20 bg-muted-foreground/10" />
                <Skeleton className="h-4 w-12 bg-muted-foreground/10" />
                <Skeleton className="h-4 w-10 bg-muted-foreground/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComparisonSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: 3 }).map((_, colIdx) => (
        <div key={colIdx} className="md-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded bg-muted-foreground/10" />
              <Skeleton className="h-4 w-24 bg-muted-foreground/10" />
            </div>
            <Skeleton className="h-5 w-8 rounded-full bg-muted-foreground/10" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32 bg-muted-foreground/10" />
                  <Skeleton className="h-3 w-20 bg-muted-foreground/10" />
                </div>
                {colIdx === 0 && <Skeleton className="h-3 w-8 bg-muted-foreground/10" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RangeSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start animate-pulse">
      {Array.from({ length: 2 }).map((_, colIdx) => (
        <div key={colIdx} className="md-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4 rounded bg-muted-foreground/10" />
            <Skeleton className="h-4 w-36 bg-muted-foreground/10" />
            {colIdx === 1 && <Skeleton className="h-3.5 w-16 ml-auto bg-muted-foreground/10" />}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
              >
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28 bg-muted-foreground/10" />
                  <Skeleton className="h-3.5 w-36 bg-muted-foreground/10" />
                </div>
                <Skeleton className="h-5 w-12 rounded-full bg-muted-foreground/10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
