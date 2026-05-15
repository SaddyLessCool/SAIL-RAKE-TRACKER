import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Loader2, FileSpreadsheet } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSnapshots } from "./snapshot-provider";

export function UploadZone() {
  const qc = useQueryClient();
  const { setSelectedId } = useSnapshots();
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const tId = toast.loading(`Uploading ${files.length} files...`);
    try {
      const res = await api.upload(files);
      toast.success("Snapshot uploaded successfully", { id: tId });
      qc.invalidateQueries();
      if (res?.snapshot_id) {
        setSelectedId(res.snapshot_id);
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed", { id: tId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx'));
      if (files.length === 0) {
        toast.error("Please drop valid Excel (.xlsx) files");
        return;
      }
      onUpload(files);
    }
  };

  return (
    <div className="mb-8 animate-fade-in-up">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Upload Snapshot</h2>
        <p className="text-sm text-muted-foreground">
          Drag and drop Excel snapshots to ingest into the analytics engine.
        </p>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative group border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center text-center",
          isDragActive 
            ? "border-primary bg-primary/5 scale-[1.01]" 
            : "border-border bg-card/40 hover:bg-card/60 hover:border-muted-foreground/30",
          uploading && "opacity-60 pointer-events-none"
        )}
      >
        <input
          type="file"
          multiple
          accept=".xlsx"
          className="absolute inset-0 opacity-0 cursor-pointer"
          ref={fileInputRef}
          onChange={(e) => onUpload(Array.from(e.target.files || []))}
        />

        <div className="h-16 w-16 rounded-2xl bg-background shadow-md-soft flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <CloudUpload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>

        <h3 className="text-lg font-bold text-foreground/90">
          {uploading ? "Processing Files..." : "Drop Excel files here"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          or browse from your device • multi-file supported
        </p>

        <button 
          disabled={uploading}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0f172a] dark:bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Browse files"}
        </button>
      </div>
    </div>
  );
}
