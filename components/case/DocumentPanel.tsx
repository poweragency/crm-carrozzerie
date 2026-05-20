"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { PhotoGallery } from "./PhotoGallery";
import { useConfirm } from "../ConfirmDialog";
import type { Document, DocumentPhase } from "@/types/database.types";

interface Props {
  caseId: string;
  documents: Document[];
  onChange: (next: Document[]) => void;
}

const PHASES: { key: DocumentPhase; label: string }[] = [
  { key: "preparazione", label: "Fotografia di Fine Preparazione" },
  { key: "verniciatura", label: "Fotografia di Fine Verniciatura" },
  { key: "finitura", label: "Fotografia di Fine Finitura" },
];

function isImage(d: Document): boolean {
  return d.mime_type?.startsWith("image/") ?? false;
}

export function DocumentPanel({ caseId, documents, onChange }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();
  const [uploadingPhase, setUploadingPhase] = useState<DocumentPhase | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(any-pointer: coarse)");
    setHasCamera(mq.matches);
    const onMatch = (e: MediaQueryListEvent) => setHasCamera(e.matches);
    mq.addEventListener("change", onMatch);
    return () => mq.removeEventListener("change", onMatch);
  }, []);

  const photos = useMemo(() => documents.filter(isImage), [documents]);
  const photosByPhase = useMemo(() => {
    const map: Record<DocumentPhase, Document[]> = {
      preparazione: [],
      verniciatura: [],
      finitura: [],
    };
    for (const p of photos) {
      const ph = (p.phase as DocumentPhase | null) ?? "preparazione";
      if (ph in map) map[ph].push(p);
    }
    return map;
  }, [photos]);

  async function uploadFiles(phase: DocumentPhase, inputFiles: File[]) {
    if (inputFiles.length === 0) return;
    setUploadingPhase(phase);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessione scaduta, ricarica la pagina");
        return;
      }
      const uploaded: Document[] = [];
      for (const raw of inputFiles) {
        const file = await compressImage(raw).catch(() => raw);
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${caseId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, file, { contentType: file.type });
        if (upErr) {
          toast.error(`Upload fallito: ${file.name}`, { description: upErr.message });
          continue;
        }
        const { data, error } = await supabase
          .from("documents")
          .insert({
            case_id: caseId,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
            phase,
          })
          .select()
          .single();
        if (error || !data) {
          toast.error(`Errore DB: ${file.name}`, { description: error?.message });
          continue;
        }
        uploaded.push(data);
      }
      if (uploaded.length > 0) {
        onChange([...uploaded, ...documents]);
        toast.success(
          uploaded.length === 1
            ? `${uploaded[0].file_name} caricato`
            : `${uploaded.length} foto caricate`
        );
      }
    } finally {
      setUploadingPhase(null);
    }
  }

  async function handleDelete(doc: Document) {
    const ok = await confirm({
      title: "Eliminare la foto?",
      description: doc.file_name,
      confirmLabel: "Elimina",
      variant: "danger",
    });
    if (!ok) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      toast.error("Eliminazione fallita", { description: error.message });
      return;
    }
    onChange(documents.filter((d) => d.id !== doc.id));
    toast.success("Foto eliminata");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
        <ImageIcon className="w-3.5 h-3.5" />
        Foto lavorazione
        <span className="text-text-subtle">({photos.length})</span>
      </div>

      <div className="rounded-md border border-border bg-bg-elevated divide-y divide-border">
        {PHASES.map((p) => (
          <PhaseZone
            key={p.key}
            phase={p.key}
            label={p.label}
            photos={photosByPhase[p.key]}
            uploading={uploadingPhase === p.key}
            hasCamera={hasCamera}
            onUpload={(files: File[]) => uploadFiles(p.key, files)}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

interface PhaseZoneProps {
  phase: DocumentPhase;
  label: string;
  photos: Document[];
  uploading: boolean;
  hasCamera: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (doc: Document) => Promise<void>;
}

function PhaseZone({
  label,
  photos,
  uploading,
  hasCamera,
  onUpload,
  onDelete,
}: PhaseZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm font-medium text-text-primary">
          {label}
          <span className="ml-2 text-text-subtle text-xs">({photos.length})</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={uploading || !hasCamera}
            className={cn(
              "py-1.5",
              hasCamera ? "btn-primary" : "btn-secondary opacity-50 cursor-not-allowed"
            )}
            type="button"
            title={
              hasCamera
                ? "Apri la fotocamera del dispositivo"
                : "Disponibile solo da tablet o smartphone"
            }
          >
            <Camera className="w-3.5 h-3.5" />
            {hasCamera
              ? uploading
                ? "..."
                : "Scatta foto"
              : "Scatta foto (solo da mobile)"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary py-1.5"
            type="button"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "..." : "Carica foto"}
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (cameraRef.current) cameraRef.current.value = "";
              onUpload(files);
            }}
            className="hidden"
          />
          <input
            ref={fileRef}
            type="file"
            multiple
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (fileRef.current) fileRef.current.value = "";
              onUpload(files);
            }}
            className="hidden"
            accept="image/*"
          />
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-xs text-text-subtle italic py-2">
          Nessuna foto caricata per questa fase.
        </div>
      ) : (
        <PhotoGallery photos={photos} onDelete={onDelete} />
      )}
    </div>
  );
}
