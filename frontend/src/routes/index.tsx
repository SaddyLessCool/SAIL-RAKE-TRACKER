import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MiniKpiCardSkeleton,
  KpiCardSkeleton,
  ChartsSkeleton,
  TableSkeleton,
} from "@/components/Skeletons";
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
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { api, type Rake } from "@/lib/api";
import { useSnapshots } from "@/components/snapshot-provider";
import { KpiCard, MiniKpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardCharts } from "@/components/DashboardCharts";
import { UploadZone } from "@/components/UploadZone";
import { PlantSummary, Modal, RakeTable } from "@/components/PlantSummary";

export const Route = createFileRoute("/")({
  component: UploadPage,
});

function UploadPage() {
  const { selectedId, isLoading: snapsLoading, error: snapsErr } = useSnapshots();
  
  // Filters State
  const [q, setQ] = useState("");
  const [fStts, setFStts] = useState<string[]>(["All"]);
  const [fLocn, setFLocn] = useState<string[]>(["All"]);
  const [fZone, setFZone] = useState<string[]>(["All"]);
  const [fDvsn, setFDvsn] = useState<string[]>(["All"]);
  const [fCmdt, setFCmdt] = useState<string[]>(["All"]);
  const [fSttnFrom, setFSttnFrom] = useState<string[]>(["All"]);
  const [fSttnTo, setFSttnTo] = useState<string[]>(["All"]);
  const [fPlant, setFPlant] = useState<string[]>(["All"]);

  // KPI modal state
  const [activeKpi, setActiveKpi] = useState<{ title: string; rakes: Rake[] } | null>(null);

  // Double scrollbars refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize scroll positions
  const handleTopScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };

  // Quick Filter Buttons
  const [quick, setQuick] = useState("All");

  const { data, isLoading, error } = useQuery({
    queryKey: ["snapshot", selectedId],
    queryFn: () => api.snapshot(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (snapsErr) {
      toast.error(`Failed to load snapshots list: ${snapsErr.message}`);
    }
  }, [snapsErr]);

  useEffect(() => {
    if (error) {
      toast.error(`Failed to load snapshot details: ${(error as Error).message}`);
    }
  }, [error]);

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

  // Unique options for dropdowns with custom sorting
  const options = useMemo(() => {
    const sortCustom = (list: string[], order: string[]) => {
      const present = order.filter(x => list.includes(x));
      const rest = list.filter(x => !order.includes(x)).sort();
      return ["All", ...present, ...rest];
    };

    const sttsRaw = [...new Set(rakes.map(r => r.stts_code).filter(Boolean))];
    const locnRaw = [...new Set(rakes.map(r => r.locn).filter(Boolean))];
    const zoneRaw = [...new Set(rakes.map(r => r.zone).filter(Boolean))];
    const dvsnRaw = [...new Set(rakes.map(r => r.dvsn).filter(Boolean))];
    const cmdtRaw = [...new Set(rakes.map(r => r.cmdt).filter(Boolean))];
    const sttnFromRaw = [...new Set(rakes.map(r => r.sttn_from).filter(Boolean))];
    const sttnToRaw = [...new Set(rakes.map(r => r.sttn_to).filter(Boolean))];

    return {
      stts: ["All", ...sttsRaw.sort()],
      locn: ["All", ...locnRaw.sort()],
      zone: sortCustom(zoneRaw, ["SE", "ER", "ECOR", "SCOR", "SEC", "SC"]),
      dvsn: sortCustom(dvsnRaw, ["CKP", "CKR", "ADRA", "RNC", "ASN", "KGP", "KUR", "WAT"]),
      cmdt: sortCustom(cmdtRaw, ["IMCL", "NMCL", "IORE", "IOST", "STC", "NSTC", "PBC", "NPBC", "NPC", "PHC", "NPHC", "NCOL", "LST", "LSST", "DMT", "DLMT", "DLST", "IS", "PIOR", "PIST", "SINT", "STON", "METL"]),
      sttnFrom: sortCustom(sttnFromRaw, ["BYFS", "PBSB", "HLSR", "ISCG", "FOS", "SOBK", "SSMK", "IISM", "DRZ", "KSDJ", "RSDG", "AAGH", "HDCB", "CBSP", "DDSP", "DDIP", "GPLC", "DPCB", "VSPV", "VZPB", "VGSD", "MGPV"]),
      sttnTo: sortCustom(sttnToRaw, ["BSPC", "MXA", "DSEY", "HSPG", "NHSB", "BSCS", "IISD", "BCME", "PMRN", "MOMG", "GFMK", "SSPL"]),
      plant: ["All", "BSP", "DSP", "RSP", "BSL", "ISP", "Fines → Pellet"],
    };
  }, [rakes]);

  const resetFilters = () => {
    setQ("");
    setFStts(["All"]);
    setFLocn(["All"]);
    setFZone(["All"]);
    setFDvsn(["All"]);
    setFCmdt(["All"]);
    setFSttnFrom(["All"]);
    setFSttnTo(["All"]);
    setFPlant(["All"]);
    setQuick("All");
    toast.success("Filters cleared!");
  };

  const filtered = useMemo(() => {
    return rakes.filter(r => {
      // 1. Search Query
      const s = q.trim().toLowerCase();
      if (s && !((r.rake_name ?? "").toLowerCase().includes(s) || (r.locn ?? "").toLowerCase().includes(s))) return false;

      // 2. Dropdown Filters
      if (!fStts.includes("All") && !fStts.includes(r.stts_code ?? "")) return false;
      if (!fLocn.includes("All") && !fLocn.includes(r.locn ?? "")) return false;
      if (!fZone.includes("All") && !fZone.includes(r.zone ?? "")) return false;
      if (!fDvsn.includes("All") && !fDvsn.includes(r.dvsn ?? "")) return false;
      if (!fCmdt.includes("All") && !fCmdt.includes(r.cmdt ?? "")) return false;
      if (!fSttnFrom.includes("All") && !fSttnFrom.includes(r.sttn_from ?? "")) return false;
      if (!fSttnTo.includes("All") && !fSttnTo.includes(r.sttn_to ?? "")) return false;

      // Plant filter logic
      if (!fPlant.includes("All")) {
        const PLANTS_CONFIG = [
          { name: "BSP", sttnTo: ["BSPC", "MXA"] },
          { name: "DSP", sttnTo: ["DSEY"] },
          { name: "RSP", sttnTo: ["HSPG", "NHSB"] },
          { name: "BSL", sttnTo: ["BSCS"] },
          { name: "ISP", sttnTo: ["IISD", "BCME"] },
          { name: "Fines → Pellet", sttnTo: ["PMRN","MOMG","GFMK","SSPL"] },
        ];
        const selectedPlantSttnTos = PLANTS_CONFIG.filter(p => fPlant.includes(p.name)).flatMap(p => p.sttnTo);
        if (!selectedPlantSttnTos.includes(r.sttn_to ?? "")) return false;
      }

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
  }, [rakes, q, fStts, fLocn, fZone, fDvsn, fCmdt, fSttnFrom, fSttnTo, fPlant, quick]);

  // 3-level sort: STTN TO priority → CMDT priority → LDNG TIME oldest-first
  const sortedFiltered = useMemo(() => {
    const STTNO_ORDER = ["BSPC","MXA","DSEY","IISD","BCME","HSPG","NHSB","BSCS","PMRN","MOMG","GFMK","SSPL"];
    const CMDT_ORDER  = ["IMCL","NMCL","IORE","IOST","LST","LSST","STC","NSTC","PBC","NPBC","NPC","PHC","NPHC","NCOL","DMT","DLMT","DLST","IS","PIOR","PIST","SINT","STON","METL"];

    const rankOf = (value: string | null | undefined, order: string[]) => {
      const idx = order.indexOf(value ?? "");
      return idx === -1 ? order.length : idx;   // unknown values go to the end
    };

    const parseDate = (s: string | null | undefined): number => {
      if (!s) return Infinity;
      // format: "DD-MM-YYYY HH:MM" or "YYYY-MM-DD HH:MM"
      const parts = s.trim().split(" ");
      const datePart = parts[0];
      const timePart = parts[1] ?? "00:00";
      const dateSeg = datePart.includes("-") ? datePart.split("-") : datePart.split("/");
      let d: Date;
      if (dateSeg[0].length === 4) {
        // YYYY-MM-DD
        d = new Date(`${dateSeg[0]}-${dateSeg[1]}-${dateSeg[2]}T${timePart}`);
      } else {
        // DD-MM-YYYY
        d = new Date(`${dateSeg[2]}-${dateSeg[1]}-${dateSeg[0]}T${timePart}`);
      }
      return isNaN(d.getTime()) ? Infinity : d.getTime();
    };

    return [...filtered].sort((a, b) => {
      // 1st key: STTN TO custom order
      const sttnDiff = rankOf(a.sttn_to, STTNO_ORDER) - rankOf(b.sttn_to, STTNO_ORDER);
      if (sttnDiff !== 0) return sttnDiff;

      // 2nd key: CMDT custom order
      const cmdtDiff = rankOf(a.cmdt, CMDT_ORDER) - rankOf(b.cmdt, CMDT_ORDER);
      if (cmdtDiff !== 0) return cmdtDiff;

      // 3rd key: LDNG TIME oldest → newest
      return parseDate(a.ldng_time) - parseDate(b.ldng_time);
    });
  }, [filtered]);

  const exportCsv = () => {
    try {
      const csv = Papa.unparse(sortedFiltered);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rakes_${data?.snapshot?.report_time ?? "snapshot"}.csv`.replace(/[: ]/g, "_");
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${sortedFiltered.length} rakes to CSV successfully!`, {
        description: `Filename: rakes_${data?.snapshot?.report_time ?? "snapshot"}.csv`.replace(/[: ]/g, "_"),
      });
    } catch (err: any) {
      toast.error(`CSV Export failed: ${err.message}`);
    }
  };

  if (snapsErr) return <ErrorBox msg={snapsErr.message} />;

  if (snapsLoading || (!data && isLoading)) {
    return (
      <div className="space-y-6">
        <UploadZone />
        
        {/* Overview Stats - Mini Cards Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 mt-10 mb-8">
          <MiniKpiCardSkeleton />
          <MiniKpiCardSkeleton />
          <MiniKpiCardSkeleton />
        </div>

        {/* Detailed Status - Standard Cards Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-3 gap-y-10">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>

        <ChartsSkeleton />

        <TableSkeleton />
      </div>
    );
  }

  if (error) return <ErrorBox msg={(error as Error).message} />;

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
              onClick={() => setActiveKpi({ title: "Stabled Rakes", rakes: stabled })}
            />
            <KpiCard
              title="Transit Delayed"
              value={transitDelay.length}
              icon={TimerReset}
              color="warning"
              onClick={() => setActiveKpi({ title: "Transit Delayed", rakes: transitDelay })}
            />
            <KpiCard
              title="Loading Delayed"
              value={loadingDelay.length}
              icon={Hourglass}
              color="danger"
              onClick={() => setActiveKpi({ title: "Loading Delayed", rakes: loadingDelay })}
            />
            <KpiCard
              title="Unloading Delayed"
              value={unloadingDelay.length}
              icon={PackageX}
              color="danger"
              onClick={() => setActiveKpi({ title: "Unloading Delayed", rakes: unloadingDelay })}
            />
            <KpiCard
              title="Placed Rakes"
              value={placed.length}
              icon={MapPin}
              color="success"
              onClick={() => setActiveKpi({ title: "Placed Rakes", rakes: placed })}
            />
          </div>

          {/* KPI Drill-down Modal */}
          {activeKpi && (
            <Modal title={`${activeKpi.title} (${activeKpi.rakes.length} rakes)`} onClose={() => setActiveKpi(null)}>
              <RakeTable rows={activeKpi.rakes} />
            </Modal>
          )}

          {/* Plant Summary */}
          <PlantSummary rakes={rakes} />

          <DashboardCharts rakes={rakes} />

          <div className="md-card p-4 space-y-4 mb-6 border-b-0 rounded-b-none">
            {/* Top row: Search and Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-muted-foreground/80 ml-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="h-9 w-full rounded-lg border border-border bg-background/60 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  />
                </div>
              </div>

              <FilterSelect label="STTS" value={fStts} onChange={setFStts} options={options.stts} />
              <FilterSelect label="Location" value={fLocn} onChange={setFLocn} options={options.locn} />
              <FilterSelect label="Zone" value={fZone} onChange={setFZone} options={options.zone} />
              <FilterSelect label="Division" value={fDvsn} onChange={setFDvsn} options={options.dvsn} />
              <FilterSelect label="Commodity" value={fCmdt} onChange={setFCmdt} options={options.cmdt} />
              <FilterSelect label="STTN FROM" value={fSttnFrom} onChange={setFSttnFrom} options={options.sttnFrom} />
              <FilterSelect label="STTN TO" value={fSttnTo} onChange={setFSttnTo} options={options.sttnTo} />
              <FilterSelect label="Plant" value={fPlant} onChange={setFPlant} options={options.plant} />
            </div>

            {/* Bottom row: Quick Filters & Apply/Reset Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-border/50">
              {/* Left: Quick Filters */}
              <div className="flex flex-wrap items-center gap-2">
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
                      "px-4 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer",
                      quick === btn 
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-primary dark:border-primary dark:text-primary-foreground" 
                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {btn}
                  </button>
                ))}
              </div>

              {/* Right: Reset & Apply Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={resetFilters}
                  className="h-9 rounded-lg border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          <div className="md-card p-4 sm:p-5 border-t-0 rounded-t-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Current Snapshot</h2>
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-bold text-foreground">{sortedFiltered.length}</span> of {rakes.length} records
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

            {/* Top Synchronized Scrollbar */}
            <div 
              ref={topScrollRef} 
              onScroll={handleTopScroll} 
              className="mt-4 overflow-x-auto overflow-y-hidden custom-scrollbar border border-border border-b-0 rounded-t-lg bg-card/10 select-none"
              style={{ height: "6px" }}
            >
              <div style={{ width: "1850px", height: "1px" }} />
            </div>

            {/* Table Container */}
            <div 
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-b-lg border border-border custom-scrollbar"
            >
              <table className="w-full text-sm min-w-[1850px]">
                <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground sticky top-0 bg-card/95 backdrop-blur-md z-10 border-b border-border shadow-sm">
                  <tr>
                    <Th>Rake</Th>
                    <Th>LDNG Time</Th>
                    <Th>DVSN From</Th>
                    <Th>Load Name</Th>
                    <Th>Load Type</Th>
                    <Th>STTN FROM</Th>
                    <Th>STTN TO</Th>
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
                  {sortedFiltered.length === 0 && (
                    <tr>
                      <td
                        colSpan={16}
                        className="py-8 text-center text-muted-foreground text-sm"
                      >
                        No rakes match your search.
                      </td>
                    </tr>
                  )}
                  {sortedFiltered.map((r, i) => {
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
                        <Td>{r.sttn_from ?? "—"}</Td>
                        <Td>{r.sttn_to ?? "—"}</Td>
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
  value: string[]; 
  onChange: (v: string[]) => void; 
  options: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When dropdown is closed, reset internal search query
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const toggleOption = (opt: string) => {
    if (opt === "All") {
      onChange(["All"]);
    } else {
      let next = value.filter(x => x !== "All");
      if (next.includes(opt)) {
        next = next.filter(x => x !== opt);
      } else {
        next = [...next, opt];
      }
      if (next.length === 0) {
        onChange(["All"]);
      } else {
        onChange(next);
      }
    }
  };

  const filteredOptions = options.filter(
    (opt) => opt !== "All" && opt.toLowerCase().includes(search.toLowerCase())
  );

  const displayText = () => {
    if (value.includes("All") || value.length === 0) return "All";
    if (value.length <= 2) return value.join(", ");
    return `${value.length} Selected`;
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative w-full">
      <label className="text-[11px] font-bold uppercase text-muted-foreground/80 ml-1 block">
        {label}
      </label>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-9 w-full flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 text-sm outline-none transition-all hover:bg-muted/30 cursor-pointer text-left",
            isOpen && "ring-2 ring-primary/40 border-primary"
          )}
        >
          <span className="truncate pr-2 font-medium">{displayText()}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-30 w-full min-w-[200px] rounded-xl border border-border bg-card/95 backdrop-blur-md text-foreground shadow-lg p-2 space-y-2 animate-fade-in-up">
          {/* Search box within dropdown */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label}...`}
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-foreground text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* List of options */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
            {/* "All" Option */}
            <button
              type="button"
              onClick={() => toggleOption("All")}
              className={cn(
                "flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold hover:bg-muted/60 transition-colors",
                value.includes("All") ? "bg-primary/15 text-primary" : "text-muted-foreground"
              )}
            >
              <span>All Options</span>
              {value.includes("All") && <Check className="h-3.5 w-3.5 text-primary stroke-[3px]" />}
            </button>

            {filteredOptions.map((opt) => {
              const isChecked = value.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className={cn(
                    "flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-muted/40",
                    isChecked ? "bg-muted font-semibold text-foreground" : "text-muted-foreground/90"
                  )}
                >
                  <span className="truncate mr-2">{opt}</span>
                  <div className={cn(
                    "h-4 w-4 rounded border border-input flex items-center justify-center transition-colors shrink-0",
                    isChecked ? "bg-primary border-primary text-primary-foreground" : "bg-background"
                  )}>
                    {isChecked && <Check className="h-3 w-3 stroke-[3px]" />}
                  </div>
                </button>
              );
            })}

            {filteredOptions.length === 0 && search && (
              <p className="text-center text-xs text-muted-foreground py-4 italic">No matching options</p>
            )}
          </div>
        </div>
      )}
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
