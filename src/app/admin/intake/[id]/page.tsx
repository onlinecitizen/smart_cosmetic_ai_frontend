"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog, ConfirmRequest } from "@/components/admin/catalogue/ConfirmDialog";
import { CatalogueNav, formatWhen } from "@/components/admin/catalogue/shared";
import { CandidateReview } from "@/components/admin/intake/CandidateReview";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert, ErrorState, Spinner } from "@/components/ui/States";
import { API_BASE, ApiError } from "@/lib/api";
import { AdminCategory, adminCatalogApi, adminError, formatBytes } from "@/lib/adminCatalog";
import {
  Batch,
  BATCH_STATUS_LABEL,
  Candidate,
  CANDIDATE_STATUS_LABEL,
  FileRole,
  IntakeFile,
  IntakeImage,
  intakeApi,
  isProcessing,
  issueCounts,
  PageText,
  ROLE_LABEL,
  showValue,
  SubmitResult,
} from "@/lib/intake";

const POLL_MS = 3000;
const FILE_STATUS: Record<IntakeFile["status"], string> = {
  QUEUED: "Waiting",
  PROCESSING: "Processing…",
  DONE: "Done",
  FAILED: "Failed",
};

function UploadPanel({ batch, onUploaded }: { batch: Batch; onUploaded: () => void }) {
  const [role, setRole] = useState<FileRole>("catalogue");
  const [messages, setMessages] = useState<{ name: string; ok: boolean; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const out: typeof messages = [];
    for (const file of Array.from(files)) {
      try {
        await intakeApi.upload(batch.id, file, role);
        out.push({ name: file.name, ok: true, text: "Uploaded and queued for processing." });
      } catch (err) {
        out.push({ name: file.name, ok: false, text: adminError(err, "Upload failed.") });
      }
    }
    setMessages(out);
    setBusy(false);
    if (input.current) input.current.value = "";
    onUploaded();
  }

  return (
    <section className="card space-y-3" aria-label="Upload documents">
      <h2 className="font-semibold text-brand-900">Add documents</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="label">What are you uploading?</span>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as FileRole)}>
            {(Object.keys(ROLE_LABEL) as FileRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <input
          ref={input}
          type="file"
          multiple
          aria-label="Choose files"
          accept={role === "photo" ? "image/jpeg,image/png,image/webp" : ".pdf,.csv,.xlsx,application/pdf,text/csv"}
          disabled={busy}
          onChange={(e) => upload(e.target.files)}
        />
        {busy && <Spinner label="Uploading" />}
      </div>
      <p className="text-xs text-brand-500">
        Files are processed in the background; you can leave this page. Price lists only add prices and stock to products found in
        the catalogue files; they never create products on their own.
      </p>
      {messages.length > 0 && (
        <ul className="space-y-1 text-sm" aria-live="polite">
          {messages.map((m, i) => (
            <li key={i} className={m.ok ? "text-emerald-800" : "text-red-700"} role={m.ok ? undefined : "alert"}>
              {m.name}: {m.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PagesView({ file, onClose }: { file: IntakeFile; onClose: () => void }) {
  const [pages, setPages] = useState<PageText[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    intakeApi.pages(file.id).then(setPages).catch((err) => setError(adminError(err, "Could not load the extracted text.")));
  }, [file.id]);
  return (
    <section className="card space-y-2" aria-label={`Text read from ${file.original_filename}`}>
      <div className="flex justify-between">
        <h3 className="font-semibold text-brand-900">Text read from {file.original_filename}</h3>
        <button type="button" className="underline text-sm" onClick={onClose}>
          Close
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {!pages && !error && <Spinner label="Loading text" />}
      {pages?.map((p) => (
        <details key={p.page} className="rounded-lg bg-brand-50 p-2 text-sm" open={p.status !== "ok"}>
          <summary>
            {file.kind === "xlsx" ? "Sheet" : "Page"} {p.page} · {p.method === "ocr" ? "read by OCR" : p.method}
            {p.ocr_confidence != null && ` (reading confidence ${Math.round(p.ocr_confidence * 100)}%)`}
            {p.status === "unreadable" && <span className="ml-2 font-semibold text-red-700">unreadable</span>}
          </summary>
          {p.note && <p className="text-amber-900">{p.note}</p>}
          <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap text-xs">{p.text || "(no text)"}</pre>
        </details>
      ))}
    </section>
  );
}

function Workspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [images, setImages] = useState<IntakeImage[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Candidate["status"] | "">("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [results, setResults] = useState<SubmitResult[] | null>(null);
  const [pagesFor, setPagesFor] = useState<IntakeFile | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await intakeApi.batch(id);
      setBatch(b);
      if (!isProcessing(b)) {
        const [c, i] = await Promise.all([intakeApi.candidates(id), intakeApi.images(id)]);
        setCandidates(c);
        setImages(i);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "This import doesn’t exist." : adminError(err, "Could not load the import."));
    }
  }, [id]);

  useEffect(() => {
    load();
    adminCatalogApi.categories().then(setCategories).catch(() => setCategories([]));
  }, [load]);

  // While files are waiting or processing, check progress every few seconds.
  const processing = batch ? isProcessing(batch) : false;
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [processing, load]);

  async function retry(f: IntakeFile) {
    try {
      await intakeApi.retryFile(f.id);
      load();
    } catch (err) {
      setNotice(adminError(err, "Could not retry the file."));
    }
  }

  function submit() {
    const confirmed = candidates.filter((c) => c.status === "CONFIRMED");
    setConfirmReq({
      title: `Submit ${confirmed.length} confirmed draft(s) for approval?`,
      body:
        "They are added to the catalogue as products waiting for review, with every extracted detail recorded as an unverified source. " +
        "Nothing is published: an admin still checks and publishes each product.",
      confirmLabel: "Submit for approval",
      onConfirm: async () => {
        try {
          const res = await intakeApi.submit(id);
          setResults(res.results);
          await load();
        } catch (err) {
          throw new Error(adminError(err, "Could not submit the drafts."));
        }
      },
    });
  }

  function remove() {
    setConfirmReq({
      title: "Delete this import?",
      body:
        "The uploaded files, the text read from them and all drafts that were not submitted are deleted permanently. " +
        "Products already submitted to the catalogue are kept.",
      confirmLabel: "Delete import",
      danger: true,
      onConfirm: async () => {
        try {
          await intakeApi.deleteBatch(id);
        } catch (err) {
          throw new Error(adminError(err, "Could not delete the import."));
        }
        router.push("/admin/intake");
      },
    });
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!batch) return <Spinner label="Loading the import" />;

  const shown = filter ? candidates.filter((c) => c.status === filter) : candidates;
  const current = candidates.find((c) => c.id === selected) ?? null;
  const confirmedCount = candidates.filter((c) => c.status === "CONFIRMED").length;
  const unmatched = batch.unmatched_price_rows ?? [];

  return (
    <div className="container-page space-y-6">
      <CatalogueNav />
      <header className="space-y-1">
        <p className="text-xs text-brand-500">
          <Link href="/admin/intake" className="underline">
            Imports
          </Link>{" "}
          › {batch.name}
        </p>
        <h1 className="display text-3xl">{batch.name}</h1>
        <p className="text-sm text-brand-600">
          {BATCH_STATUS_LABEL[batch.status]} · {batch.retailer ? `for ${batch.retailer.name}` : "no shop chosen (product details only)"}
        </p>
      </header>
      {notice && <Alert tone="error">{notice}</Alert>}

      {batch.status !== "SUBMITTED" && <UploadPanel batch={batch} onUploaded={load} />}

      <section className="card overflow-x-auto" aria-label="Files">
        <h2 className="mb-2 font-semibold text-brand-900">Files</h2>
        {processing && (
          <p className="mb-2 text-sm text-brand-600" role="status">
            <Spinner label="Processing" /> Processing in the background. This page checks progress every few seconds.
          </p>
        )}
        {(batch.files ?? []).length === 0 ? (
          <p className="text-sm text-brand-600">No files yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-brand-500">
                <th className="py-2 pr-3">File</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Read</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(batch.files ?? []).map((f) => (
                <tr key={f.id} className="border-b border-brand-50 align-top">
                  <td className="py-2 pr-3">
                    {f.original_filename}
                    <span className="block text-xs text-brand-500">
                      {ROLE_LABEL[f.role]} · {f.kind.toUpperCase()} · {formatBytes(f.byte_size)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={f.status === "FAILED" ? "font-semibold text-red-700" : ""}>{FILE_STATUS[f.status]}</span>
                    {f.attempts > 1 && <span className="block text-xs text-brand-500">attempt {f.attempts} of {f.max_attempts}</span>}
                    {f.error && <span className="block text-xs text-red-700">{f.error}</span>}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {f.status === "DONE" && (
                      <>
                        {f.page_count != null && `${f.page_count} ${f.kind === "xlsx" ? "sheet(s)" : "page(s)"} · `}
                        {f.records} item(s) found
                        {f.pages_ocr > 0 && <span className="block">{f.pages_ocr} read by OCR</span>}
                        {f.pages_unreadable > 0 && <span className="block font-semibold text-red-700">{f.pages_unreadable} unreadable</span>}
                      </>
                    )}
                    {f.warnings.length > 0 && (
                      <details className="mt-1">
                        <summary className="text-amber-900">{f.warnings.length} note(s)</summary>
                        <ul className="ml-4 list-disc">
                          {f.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                  <td className="space-x-3 whitespace-nowrap py-2 text-xs">
                    {f.status === "FAILED" && (
                      <button type="button" className="underline" onClick={() => retry(f)}>
                        Retry
                      </button>
                    )}
                    {f.status === "DONE" && (
                      <button type="button" className="underline" onClick={() => setPagesFor(f)}>
                        View text
                      </button>
                    )}
                    <a className="underline" href={`${API_BASE}${intakeApi.originalUrl(f.id)}`}>
                      Download original
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {pagesFor && <PagesView file={pagesFor} onClose={() => setPagesFor(null)} />}

      {unmatched.length > 0 && (
        <section className="card text-sm" aria-label="Unmatched price rows">
          <h2 className="font-semibold text-amber-900">{unmatched.length} price row(s) didn’t match any product</h2>
          <p className="text-xs text-brand-500">They were not used. Price lists never create products.</p>
          <ul className="ml-5 mt-1 list-disc text-xs">
            {unmatched.slice(0, 20).map((u, i) => (
              <li key={i}>
                {u.file}
                {u.row != null ? `, row ${u.row}` : u.page != null ? `, page ${u.page}` : ""}: {u.snippet}
              </li>
            ))}
          </ul>
        </section>
      )}

      {results && (
        <section className="card space-y-1 text-sm" aria-label="Submit results" role="status">
          <h2 className="font-semibold text-brand-900">Submitted for approval</h2>
          {results.map((r) => {
            const c = candidates.find((x) => x.id === r.candidate_id);
            const name = showValue(c?.fields.name?.value) || "Draft";
            return (
              <p key={r.candidate_id} className={r.ok ? "text-emerald-800" : "text-red-700"}>
                {name}:{" "}
                {r.ok ? (
                  <>
                    waiting for review.{" "}
                    <Link href={`/admin/catalogue/${r.identity_id}?tab=review`} className="underline">
                      Open
                    </Link>
                    {r.notes.length > 0 && <span className="text-amber-900"> ({r.notes.join(" ")})</span>}
                  </>
                ) : (
                  r.error
                )}
              </p>
            );
          })}
        </section>
      )}

      {!processing && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" aria-label="Drafts">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-brand-900">Extracted products ({candidates.length})</h2>
              <select
                aria-label="Show drafts"
                className="input w-auto"
                value={filter}
                onChange={(e) => setFilter(e.target.value as Candidate["status"] | "")}
              >
                <option value="">All</option>
                {(Object.keys(CANDIDATE_STATUS_LABEL) as Candidate["status"][]).map((s) => (
                  <option key={s} value={s}>
                    {CANDIDATE_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            {candidates.length === 0 ? (
              <p className="text-sm text-brand-600">
                {(batch.files ?? []).length ? "No products were found in these files. View the text read from each file to see why." : "Upload files to start."}
              </p>
            ) : (
              <ul className="space-y-2">
                {shown.map((c) => {
                  const n = issueCounts(c.issues);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-current={c.id === selected ? "true" : undefined}
                        onClick={() => setSelected(c.id)}
                        className={`card w-full text-left text-sm ${c.id === selected ? "ring-2 ring-brand-600" : ""}`}
                      >
                        <span className="block font-semibold text-brand-900">{showValue(c.fields.name?.value) || "(name in conflict)"}</span>
                        <span className="block text-xs text-brand-500">
                          {[showValue(c.fields.brand?.value), showValue(c.fields.size_label?.value)].filter(Boolean).join(" · ") || "no brand or size"}
                        </span>
                        <span className="mt-1 block text-xs">
                          {CANDIDATE_STATUS_LABEL[c.status]}
                          {n.blockers > 0 && <span className="ml-2 text-red-700">{n.blockers} to fix</span>}
                          {n.warnings > 0 && <span className="ml-2 text-amber-900">{n.warnings} to check</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="card space-y-2 text-sm">
              <button type="button" className="btn-primary w-full" disabled={confirmedCount === 0} onClick={submit}>
                Submit {confirmedCount} confirmed for approval
              </button>
              <p className="text-xs text-brand-500">Submitted products wait in the review queue; nothing is published from here.</p>
              <button type="button" className="text-xs text-red-700 underline" onClick={remove}>
                Delete this import
              </button>
            </div>
          </div>
          <div>
            {current ? (
              <CandidateReview
                candidate={current}
                categories={categories}
                images={images}
                confirm={setConfirmReq}
                onSaved={(c) => setCandidates((list) => list.map((x) => (x.id === c.id ? c : x)))}
              />
            ) : (
              candidates.length > 0 && <p className="text-sm text-brand-600">Choose a product on the left to review its details.</p>
            )}
          </div>
        </section>
      )}
      <ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}

export default function IntakeWorkspacePage() {
  return (
    <RequireAuth adminOnly>
      <Workspace />
    </RequireAuth>
  );
}
