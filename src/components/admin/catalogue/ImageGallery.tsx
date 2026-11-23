"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/api";
import {
  adminCatalogApi,
  adminError,
  AdminImage,
  formatBytes,
  IMAGE_SOURCES,
  imageFileError,
  moveItem,
} from "@/lib/adminCatalog";
import { ConfirmRequest } from "./ConfirmDialog";

const SOURCE_LABEL = Object.fromEntries(IMAGE_SOURCES.map((s) => [s.code, s.label]));

/** Local preview of a chosen file. The object URL is released when it changes. */
function usePreview(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== "function") {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function UploadForm({
  identityId,
  disabled,
  onDone,
}: {
  identityId: string;
  disabled: boolean;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [reference, setReference] = useState("");
  const [alt, setAlt] = useState("");
  const [licence, setLicence] = useState("");
  const [primary, setPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = usePreview(file);

  function choose(f: File | null) {
    setError(f ? imageFileError(f) : null);
    setFile(f && !imageFileError(f) ? f : null);
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a photo first.");
    if (!source) return setError("Say where the photo comes from.");
    const form = new FormData();
    form.set("file", file);
    form.set("source_type", source);
    if (reference.trim()) form.set("source_reference", reference.trim());
    if (alt.trim()) form.set("alt_text", alt.trim());
    if (licence.trim()) form.set("licence_note", licence.trim());
    form.set("is_primary", String(primary));
    setBusy(true);
    setError(null);
    try {
      await adminCatalogApi.uploadImage(identityId, form);
      setFile(null);
      setReference("");
      setAlt("");
      setLicence("");
      setPrimary(false);
      if (inputRef.current) inputRef.current.value = "";
      onDone();
    } catch (err) {
      setError(adminError(err, "The photo could not be uploaded."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={upload} className="card space-y-3" aria-label="Upload a photo">
      <h3 className="font-semibold text-brand-900">Add a photo</h3>
      <p className="text-xs text-brand-500">
        JPEG, PNG or WebP, up to 5 MB, at least 200×200 pixels. Only photos of the product or its packaging, which you
        are allowed to use. Location and camera data are removed from the file on upload.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Photo file"
        disabled={disabled || busy}
        onChange={(e) => choose(e.target.files?.[0] ?? null)}
      />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Preview of the selected photo" className="h-40 w-40 rounded-lg border object-contain" />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="label">Source *</span>
          <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Choose…</option>
            {IMAGE_SOURCES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="label">Source reference</span>
          <input className="input" value={reference} maxLength={500} onChange={(e) => setReference(e.target.value)} placeholder="e.g. email from the shop, date" />
        </label>
        <label className="block text-sm">
          <span className="label">Description for screen readers</span>
          <input className="input" value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Front of the 50 mL jar" />
        </label>
        <label className="block text-sm">
          <span className="label">Permission / licence note</span>
          <input className="input" value={licence} maxLength={300} onChange={(e) => setLicence(e.target.value)} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Make this the main photo
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={disabled || busy || !file}>
        {busy ? "Uploading…" : "Upload photo"}
      </button>
    </form>
  );
}

/**
 * The product's photo gallery. Order changes are saved in one request; a
 * replacement is validated by the server before the old file is removed.
 */
export function ImageGallery({
  identityId,
  images,
  uploadsEnabled,
  locked,
  onChanged,
  confirm,
}: {
  identityId: string;
  images: AdminImage[];
  uploadsEnabled: boolean;
  locked: boolean;
  onChanged: () => void;
  confirm: (r: ConfirmRequest) => void;
}) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [order, setOrder] = useState(sorted.map((i) => i.id));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = sorted.map((i) => `${i.id}:${i.position}:${i.sha256}`).join("|");
  useEffect(() => setOrder(sorted.map((i) => i.id)), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = Object.fromEntries(images.map((i) => [i.id, i]));
  const orderChanged = order.join() !== sorted.map((i) => i.id).join();

  async function run(id: string, fn: () => Promise<unknown>, failure: string) {
    setBusy(id);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(adminError(err, failure));
    } finally {
      setBusy(null);
    }
  }

  function replace(img: AdminImage, file: File | undefined) {
    if (!file) return;
    const invalid = imageFileError(file);
    if (invalid) return setError(invalid);
    confirm({
      title: "Replace this photo?",
      body: `The current file (${formatBytes(img.byte_size)}) will be replaced by “${file.name}”. Its place in the gallery, description and source stay the same. If the new file is refused, the current photo is kept.`,
      confirmLabel: "Replace photo",
      onConfirm: async () => {
        const form = new FormData();
        form.set("file", file);
        try {
          await adminCatalogApi.replaceImage(img.id, form);
        } catch (err) {
          throw new Error(adminError(err, "The photo could not be replaced."));
        }
        onChanged();
      },
    });
  }

  function remove(img: AdminImage) {
    confirm({
      title: "Delete this photo?",
      body: img.storage_backend === "uploaded"
        ? "The photo and its file are deleted. This can’t be undone; you would need to upload it again."
        : "The photo record is removed. The external file is not touched.",
      confirmLabel: "Delete photo",
      danger: true,
      onConfirm: async () => {
        try {
          await adminCatalogApi.deleteImage(img.id);
        } catch (err) {
          throw new Error(adminError(err, "The photo could not be deleted."));
        }
        onChanged();
      },
    });
  }

  return (
    <div className="space-y-4">
      {!uploadsEnabled && (
        <p className="alert alert-warning text-sm" role="status">
          Photo uploads are switched off on this server until persistent storage is configured (PRODUCT_IMAGE_DIR).
        </p>
      )}
      {locked && <p className="text-sm text-brand-600">This product is archived. Restore it to change its photos.</p>}
      {images.length === 0 ? (
        <p className="text-sm text-brand-600">No photos yet. Customers see a placeholder.</p>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Photos in display order">
          {order.map((id, index) => {
            const img = byId[id];
            if (!img) return null;
            const src = mediaUrl(img.url);
            return (
              <li key={id} className="card space-y-2 text-xs">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={img.alt_text ?? "Product photo"} className="h-40 w-full rounded-lg object-contain" />
                ) : (
                  <div className="grid h-40 place-items-center rounded-lg bg-brand-50">No file</div>
                )}
                <p className="font-semibold text-brand-900">
                  {index + 1}. {img.is_primary ? "Main photo" : "Gallery photo"}
                </p>
                <p className="text-brand-600">
                  {SOURCE_LABEL[img.source_type] ?? img.source_type}
                  {img.source_reference ? ` — ${img.source_reference}` : ""}
                </p>
                <p className="text-brand-500">
                  {img.width && img.height ? `${img.width}×${img.height}, ` : ""}
                  {formatBytes(img.byte_size)}
                </p>
                {!img.alt_text && <p className="text-amber-900">No description for screen readers.</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="underline"
                    aria-label={`Move photo ${index + 1} earlier`}
                    disabled={locked || index === 0}
                    onClick={() => setOrder((o) => moveItem(o, index, index - 1))}
                  >
                    ↑ Earlier
                  </button>
                  <button
                    type="button"
                    className="underline"
                    aria-label={`Move photo ${index + 1} later`}
                    disabled={locked || index === order.length - 1}
                    onClick={() => setOrder((o) => moveItem(o, index, index + 1))}
                  >
                    ↓ Later
                  </button>
                  {!img.is_primary && (
                    <button
                      type="button"
                      className="underline"
                      disabled={locked || busy === img.id}
                      onClick={() =>
                        run(img.id, () => adminCatalogApi.updateImage(img.id, { is_primary: true }), "Could not change the main photo.")
                      }
                    >
                      Make main
                    </button>
                  )}
                  {img.storage_backend === "uploaded" && uploadsEnabled && (
                    <label className={`underline ${locked ? "opacity-50" : "cursor-pointer"}`}>
                      Replace…
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={locked}
                        aria-label={`Replace photo ${index + 1}`}
                        onChange={(e) => {
                          replace(img, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  <button type="button" className="text-red-700 underline" disabled={locked} onClick={() => remove(img)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {orderChanged && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className="btn-primary"
            disabled={busy === "order"}
            onClick={() => run("order", () => adminCatalogApi.reorderImages(identityId, order), "Could not save the order.")}
          >
            Save photo order
          </button>
          <button type="button" className="underline" onClick={() => setOrder(sorted.map((i) => i.id))}>
            Undo
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {uploadsEnabled && !locked && <UploadForm identityId={identityId} disabled={images.length >= 12} onDone={onChanged} />}
      {images.length >= 12 && <p className="text-sm text-brand-600">A product can have at most 12 photos.</p>}
    </div>
  );
}
