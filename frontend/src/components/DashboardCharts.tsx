import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Rake } from "@/lib/api";

interface DashboardChartsProps {
  rakes: Rake[];
}

export function DashboardCharts({ rakes }: DashboardChartsProps) {
  const [slicer, setSlicer] = useState<string>("All");

  // 1. Process Plant Data
  const plantData = useMemo(() => {
    const counts = {
      BSP: 0,
      DSP: 0,
      RSP: 0,
      BSL: 0,
      ISP: 0,
      FPC: 0,
    };

    rakes.forEach((r) => {
      const sttnTo = r.sttn_to || "";
      const cmdt = r.cmdt || "";
      
      let include = false;
      if (slicer === "All") include = true;
      else if (slicer === "IMCL/NMCL") include = ["IMCL", "NMCL"].includes(cmdt);
      else if (slicer === "IORE/IOST") include = ["IORE", "IOST"].includes(cmdt);
      else if (slicer === "LST/LSST") include = ["LST", "LSST"].includes(cmdt);
      else if (slicer === "Others") include = !["IMCL", "NMCL", "IORE", "IOST", "LST", "LSST"].includes(cmdt);

      if (!include) return;

      if (["BSPC", "MXA"].includes(sttnTo)) counts.BSP++;
      else if (["DSEY"].includes(sttnTo)) counts.DSP++;
      else if (["HSPG", "NHSB"].includes(sttnTo)) counts.RSP++;
      else if (["BSCS"].includes(sttnTo)) counts.BSL++;
      else if (["IISD", "BCME"].includes(sttnTo)) counts.ISP++;
      else if (["PMRN", "MOMG", "GFMK", "SSPL"].includes(sttnTo)) counts.FPC++;
    });

    const totalRakes = counts.BSP + counts.DSP + counts.RSP + counts.BSL + counts.ISP + counts.FPC;

    return {
      data: [
        { name: "BSP", count: counts.BSP },
        { name: "DSP", count: counts.DSP },
        { name: "RSP", count: counts.RSP },
        { name: "BSL", count: counts.BSL },
        { name: "ISP", count: counts.ISP },
        { name: "FPC", count: counts.FPC },
      ],
      total: totalRakes
    };
  }, [rakes, slicer]);

  return (
    <div className="mb-6 w-full">
      <ChartCard 
        title="Total Number of Rakes" 
        data={plantData.data} 
        total={plantData.total}
        subtitle="Current performance based on latest snapshot" 
        slicer={slicer}
        setSlicer={setSlicer}
      />
    </div>
  );
}

function ChartCard({ title, data, subtitle, total, slicer, setSlicer }: { title: string; data: any[]; subtitle?: string; total: number; slicer: string; setSlicer: (s: string) => void }) {
  return (
    <div className="md-card p-6 flex flex-col md:flex-row h-auto md:h-[400px] gap-8 items-center w-full mt-4">
      
      {/* Left side: Totals */}
      <div className="flex-shrink-0 w-full md:w-64 text-left border-r-0 md:border-r border-border/50 pr-4 md:py-8 self-start md:self-center">
        <h3 className="text-base font-bold text-foreground/90 mb-2">{title}</h3>
        <p className="text-6xl font-extrabold text-foreground tracking-tight mb-4">{total}</p>
        
        {/* Mock Badge to match template feel */}
        <div className="inline-flex items-center rounded-md bg-success/15 px-2 py-1 text-xs font-bold text-success mb-3">
          ↑ Active Data
        </div>
        
        <p className="text-sm text-muted-foreground mt-1">
          {subtitle}
        </p>
      </div>

      {/* Right side: Chart */}
      <div className="flex-1 w-full h-[300px] md:h-full flex flex-col">
        {/* Slicers */}
        <div className="flex flex-wrap gap-2 mb-4 justify-end">
          {["All", "IMCL/NMCL", "IORE/IOST", "LST/LSST", "Others"].map((s) => (
            <button
              key={s}
              onClick={() => setSlicer(s)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                slicer === s 
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
            barCategoryGap={20}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: "500" }}
              interval={0}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: "500" }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-border bg-popover p-3 shadow-md outline-none">
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                        {payload[0].payload.name}
                      </p>
                      <p className="text-lg font-extrabold text-primary">
                        Count : {payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
