import { useRouterState } from "@tanstack/react-router";
import { Bell, Moon, Sun, Search, Settings2, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "./theme-provider";
import { useSnapshots } from "./snapshot-provider";
import { getApiBase, setApiBase } from "@/lib/api";

const titles: Record<string, string> = {
  "/": "Upload",
  "/comparison": "Comparison",
  "/daily": "Daily Summary",
  "/range": "Range Summary",
};

export function Topbar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { snapshots, selectedId } = useSnapshots();
  const qc = useQueryClient();
  const current = snapshots.find((s) => s.id === selectedId);
  const title = titles[path] ?? "Dashboard";

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(getApiBase());
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const save = () => {
    setApiBase(url);
    setSaved(true);
    qc.invalidateQueries();
    setTimeout(() => setSaved(false), 1200);
  };


  return (
    <header className="sticky top-4 z-20 mx-4 mb-4 flex items-center justify-between rounded-2xl bg-card/80 backdrop-blur px-4 py-3 shadow-md-soft">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          Pages / <span className="text-foreground/80">{title}</span>
        </p>
        <h1 className="text-base font-semibold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          {current ? (
            <span className="font-mono">{current.report_time}</span>
          ) : (
            <span>No snapshot</span>
          )}
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 hover:bg-accent transition-colors"
            aria-label="Backend settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-popover p-4 shadow-lg animate-in fade-in zoom-in-95">
              <p className="text-xs font-semibold mb-1">Backend API URL</p>
              <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                Browser can't reach <code>127.0.0.1</code> from this preview.
                Expose your FastAPI via ngrok / cloudflared and paste the public URL.
              </p>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxx.ngrok-free.app"
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={save}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition"
              >
                {saved ? <Check className="h-3.5 w-3.5" /> : null}
                {saved ? "Saved" : "Save & Reload Data"}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

