"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Trash2,
  ImageOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Document } from "@/types/database.types";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  photos: Document[];
  onDelete: (doc: Document) => Promise<void>;
}

const SIGNED_URL_TTL = 60 * 60; // 1 ora

export function PhotoGallery({ photos, onDelete }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrls((prev) => {
      const missing = photos.filter((p) => !prev[p.id]);
      if (missing.length === 0) return prev;

      Promise.all(
        missing.map(async (photo) => {
          const { data } = await supabase.storage
            .from("documents")
            .createSignedUrl(photo.file_path, SIGNED_URL_TTL);
          return [photo.id, data?.signedUrl] as const;
        })
      ).then((entries) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const [id, url] of entries) {
          if (url) next[id] = url;
        }
        if (Object.keys(next).length > 0) {
          setUrls((curr) => ({ ...curr, ...next }));
        }
      });

      return prev;
    });

    return () => {
      cancelled = true;
    };
  }, [photos, supabase]);

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)),
    [photos.length]
  );
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, prev, next]);

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="Nessuna foto"
        description="Carica le foto del danno per documentare la pratica."
      />
    );
  }

  const currentPhoto = openIndex !== null ? photos[openIndex] : null;
  const currentUrl = currentPhoto ? urls[currentPhoto.id] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo, idx) => {
          const url = urls[photo.id];
          return (
            <button
              key={photo.id}
              onClick={() => setOpenIndex(idx)}
              className="relative aspect-square overflow-hidden rounded-md bg-bg-hover border border-border hover:border-accent transition-colors group"
              type="button"
              title={photo.file_name}
            >
              {url ? (
                <Image
                  src={url}
                  alt={photo.file_name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-text-subtle text-[10px]">
                  ...
                </div>
              )}
            </button>
          );
        })}
      </div>

      {currentPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={close}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            aria-label="Chiudi"
          >
            <X className="w-6 h-6" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2"
                aria-label="Foto precedente"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2"
                aria-label="Foto successiva"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <div
            className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {currentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUrl}
                alt={currentPhoto.file_name}
                className="max-w-full max-h-[85vh] object-contain rounded"
              />
            ) : (
              <div className="text-white/60">Caricamento...</div>
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 rounded-lg px-4 py-2 text-white text-xs">
            <span className="truncate max-w-[200px]">{currentPhoto.file_name}</span>
            <span className="text-white/60">·</span>
            <span className="text-white/60">{formatDateTime(currentPhoto.created_at)}</span>
            {photos.length > 1 && (
              <>
                <span className="text-white/60">·</span>
                <span className="tabular-nums text-white/60">
                  {(openIndex ?? 0) + 1}/{photos.length}
                </span>
              </>
            )}
            <div className="w-px h-4 bg-white/20 mx-1" />
            {currentUrl && (
              <a
                href={currentUrl}
                download={currentPhoto.file_name}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-accent"
                title="Scarica"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await onDelete(currentPhoto);
                if (photos.length === 1) close();
                else if (openIndex === photos.length - 1) prev();
              }}
              className="hover:text-red-400"
              title="Elimina"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
