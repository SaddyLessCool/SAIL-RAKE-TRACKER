import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Anchor,
  Truck,
  TimerReset,
  Hourglass,
  PackageX,
  MapPin,
  Train,
  Clock,
  Search,
  Download,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { api, type Rake } from "@/lib/api";
import { useSnapshots } from "@/components/snapshot-provider";
import { KpiCard, MiniKpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardCharts } from "@/components/DashboardCharts";
import { UploadZone } from "@/components/UploadZone";

export const Route = createFileRoute("/")({
  component: UploadPage,
});

function UploadPage() {
  const { selectedId, isLoading: snapsLoading, error: snapsErr } = useSnapshots();
  
  // Search and Category Filters
  const [q, setQ] = useState("");
  const [fStts, setFStts] = useState("All");
  const [fLocn, setFLocn] = useState("All");
  const [fZone, setFZone] = useState("All");
  const [fDvsn, setFDvsn] = useState("All");
  const [fCmdt, setFCmdt] = useState("All");

  // Quick Filter Buttons
  const [quick, setQuick] = useState("All");

  const { data, isLoading, error } = useQuery({
    queryKey: ["snapshot", selectedId],
    queryFn: () => api.snapshot(selectedId!),
    enabled: !!selectedId,
  });

  const rakes: Rake[] = data?.records ?? [];

  const stabled = useMemo(() => rakes.filter((r) => r.stts_code === "ST"), [rakes]);
  const moving = useMemo(() => rakes.filter((r) => r.stts_code !== "ST"), [rakes]);
  const transitDelay = useMemo(
    () => rakes.filter((r) => r.is_transit_delayed),
    [rakes],
  );
  const loadingDelay = useMemo(
    () => rakes.filter((r) => r.is_loading_delayed),
    [rakes],
  );
  const unloadingDelay = useMemo(
    () => rakes.filter((r) => r.is_unloading_delayed),
    [rakes],
  );
  const placed = useMemo(() => rakes.filter((r) => r.stts_code === "PL"), [rakes]);
  const idle3hrs = useMemo(() => rakes.filter((r) => r.is_idle_3hrs), [rakes]);

  // Unique options for dropdowns
  const options = useMemo(() => {
    return {
      stts: ["All", ...new Set(rakes.map(r => r.stts_code).filter(Boolean).sort())],
      locn: ["All", ...new Set(rakes.map(r => r.locn).filter(Boolean).sort())],
      zone: ["All", ...new Set(rakes.map(r => r.zone).filter(Boolean).sort())],
      dvsn: ["All", ...new Set(rakes.map(r => r.dvsn).filter(Boolean).sort())],
      cmdt: ["All", ...new Set(rakes.map(r => r.cmdt).filter(Boolean).sort())],
    };
  }, [rakes]);

  const filtered = useMemo(() => {
    return rakes.filter(r => {
      // 1. Search Query
      const s = q.trim().toLowerCase();
      if (s && !((r.rake_name ?? "").toLowerCase().includes(s) || (r.locn ?? "").toLowerCase().includes(s))) return false;

      // 2. Dropdown Filters
      if (fStts !== "All" && r.stts_code !== fStts) return false;
      if (fLocn !== "All" && r.locn !== fLocn) return false;
      if (fZone !== "All" && r.zone !== fZone) return false;
      if (fDvsn !== "All" && r.dvsn !== fDvsn) return false;
      if (fCmdt !== "All" && r.cmdt !== fCmdt) return false;

      // 3. Quick Filters
      if (quick === "Only Stabled" && r.stts_code !== "ST") return false;
      if (quick === "Only Idle" && !r.is_idle_3hrs) return false;
      if (quick === "Only Moving" && r.stts_code === "ST") return false;
      if (quick === "Placed" && r.stts_code !== "PL") return false;
      if (quick === "Transit Delayed" && !r.is_transit_delayed) return false;
      if (quick === "Unloading Delayed" && !r.is_unloading_delayed) return false;
      if (quick === "Loading Delayed" && !r.is_loading_delayed) return false;
      if (quick === "Any Delayed" && !(r.is_transit_delayed || r.is_loading_delayed || r.is_unloading_delayed)) return false;

      return true;
    });
  }, [rakes, q, fStts, fLocn, fZone, fDvsn, fCmdt, quick]);

  const exportCsv = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rakes_${data?.snapshot?.report_time ?? "snapshot"}.csv`.replace(/[: ]/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  };

  if (snapsErr) return <ErrorBox msg={snapsErr.message} />;
  if (snapsLoading || (!data && isLoading)) return <LoadingBox />;
  if (error) return <ErrorBox msg={(error as Error).message} />;
  const miniItem = (r: Rake) => ({
    primary: r.rake_name,
    secondary: r.locn ?? "—",
  });

  return (
    <div className="space-y-6">
      <UploadZone />

      {!selectedId ? (
        <EmptyBox msg="No snapshot available. Please upload one above." />
      ) : (
        <>
          {/* Overview Stats - Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 mt-10 mb-8">
            <MiniKpiCard
              title="Total Rakes"
              value={rakes.length}
              icon={Train}
              color="primary"
            />
            <MiniKpiCard
              title="Moving Rakes"
              value={moving.length}
              icon={Truck}
              color="info"
            />
            <MiniKpiCard
              title="Idle > 3 hrs"
              value={idle3hrs.length}
              icon={Clock}
              color="warning"
            />
          </div>

          {/* Detailed Status - Standard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-3 gap-y-10">
            <KpiCard
              title="Stabled Rakes"
              value={stabled.length}
              icon={Anchor}
              color="dark"
              items={stabled.map(miniItem)}
            />
            <KpiCard
              title="Transit Delayed"
              value={transitDelay.length}
              icon={TimerReset}
              color="warning"
              items={transitDelay.map(miniItem)}
            />
            <KpiCard
              title="Loading Delayed"
              value={loadingDelay.length}
              icon={Hourglass}
              color="danger"
              items={loadingDelay.map(miniItem)}
            />
            <KpiCard
              title="Unloading Delayed"
              value={unloadingDelay.length}
              icon={PackageX}
              color="danger"
              items={unloadingDelay.map(miniItem)}
            />
            <KpiCard
              title="Placed Rakes"
              value={placed.length}
              icon={MapPin}
              color="success"
              items={placed.map(miniItem)}
            />
          </div>

          <DashboardCharts rakes={rakes} />

          <div className="md-card p-4 space-y-4 mb-6 border-b-0 rounded-b-none">
            {/* Top row: Search and Selects */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-muted-foreground/80 ml-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Enter rake name..."
                    className="h-9 w-full rounded-lg border border-border bg-background/60 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  />
                </div>
              </div>

              <FilterSelect label="STTS" value={fStts} onChange={setFStts} options={options.stts} />
              <FilterSelect label="Location" value={fLocn} onChange={setFLocn} options={options.locn} />
              <FilterSelect label="Zone" value={fZone} onChange={setFZone} options={options.zone} />
              <FilterSelect label="Division" value={fDvsn} onChange={setFDvsn} options={options.dvsn} />
              <FilterSelect label="Commodity" value={fCmdt} onChange={setFCmdt} options={options.cmdt} />
            </div>

            {/* Bottom row: Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
              {[
                "All", 
                "Only Stabled", 
                "Only Idle", 
                "Only Moving", 
                "Placed",
                "Transit Delayed", 
                "Unloading Delayed", 
                "Loading Delayed", 
                "Any Delayed"
              ].map((btn) => (
                <button
                  key={btn}
                  onClick={() => setQuick(btn)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    quick === btn 
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-primary dark:border-primary dark:text-primary-foreground" 
                      : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          <div className="md-card p-4 sm:p-5 border-t-0 rounded-t-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Current Snapshot</h2>
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-bold text-foreground">{filtered.length}</span> of {rakes.length} records
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <Th>Rake</Th>
                    <Th>LDNG Time</Th>
                    <Th>DVSN From</Th>
                    <Th>Load Name</Th>
                    <Th>Load Type</Th>
                    <Th>From → To</Th>
                    <Th>CMDT</Th>
                    <Th>STTS</Th>
                    <Th>Zone</Th>
                    <Th>DVSN</Th>
                    <Th>Location</Th>
                    <Th>STTS Time</Th>
                    <Th>Transit Time</Th>
                    <Th>ETA</Th>
                    <Th className="text-right">Stabled (h)</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={15}
                        className="py-8 text-center text-muted-foreground text-sm"
                      >
                        No rakes match your search.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r, i) => {
                    const delayed =
                      r.is_transit_delayed ||
                      r.is_loading_delayed ||
                      r.is_unloading_delayed;
                    return (
                      <tr
                        key={`${r.rake_name}-${i}`}
                        className="border-t border-border hover:bg-muted/40 transition-colors"
                      >
                        <Td className="font-medium">
                          {r.rake_name || (r as any).rake || "—"}
                        </Td>
                        <Td className="font-mono text-xs whitespace-nowrap">{r.ldng_time ?? "—"}</Td>
                        <Td>{r.dvsn_from ?? "—"}</Td>
                        <Td className="whitespace-nowrap">{r.load_name ?? "—"}</Td>
                        <Td>{r.load_type ?? "—"}</Td>
                        <Td className="text-muted-foreground whitespace-nowrap">
                          {(r.sttn_from ?? "—") + " → " + (r.sttn_to ?? "—")}
                        </Td>
                        <Td>{r.cmdt ?? "—"}</Td>
                        <Td>
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge code={r.stts_code} />
                            {delayed && <StatusBadge code="" delayed />}
                          </div>
                        </Td>
                        <Td>{r.zone ?? "—"}</Td>
                        <Td>{r.dvsn ?? "—"}</Td>
                        <Td>{r.locn ?? "—"}</Td>
                        <Td className="font-mono text-xs whitespace-nowrap">{r.stts_time ?? "—"}</Td>
                        <Td>{r.transit_time ?? "—"}</Td>
                        <Td className="font-mono text-xs whitespace-nowrap">{r.expd_arvltime ?? "—"}</Td>
                        <Td className="text-right tabular-nums">
                          {r.stabled_hours != null ? r.stabled_hours.toFixed(1) : "—"}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterSelect({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase text-muted-foreground/80 ml-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-border bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-shadow cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-left font-semibold ${className}`}>{children}</th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

export function LoadingBox() {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      Loading...
    </div>
  );
}
export function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="md-card p-6 border border-destructive/30">
      <p className="font-semibold text-destructive">Error loading data</p>
      <p className="text-sm text-muted-foreground mt-1">{msg}</p>
      <p className="text-xs text-muted-foreground mt-3">
        Make sure the FastAPI backend is running at <code>http://127.0.0.1:8000</code>.
      </p>
    </div>
  );
}
export function EmptyBox({ msg }: { msg: string }) {
  return (
    <div className="md-card p-10 text-center text-muted-foreground text-sm">{msg}</div>
  );
}
