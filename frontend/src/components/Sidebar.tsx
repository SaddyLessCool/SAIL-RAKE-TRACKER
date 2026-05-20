import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  GitCompareArrows,
  CalendarDays,
  CalendarRange,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSnapshots } from "./snapshot-provider";
import { toast } from "sonner";
import { useTheme } from "./theme-provider";

const items = [
  { to: "/", label: "Upload", icon: LayoutDashboard },
  { to: "/comparison", label: "Comparison", icon: GitCompareArrows },
  { to: "/daily", label: "Daily Summary", icon: CalendarDays },
  { to: "/range", label: "Range Summary", icon: CalendarRange },
] as const;

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { snapshots, selectedId, setSelectedId } = useSnapshots();
  const [isHovered, setIsHovered] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      {/* Invisible Hover Trigger Zone */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-8 z-40"
        onMouseEnter={() => setIsHovered(true)}
      />

      {/* Slide-out Sidebar */}
      <aside 
        className={cn(
          "fixed top-4 h-[calc(100vh-2rem)] w-48 flex-col rounded-2xl bg-sidebar text-sidebar-foreground shadow-2xl overflow-hidden z-50 transition-transform duration-300 ease-in-out",
          isHovered ? "translate-x-4" : "-translate-x-[110%]"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center">
          <img src={theme === "dark" ? "/sail_logo_white.png" : "/sail_logo.png"} alt="SAIL Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">SAIL</p>
          <p className="text-[11px] uppercase tracking-wider opacity-70">
            Rake Tracker
          </p>
        </div>
      </div>

      <nav className="px-3 py-4 space-y-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = path === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md-soft"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 mb-2 flex items-center gap-2 px-5 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/60">
        <History className="h-3.5 w-3.5" />
        Snapshot history
      </div>
      <div className="mt-5 flex-1 overflow-y-auto px-3 pb-4 pt-2 space-y-1.5 custom-scrollbar">
        {snapshots.length === 0 && (
          <p className="px-3 py-2 text-xs opacity-60">No snapshots yet</p>
        )}
        {snapshots.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (s.id !== selectedId) {
                  setSelectedId(s.id);
                  toast.success(`Switched snapshot`, {
                    description: `Report time: ${s.report_time}`,
                    duration: 2500,
                  });
                }
              }}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2 text-xs transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60",
              )}
              title={s.report_time}
            >
              <p className="font-mono">{s.report_time}</p>
              {typeof s.total_rakes === "number" && (
                <p className="opacity-60 mt-0.5">{s.total_rakes} rakes</p>
              )}
            </button>
          );
        })}
      </div>
    </aside>
    </>
  );
}
