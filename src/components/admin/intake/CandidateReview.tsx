"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmRequest } from "@/components/admin/catalogue/ConfirmDialog";
import { useUnsavedChangesWarning } from "@/components/admin/catalogue/shared";
import { mediaUrl } from "@/lib/api";
import { adminError, AdminCategory, isStale } from "@/lib/adminCatalog";
import {
  Candidate,
  CANDIDATE_STATUS_LABEL,
  changedFieldValues,
  confidenceText,
  INTAKE_FIELDS,
  IntakeApi,
  IntakeImage,
  intakeApi as adminIntakeApi,
  methodLabel,
  showValue,
  whereFound,
} from "@/lib/intake";

function FieldRow({
  field,
  candidate,
  draft,
  onDraft,
  locked,
}: {
  field: (typeof INTAKE_FIELDS)[number];
  candidate: Candidate;
  draft: string | undefined;
  onDraft: (v: string) => void;
  locked: boolean;
}) {
  const entry = candidate.fields[field.key];
  const value = draft ?? showValue(entry?.value);
  const [open, setOpen] = useState(false);
  const status = entry?.status ?? "missing";
  const id = `field-${field.key}`;
  const badge: Record<string, string> = {
    found: "text-emerald-800",
    edited: "text-brand-700",
    conflict: "text-red-700 font-semibold",
    invalid: "text-amber-900",
    missing: "text-brand-500",
  };
  const statusText: Record<string, string> = {
    found: "Found",
    edited: `Edited${entry?.edited_by ? ` by ${entry.edited_by}` : ""}`,
    conflict: "Conflict — choose",
    invalid: "Found but not valid",
    missing: "Not found",
  };
  return (
    <div className="border-b border-brand-50 py-3" data-field={field.key}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-brand-900">
          {field.label}
          {field.listing && <span className="ml-2 text-xs font-normal text-brand-500">shop data</span>}
        </label>
        <span className={`text-xs ${badge[status] ?? ""}`}>{statusText[status] ?? status}</span>
      </div>
      {status === "conflict" && draft === undefined && (
        <div role="radiogroup" aria-label={`Values found for ${field.label}`} className="mt-1 flex flex-wrap gap-2">
          {(entry?.alternatives ?? []).map((alt) => (
            <button key={String(alt)} type="button" className="chip" disabled={locked} onClick={() => onDraft(showValue(alt))}>
              Use “{showValue(alt)}”
            </button>
          ))}
        </div>
      )}
      {field.long ? (
        <textarea id={id} className="input mt-1 min-h-[4.5rem]" value={value} disabled={locked} onChange={(e) => onDraft(e.target.value)} />
      ) : (
        <input id={id} className="input mt-1" value={value} disabled={locked} onChange={(e) => onDraft(e.target.value)} />
      )}
      {(entry?.evidence?.length ?? 0) > 0 && (
        <div className="mt-1 text-xs text-brand-600">
          <button type="button" className="underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : "Show"} source{entry!.evidence.length > 1 ? `s (${entry!.evidence.length})` : ""}
          </button>
          {!open && (
            <span className="ml-2">
              {whereFound(entry!.evidence[0])} · {methodLabel(entry!.evidence[0].method)}
            </span>
          )}
          {open && (
            <ul className="mt-1 space-y-1">
              {entry!.evidence.map((e, i) => (
                <li key={i} className="rounded-lg bg-brand-50 p-2">
                  <p>
                    <span className="font-semibold">{whereFound(e)}</span> · found by {methodLabel(e.method)} · {confidenceText(e)}
                  </p>
                  <p className="font-mono text-[11px] text-brand-800">“{e.snippet}”</p>
                  {e.invalid ? <p className="text-amber-900">Not usable: {e.invalid}</p> : <p>Value: {showValue(e.value)}</p>}
                </li>
              ))}
              <li className="text-brand-500">Extracted values are not verified facts. Check them against the document.</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CandidateReview({
  candidate,
  categories,
  images,
  onSaved,
  confirm,
  api = adminIntakeApi,
  productHref = (id: string) => `/admin/catalogue/${id}?tab=review`,
}: {
  candidate: Candidate;
  categories: AdminCategory[];
  images: IntakeImage[];
  onSaved: (c: Candidate) => void;
  confirm: (r: ConfirmRequest) => void;
  /** Admin intake API by default; a partner shop passes its own scoped API. */
  api?: IntakeApi;
  productHref?: (identityId: string) => string;
}) {
  const intakeApi = api;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [category, setCategory] = useState(candidate.category_code ?? "");
  const [attach, setAttach] = useState<string>(candidate.attach_to_identity_id ?? (candidate.allow_similar ? "__new__" : ""));
  const [selected, setSelected] = useState<string[]>(candidate.image_ids);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    setDrafts({});
    setCategory(candidate.category_code ?? "");
    setAttach(candidate.attach_to_identity_id ?? (candidate.allow_similar ? "__new__" : ""));
    setSelected(candidate.image_ids);
    setError(null);
    setStale(false);
  }, [candidate]);

  const locked = candidate.status === "SUBMITTED" || candidate.status === "REJECTED";
  const fieldChanges = useMemo(() => changedFieldValues(candidate.fields, drafts), [candidate.fields, drafts]);
  const attachChanged = attach !== (candidate.attach_to_identity_id ?? (candidate.allow_similar ? "__new__" : ""));
  const imagesChanged = [...selected].sort().join() !== [...candidate.image_ids].sort().join();
  const dirty = Object.keys(fieldChanges).length > 0 || category !== (candidate.category_code ?? "") || attachChanged || imagesChanged;
  useUnsavedChangesWarning(dirty);

  async function save(): Promise<Candidate | null> {
    const body: Record<string, unknown> = { expected_updated_at: candidate.updated_at };
    if (Object.keys(fieldChanges).length) body.fields = fieldChanges;
    if (category !== (candidate.category_code ?? "")) body.category_code = category || null;
    if (attachChanged) {
      body.attach_to_identity_id = attach && attach !== "__new__" ? attach : null;
      body.allow_similar = attach === "__new__";
    }
    if (imagesChanged) body.image_ids = selected;
    setBusy(true);
    setError(null);
    try {
      const updated = await intakeApi.updateCandidate(candidate.id, body);
      onSaved(updated);
      return updated;
    } catch (err) {
      setStale(isStale(err));
      setError(adminError(err, "The draft could not be saved."));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function act(action: "confirm" | "reopen") {
    setBusy(true);
    setError(null);
    try {
      onSaved(await intakeApi.candidateAction(candidate.id, action));
    } catch (err) {
      setError(adminError(err, "That didn’t work."));
    } finally {
      setBusy(false);
    }
  }

  function reject() {
    confirm({
      title: "Reject this draft?",
      body: "It won’t be added to the catalogue. You can reopen it later.",
      confirmLabel: "Reject draft",
      danger: true,
      onConfirm: async () => {
        try {
          onSaved(await intakeApi.candidateAction(candidate.id, "reject"));
        } catch (err) {
          throw new Error(adminError(err, "Could not reject the draft."));
        }
      },
    });
  }

  const blockers = candidate.issues.filter((i) => i.severity === "blocker");
  const warnings = candidate.issues.filter((i) => i.severity === "warning");
  const suggested = new Set(candidate.suggested_image_ids);
  const groups = categories.filter((c) => c.parent_code === null);

  return (
    <section aria-label="Review draft" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-brand-900">{showValue(candidate.fields.name?.value) || "Unnamed draft"}</h2>
        <span className="text-sm text-brand-600">{CANDIDATE_STATUS_LABEL[candidate.status]}</span>
      </div>
      {candidate.submit_error && <p className="alert alert-error text-sm">Last submit failed: {candidate.submit_error}</p>}
      {candidate.status === "SUBMITTED" && (
        <p className="alert alert-success text-sm">
          Submitted for approval.{" "}
          {candidate.identity_id && (
            <a className="underline" href={productHref(candidate.identity_id)}>
              Open the product in the review queue
            </a>
          )}
        </p>
      )}
      {(blockers.length > 0 || warnings.length > 0) && (
        <div className="card space-y-2 text-sm">
          {blockers.length > 0 && (
            <div>
              <p className="font-semibold text-red-800">Fix before confirming:</p>
              <ul className="ml-5 list-disc text-red-800">
                {blockers.map((i, n) => (
                  <li key={n}>{i.message}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <p className="font-semibold text-amber-900">Check:</p>
              <ul className="ml-5 list-disc text-amber-900">
                {warnings.map((i, n) => (
                  <li key={n}>{i.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <label className="block text-sm">
          <span className="label">Category *</span>
          <select className="input" value={category} disabled={locked} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Choose…</option>
            {groups.map((g) => (
              <optgroup key={g.code} label={g.label}>
                {categories
                  .filter((c) => c.parent_code === g.code && c.is_active)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        {INTAKE_FIELDS.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            candidate={candidate}
            draft={drafts[f.key]}
            locked={locked}
            onDraft={(v) => setDrafts((d) => ({ ...d, [f.key]: v }))}
          />
        ))}
      </div>

      {candidate.duplicates.length > 0 && (
        <fieldset className="card space-y-2 text-sm" disabled={locked}>
          <legend className="font-semibold text-brand-900">Already in the catalogue?</legend>
          {candidate.duplicates.map((d) => (
            <label key={d.identity_id} className="flex items-start gap-2">
              <input type="radio" name="attach" checked={attach === d.identity_id} onChange={() => setAttach(d.identity_id)} />
              <span>
                Same product as <strong>{[d.brand, d.name, d.size_label].filter(Boolean).join(" · ")}</strong> (
                {d.reason.replace(/_/g, " ")}): add these details and the shop listing to it
              </span>
            </label>
          ))}
          <label className="flex items-start gap-2">
            <input type="radio" name="attach" checked={attach === "__new__"} onChange={() => setAttach("__new__")} />
            <span>It’s a different product: create a new one</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="attach" checked={attach === ""} onChange={() => setAttach("")} />
            <span>Not decided</span>
          </label>
        </fieldset>
      )}

      <section className="card space-y-2" aria-label="Product photos">
        <h3 className="font-semibold text-brand-900">Photos for this product</h3>
        <p className="text-xs text-brand-500">
          Pick only photos that show this exact product. A photo is never proof that a product is genuine.
        </p>
        {images.length === 0 ? (
          <p className="text-sm text-brand-600">No photos in this import.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img) => {
              const checked = selected.includes(img.id);
              const forOther = img.suggested_candidate_id && img.suggested_candidate_id !== candidate.id;
              return (
                <li key={img.id} className={`rounded-lg border p-2 text-xs ${checked ? "border-brand-600" : "border-brand-100"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(img.url) ?? ""} alt={`Image from ${img.filename ?? "upload"}`} className="h-24 w-full object-contain" />
                  <label className="mt-1 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, img.id] : s.filter((x) => x !== img.id)))}
                    />
                    Use
                  </label>
                  <p className="text-brand-500">
                    {img.filename}
                    {img.page_number ? `, page ${img.page_number}` : ""}
                  </p>
                  {suggested.has(img.id) && (
                    <p className={img.link_strength === "strong" ? "text-emerald-800" : "text-amber-900"}>
                      Suggested: {img.link_evidence}
                    </p>
                  )}
                  {forOther && <p className="text-brand-500">Suggested for another draft</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {stale && (
        <p className="alert alert-warning text-sm">
          Someone changed this draft after you opened it, so your changes were not saved. Reload the draft to see the latest version.
        </p>
      )}
      {error && !stale && (
        <p role="alert" className="alert alert-error text-sm">
          {error}
        </p>
      )}
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={!dirty || busy} onClick={save}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          {candidate.status === "NEEDS_REVIEW" && (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={async () => {
                if (dirty && !(await save())) return;
                await act("confirm");
              }}
            >
              {dirty ? "Save and confirm" : "Confirm draft"}
            </button>
          )}
          {candidate.status === "CONFIRMED" && (
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => act("reopen")}>
              Reopen for changes
            </button>
          )}
          <button type="button" className="btn-secondary !text-red-700" disabled={busy} onClick={reject}>
            Reject draft
          </button>
        </div>
      )}
      {candidate.status === "REJECTED" && (
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => act("reopen")}>
          Reopen
        </button>
      )}
    </section>
  );
}
