import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type SnapshotMeta } from "@/lib/api";

type Ctx = {
  snapshots: SnapshotMeta[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
};

const SnapshotCtx = createContext<Ctx>({
  snapshots: [],
  selectedId: null,
  setSelectedId: () => {},
  isLoading: false,
  error: null,
});

export function SnapshotProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["snapshots"],
    queryFn: api.snapshots,
    refetchInterval: 5 * 60 * 1000, // 5 min auto-refresh
    refetchOnWindowFocus: true,
  });

  const snapshots = data ?? [];

  useEffect(() => {
    if (!selectedId && snapshots.length > 0) {
      setSelectedId(snapshots[0].id);
    }
  }, [snapshots, selectedId]);

  return (
    <SnapshotCtx.Provider
      value={{
        snapshots,
        selectedId,
        setSelectedId,
        isLoading,
        error: (error as Error) ?? null,
      }}
    >
      {children}
    </SnapshotCtx.Provider>
  );
}

export const useSnapshots = () => useContext(SnapshotCtx);
