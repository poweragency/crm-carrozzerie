"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, ImageIcon, Trash2, Download, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, cn } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { PhotoGallery } from "./PhotoGallery";
import { useConfirm } from "../ConfirmDialog";
import type { Document } from "@/types/database.types";

interface Props {
  caseId: string;
  documents: Document[];
  onChange: (next: Document[]) => void;
}

function isImage(d: Document): boolean {
  return d.mime_type?.startsWith("image/") ?? false;
}

export function DocumentPanel({ caseId, documents, onChange }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(any-pointer: coarse)");
    setHasCamera(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setHasCamera(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const photos = useMemo(() => documents.filter(isImage), [documents]);
  const files = useMemo(() => documents.filter((d) => !isImage(d)), [documents]);

  async function uploadFiles(inputFiles: FileList | null) {
    if (!inputFiles || inputFiles.length === 0) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessione scaduta, ricarica la pagina");
        return;
      }
      const uploaded: Document[] = [];
      for (const raw of Array.from(inputFiles)) {
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
            : `${uploaded.length} file caricati`
        );
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  async function handleDelete(doc: Document) {
    const ok = await confirm({
      title: "Eliminare il file?",
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
    toast.success("File eliminato");
  }

  async function handleDownload(doc: Document) {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
          <ImageIcon className="w-3.5 h-3.5" />
          Foto danni
          <span className="text-text-subtle">({photos.length})</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={uploading || !hasCamera}
            className={cn(
              "py-1.5",
              hasCamera
                ? "btn-primary"
                : "btn-secondary opacity-50 cursor-not-allowed"
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
            Carica file
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => uploadFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={fileRef}
            type="file"
            multiple
            onChange={(e) => uploadFiles(e.target.files)}
            className="hidden"
            accept="image/*,application/pdf"
          />
        </div>
      </div>

      <PhotoGallery photos={photos} onDelete={handleDelete} />

      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
          <FileText className="w-3.5 h-3.5" />
          Altri documenti
          <span className="text-text-subtle">({files.length})</span>
        </div>
        {files.length === 0 ? (
          <div className="text-center text-xs text-text-subtle py-4">
            Nessun PDF allegato.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-2.5 rounded-md bg-bg-hover/50 border border-border hover:bg-bg-hover transition-colors"
              >
                <div className="w-9 h-9 rounded bg-bg-card flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate" title={d.file_name}>
                    {d.file_name}
                  </div>
                  <div className="text-[10px] text-text-subtle">
                    {d.file_size ? `${Math.round(d.file_size / 1024)} KB` : ""} ·{" "}
                    {formatDateTime(d.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(d)}
                  className="text-text-subtle hover:text-text"
                  title="Scarica"
                  type="button"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(d)}
                  className="text-text-subtle hover:text-red-400"
                  title="Elimina"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
