import { useMemo } from "react";
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
  // 1. Process Location Data
  const locationData = useMemo(() => {
    const map: Record<string, number> = {};
    rakes.forEach((r) => {
      const loc = r.locn || "Unknown";
      const hours = r.stabled_hours || 0;
      map[loc] = (map[loc] || 0) + hours;
    });

    return Object.entries(map)
      .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [rakes]);

  // 2. Process Top Stabled Rakes
  const topRakesData = useMemo(() => {
    return [...rakes]
      .sort((a, b) => (b.stabled_hours || 0) - (a.stabled_hours || 0))
      .slice(0, 12)
      .map((r) => ({
        name: r.rake_name,
        hours: Number((r.stabled_hours || 0).toFixed(1)),
      }));
  }, [rakes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <ChartCard title="Location-wise Duration (hours)" data={locationData} />
      <ChartCard title="Top stabled rakes (hours)" data={topRakesData} />
    </div>
  );
}

function ChartCard({ title, data, subtitle }: { title: string; data: any[]; subtitle?: string }) {
  return (
    <div className="md-card p-0 flex flex-col h-[350px] overflow-visible mt-10">
      {/* Floating Chart Header */}
      <div className="mx-4 -mt-6 h-72 rounded-xl bg-gradient-to-br from-[#42a5f5] to-[#1976d2] shadow-lg flex flex-col p-4 pb-0">
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -30, bottom: 40 }}
              barCategoryGap={10}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.2)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 8, fill: "rgba(255,255,255,0.9)", fontWeight: "bold" }}
                interval={0}
                angle={-35}
                textAnchor="end"
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.9)", fontWeight: "bold" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-popover p-2 shadow-md outline-none">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">
                          {payload[0].payload.name}
                        </p>
                        <p className="text-sm font-bold text-primary">
                          hours : {payload[0].value}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="hours"
                fill="#ffffff"
                radius={[4, 4, 4, 4]}
                barSize={6}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-5 py-4">
        <h3 className="text-base font-bold text-foreground/90">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {subtitle || "Current performance based on latest snapshot"}
        </p>
      </div>
    </div>
  );
}
