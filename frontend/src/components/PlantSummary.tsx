import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Factory, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rake } from "@/lib/api";

// ─── Plant config ───────────────────────────────────────────────────────────

type CmdtGroup = { label: string; codes: string[] };
type Plant = {
  id: string;
  name: string;
  sttnTo: string[];
  color: string;
  gradFrom: string;
};

const CMDT_GROUPS: CmdtGroup[] = [
  { label: "IMCL / NMCL", codes: ["IMCL", "NMCL"] },
  { label: "IORE / IOST", codes: ["IORE", "IOST"] },
  { label: "LST / LSST",  codes: ["LST",  "LSST"] },
  { label: "Others",      codes: [] },
];

const PLANTS: Plant[] = [
  { id: "BSP", name: "BSP", sttnTo: ["BSPC", "MXA"],               color: "#3b82f6", gradFrom: "#60a5fa" },
  { id: "DSP", name: "DSP", sttnTo: ["DSEY"],                       color: "#8b5cf6", gradFrom: "#a78bfa" },
  { id: "RSP", name: "RSP", sttnTo: ["HSPG", "NHSB"],              color: "#f59e0b", gradFrom: "#fbbf24" },
  { id: "BSL", name: "BSL", sttnTo: ["BSCS"],                       color: "#10b981", gradFrom: "#34d399" },
  { id: "ISP", name: "ISP", sttnTo: ["IISD", "BCME"],              color: "#ef4444", gradFrom: "#f87171" },
  { id: "FPC", name: "Fines → Pellet", sttnTo: ["PMRN","MOMG","GFMK","SSPL"], color: "#6366f1", gradFrom: "#818cf8" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function matchGroup(rakes: Rake[], sttnTo: string[], groupLabel: string, cmdtCodes: string[]) {
  return rakes.filter(
    (r) => {
      if (!sttnTo.includes(r.sttn_to ?? "")) return false;
      if (groupLabel === "Others") {
        return !["IMCL", "NMCL", "IORE", "IOST", "LST", "LSST"].includes(r.cmdt ?? "");
      }
      return cmdtCodes.includes(r.cmdt ?? "");
    }
  );
}

// ─── Rake detail table inside modal ─────────────────────────────────────────

export function RakeTable({ rows }: { rows: Rake[] }) {
  if (rows.length === 0)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No rakes found.
      </p>
    );

  const th = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";
  const td = "px-3 py-2 text-xs whitespace-nowrap";

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[55vh] rounded-lg border border-border custom-scrollbar">
      <table className="w-full min-w-[780px] text-sm">
        <thead className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border z-10">
          <tr>
            <th className={th}>LDNG TIME</th>
            <th className={th}>Rake Name</th>
            <th className={th}>STTN FROM</th>
            <th className={th}>STTN TO</th>
            <th className={th}>CMDT</th>
            <th className={th}>STTS</th>
            <th className={th}>Location</th>
            <th className={th}>Zone</th>
            <th className={th}>Division</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t border-border hover:bg-muted/40 transition-colors"
            >
              <td className={cn(td, "font-mono text-[11px]")}>{r.ldng_time ?? "—"}</td>
              <td className={cn(td, "font-semibold")}>{r.rake_name ?? "—"}</td>
              <td className={td}>{r.sttn_from ?? "—"}</td>
              <td className={td}>{r.sttn_to ?? "—"}</td>
              <td className={td}>{r.cmdt ?? "—"}</td>
              <td className={td}>
                <span className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold",
                  r.stts_code === 'PL' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                )}>
                  {r.stts_code ?? "—"}
                </span>
              </td>
              <td className={td}>{r.locn ?? "—"}</td>
              <td className={td}>{r.zone ?? "—"}</td>
              <td className={td}>{r.dvsn ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal shell ────────────────────────────────────────────────────────────

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl bg-card border border-border shadow-2xl animate-fade-in-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Plant detail modal (breakdown table + drill-down) ───────────────────────

function PlantDetailModal({
  plant,
  rakes,
  onClose,
}: {
  plant: Plant;
  rakes: Rake[];
  onClose: () => void;
}) {
  // drill: { groupLabel, rows }
  const [drill, setDrill] = useState<{
    label: string;
    rows: Rake[];
  } | null>(null);

  const breakdown = useMemo(
    () =>
      CMDT_GROUPS.map((g) => ({
        ...g,
        rows: matchGroup(rakes, plant.sttnTo, g.label, g.codes),
      })),
    [rakes, plant],
  );

  if (drill) {
    return (
      <Modal
        title={`${plant.name} — ${drill.label} (${drill.rows.length} rakes)`}
        onClose={() => setDrill(null)}
      >
        <button
          onClick={() => setDrill(null)}
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to {plant.name} summary
        </button>
        <RakeTable rows={drill.rows} />
      </Modal>
    );
  }

  return (
    <Modal title={`${plant.name} — Plant Summary`} onClose={onClose}>
      {/* STTN TO badges */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <span className="text-xs text-muted-foreground mr-1">STTN TO:</span>
        {plant.sttnTo.map((s) => (
          <span
            key={s}
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: `${plant.color}22`,
              color: plant.color,
              border: `1px solid ${plant.color}44`,
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Breakdown grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Rakes", rows: breakdown.flatMap((g) => g.rows) },
          ...breakdown,
        ].map((g) => (
          <div
            key={g.label}
            className={cn(
              "relative rounded-xl border p-4 transition-all flex flex-col gap-2",
              g.rows.length > 0
                ? "border-border bg-card shadow-sm"
                : "border-border/40 opacity-50"
            )}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center border-b border-border/50 pb-2">
              {g.label}
            </p>
            
            <div className="flex flex-col gap-1.5">
              {/* Total */}
              <button 
                disabled={g.rows.length === 0}
                onClick={() => setDrill({ label: `${g.label} - Total`, rows: g.rows })}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group disabled:cursor-not-allowed border border-transparent hover:border-border/50"
              >
                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase">Total</span>
                <span className="font-bold text-sm" style={{ color: g.rows.length > 0 ? plant.color : undefined }}>{g.rows.length}</span>
              </button>

              {/* In Transit */}
              <button 
                disabled={g.rows.filter(r => r.stts_code !== 'PL').length === 0}
                onClick={() => setDrill({ label: `${g.label} - In Transit`, rows: g.rows.filter(r => r.stts_code !== 'PL') })}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group disabled:cursor-not-allowed border border-transparent hover:border-border/50"
              >
                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase">In Transit</span>
                <span className="font-bold text-sm text-blue-500">{g.rows.filter(r => r.stts_code !== 'PL').length}</span>
              </button>

              {/* Unloading */}
              <button 
                disabled={g.rows.filter(r => r.stts_code === 'PL').length === 0}
                onClick={() => setDrill({ label: `${g.label} - Unloading`, rows: g.rows.filter(r => r.stts_code === 'PL') })}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group disabled:cursor-not-allowed border border-transparent hover:border-border/50"
              >
                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase">Unloading</span>
                <span className="font-bold text-sm text-red-500">{g.rows.filter(r => r.stts_code === 'PL').length}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        Total rakes for {plant.name}:
        <span className="font-bold text-foreground">
          {breakdown.reduce((s, g) => s + g.rows.length, 0)}
        </span>
      </div>
    </Modal>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function PlantSummary({ rakes }: { rakes: Rake[] }) {
  const [activePlant, setActivePlant] = useState<Plant | null>(null);

  // Pre-compute total per plant for the card display
  const plantTotals = useMemo(
    () =>
      PLANTS.map((p) => ({
        ...p,
        total: CMDT_GROUPS.reduce(
          (sum, g) => sum + matchGroup(rakes, p.sttnTo, g.label, g.codes).length,
          0,
        ),
      })),
    [rakes],
  );

  return (
    <>
      {/* Section header */}
      <div className="md-card p-5 mt-2 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Factory className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Plant Summary
          </h2>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plantTotals.map((p, index) => (
            <button
              key={p.id}
              onClick={() => setActivePlant(p)}
              className="group plant-kpi-card relative flex items-center justify-between rounded-2xl border border-border bg-card hover:bg-muted/30 transition-all p-5 shadow-sm hover:shadow-lg cursor-pointer min-h-[105px]"
              style={{
                "--plant-color": p.color,
                "--plant-glow-color": `${p.color}45`
              } as React.CSSProperties}
            >
              {/* Left Side: Option index */}
              <div className="flex flex-col items-start pr-4 border-r border-border/40 select-none">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  Plant
                </span>
                <span className="text-3xl font-extrabold tracking-tight text-muted-foreground/80 group-hover:text-primary transition-colors">
                  {`0${index + 1}`}
                </span>
              </div>

              {/* Vertical pill indicator bar */}
              <div 
                className="w-1.5 h-12 rounded-full mx-4 shrink-0 transition-transform group-hover:scale-y-110 duration-300"
                style={{ 
                  background: `linear-gradient(180deg, ${p.gradFrom}, ${p.color})`,
                  boxShadow: `0 2px 8px ${p.color}35`
                }}
              />

              {/* Icon / Info Section */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:rotate-12"
                  style={{ background: `${p.color}15`, color: p.color }}
                >
                  <Factory className="h-5 w-5" />
                </div>
                
                <div className="text-left min-w-0">
                  <h3 
                    className="text-sm font-black uppercase tracking-wider truncate"
                    style={{ color: p.color }}
                  >
                    {p.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-semibold truncate mt-0.5 leading-none">
                    SAIL Plant Logistics
                  </p>
                </div>
              </div>

              {/* Value display (Right) */}
              <div className="text-right shrink-0 ml-2">
                <span className="text-2xl font-black tabular-nums tracking-tight block leading-none" style={{ color: p.color }}>
                  {p.total}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider mt-1 block">
                  Rakes
                </span>
              </div>

              {/* Subtle chevron accent */}
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all ml-2 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Plant detail modal */}
      {activePlant && (
        <PlantDetailModal
          plant={activePlant}
          rakes={rakes}
          onClose={() => setActivePlant(null)}
        />
      )}
    </>
  );
}
