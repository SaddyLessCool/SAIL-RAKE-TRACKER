// API client for SAIL Rake Tracker FastAPI backend
const DEFAULT_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const LS_KEY = "sail_api_base";

export function getApiBase(): string {
  if (typeof window === "undefined") return DEFAULT_BASE;
  return (
    (window as any).__SAIL_API__ ||
    window.localStorage.getItem(LS_KEY) ||
    DEFAULT_BASE
  );
}

export function setApiBase(url: string) {
  if (typeof window === "undefined") return;
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed) window.localStorage.setItem(LS_KEY, trimmed);
  else window.localStorage.removeItem(LS_KEY);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const token = import.meta.env.VITE_API_SECRET_TOKEN || "sail_secure_token_2026";
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: { 
        Accept: "application/json", 
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}) 
      },
    });
  } catch (e: any) {
    throw new Error(
      `Cannot reach backend at ${base}. The browser blocked the request (network error / CORS / mixed content). ` +
        `If your FastAPI is running locally, expose it via ngrok/cloudflared and set the URL in Settings.`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type SnapshotMeta = {
  id: string;
  report_time: string;
  created_at?: string;
  file_names?: string[];
  total_rakes?: number;
  stabled_count?: number;
  [k: string]: any;
};

export type Rake = {
  rake_name: string;
  locn?: string;
  stts_code: string;
  stts_time?: string;
  load_type?: string;
  cmdt?: string;
  cnsr?: string;
  cnsg?: string;
  sttn_from?: string;
  sttn_to?: string;
  is_stabled?: boolean;
  is_idle_3hrs?: boolean;
  is_transit_delayed?: boolean;
  is_loading_delayed?: boolean;
  is_unloading_delayed?: boolean;
  stabled_hours?: number | null;
  transit_delayed_hours?: number | null;
  loading_delayed_hours?: number | null;
  unloading_delayed_hours?: number | null;
  expd_arvltime?: string;
  ldng_time?: string;
  [k: string]: any;
};

export type SnapshotDetail = {
  snapshot: SnapshotMeta;
  records: Rake[];
  total_records: number;
  [k: string]: any;
};

export type CompareResult = {
  still_stabled: any[];
  new_stabled: any[];
  moved: any[];
  still_stabled_count?: number;
  new_stabled_count?: number;
  moved_count?: number;
  [k: string]: any;
};

export type DailySummary = {
  date?: string;
  total_rakes?: number;
  total_movements?: number;
  total_duration_hours?: number;
  still_stabled_rakes?: Array<{
    rake_name: string;
    locn?: string;
    duration_hours?: number;
  }>;
  idle_count?: number;
  idle_rakes?: Array<{
    rake_name: string;
    locn?: string;
    duration_hours?: number;
  }>;
  [k: string]: any;
};

export type RangeSummary = {
  start_date?: string;
  end_date?: string;
  total_rakes?: number;
  total_duration_hours?: number;
  location_summary?: Array<{ locn: string; count?: number; rakes?: string[] }>;
  idle_over_3hrs?: Array<{ rake_name: string; locn?: string; duration_hours: number }>;
  [k: string]: any;
};

export type EventRow = {
  rake_name: string;
  locn?: string;
  status?: "OPEN" | "CLOSED" | string;
  entered_at?: string;
  exited_at?: string;
  duration_hours?: number | null;
  [k: string]: any;
};

export const api = {
  health: () => req<any>("/"),
  snapshots: () => req<{ snapshots: SnapshotMeta[] }>("/snapshots").then((r) => r.snapshots),
  snapshot: (id: string) => req<SnapshotDetail>(`/snapshot/${id}`),
  compare: (id: string) => req<CompareResult>(`/compare?snapshot_id=${id}`),
  daily: () => req<DailySummary>("/daily-summary"),
  range: (params?: {
    range_type?: "7d" | "15d" | "1m";
    start?: string;
    end?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.range_type) qs.set("range_type", params.range_type);
    if (params?.start) qs.set("start", params.start);
    if (params?.end) qs.set("end", params.end);
    const q = qs.toString();
    return req<RangeSummary>(`/range-summary${q ? `?${q}` : ""}`);
  },
  events: (params?: { rake_name?: string; status?: string; locn?: string }) => {
    const qs = new URLSearchParams();
    if (params?.rake_name) qs.set("rake_name", params.rake_name);
    if (params?.status) qs.set("status", params.status);
    if (params?.locn) qs.set("locn", params.locn);
    const q = qs.toString();
    return req<EventRow[]>(`/events${q ? `?${q}` : ""}`);
  },
  upload: async (files: File[]) => {
    const base = getApiBase();
    const token = import.meta.env.VITE_API_SECRET_TOKEN || "sail_secure_token_2026";
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await fetch(`${base}/upload`, { 
      method: "POST", 
      body: fd,
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });
    if (!res.ok) throw new Error(`Upload ${res.status}: ${await res.text()}`);
    return res.json();
  },
  chat: (message: string) => req<{ response: string }>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  }).then(r => r.response),
};
