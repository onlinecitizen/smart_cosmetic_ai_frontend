"use client";

import { useState } from "react";
import {
  adminCatalogApi,
  adminError,
  AdminIdentity,
  Fact,
  FACT_SOURCES,
  FIELD_LABEL,
  splitList,
} from "@/lib/adminCatalog";
import { ConfirmRequest } from "./ConfirmDialog";
import { formatWhen } from "./shared";

const SOURCE_LABEL = Object.fromEntries(FACT_SOURCES.map((s) => [s.code, s.label]));
/** The facts whose source matters most to customers, shown as a checklist. */
export const KEY_FACTS = ["brand", "size_label", "ingredients_inci", "gtin", "usage_instructions", "warnings"] as const;
const FACT_FIELDS = [
  "name",
  "brand",
  "variant",
  "size_label",
  "gtin",
  "manufacturer_code",
  "ingredients_inci",
  "usage_instructions",
  "warnings",
  "description",
  "skin_types",
  "concerns",
  "claim",
];
const LIST_FIELDS = new Set(["skin_types", "concerns"]);

export function showValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** verified > unverified > none, for one field; rejected sources are reported separately. */
export function sourceStatus(facts: Fact[], field: string): "verified" | "unverified" | "rejected" | "none" {
  const mine = facts.filter((f) => f.field === field);
  if (mine.some((f) => f.verification_state === "verified")) return "verified";
  if (mine.some((f) => f.verification_state === "unverified")) return "unverified";
  if (mine.some((f) => f.verification_state === "rejected")) return "rejected";
  return "none";
}

const STATUS_TEXT = {
  verified: { label: "Verified source", cls: "text-emerald-800" },
  unverified: { label: "Source not yet verified", cls: "text-amber-900" },
  rejected: { label: "Source rejected", cls: "text-red-700" },
  none: { label: "No source recorded", cls: "text-brand-500" },
};

function currentValue(identity: AdminIdentity, field: string): unknown {
  if (field.startsWith("attribute:")) return (identity.attributes ?? {})[field.slice(10)];
  return (identity as unknown as Record<string, unknown>)[field];
}

export function FactsPanel({
  identity,
  locked,
  onChanged,
  confirm,
}: {
  identity: AdminIdentity;
  locked: boolean;
  onChanged: () => void;
  confirm: (r: ConfirmRequest) => void;
}) {
  const attrFields = Object.keys(identity.attributes ?? {}).map((k) => `attribute:${k}`);
  const [field, setField] = useState("");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: string) {
    setField(f);
    setValue(showValue(currentValue(identity, f)).replace(/^—$/, ""));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!field || !source || !value.trim()) return setError("Choose the fact, its value and where it comes from.");
    let parsed: unknown = value.trim();
    if (LIST_FIELDS.has(field)) parsed = splitList(value);
    else if (field.startsWith("attribute:")) {
      const cur = currentValue(identity, field);
      if (typeof cur === "boolean") parsed = value.trim().toLowerCase() === "yes" || value.trim() === "true";
      else if (typeof cur === "number") parsed = Number(value);
      else if (Array.isArray(cur)) parsed = splitList(value);
    }
    setBusy(true);
    setError(null);
    try {
      await adminCatalogApi.addFact(identity.id, {
        field,
        value: parsed,
        source_type: source,
        source_reference: reference.trim() || null,
        note: note.trim() || null,
      });
      setField("");
      setValue("");
      setReference("");
      setNote("");
      onChanged();
    } catch (err) {
      setError(adminError(err, "The source could not be recorded."));
    } finally {
      setBusy(false);
    }
  }

  async function verify(f: Fact) {
    setError(null);
    try {
      await adminCatalogApi.verifyFact(f.id);
      onChanged();
    } catch (err) {
      setError(adminError(err, "Could not verify the source."));
    }
  }

  function reject(f: Fact) {
    confirm({
      title: "Reject this source?",
      body: `Mark the ${FIELD_LABEL[f.field] ?? f.field} source as not supporting the value “${showValue(f.value)}”. If the product still shows this value, it can’t be published until it is corrected.`,
      confirmLabel: "Reject source",
      danger: true,
      reasonLabel: "What is wrong with it?",
      onConfirm: async (reason) => {
        try {
          await adminCatalogApi.rejectFact(f.id, reason);
        } catch (err) {
          throw new Error(adminError(err, "Could not reject the source."));
        }
        onChanged();
      },
    });
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <h3 className="mb-2 font-semibold text-brand-900">Where the key facts come from</h3>
        <table className="w-full text-sm">
          <tbody>
            {KEY_FACTS.map((k) => {
              const st = sourceStatus(identity.facts, k);
              const val = currentValue(identity, k);
              return (
                <tr key={k} className="border-b border-brand-50 align-top">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-brand-600">
                    {FIELD_LABEL[k]}
                  </th>
                  <td className="py-1.5 pr-3">{val ? <span className="line-clamp-2">{showValue(val)}</span> : <span className="text-brand-500">not provided</span>}</td>
                  <td className={`py-1.5 ${STATUS_TEXT[st].cls}`}>{val ? STATUS_TEXT[st].label : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-brand-900">Recorded sources</h3>
        {identity.facts.length === 0 ? (
          <p className="text-sm text-brand-600">No sources recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {identity.facts.map((f) => (
              <li key={f.id} className="card space-y-1 text-sm">
                <p>
                  <span className="font-semibold">{FIELD_LABEL[f.field] ?? f.field.replace("attribute:", "")}:</span>{" "}
                  {showValue(f.value)}
                </p>
                <p className="text-xs text-brand-600">
                  {SOURCE_LABEL[f.source_type] ?? f.source_type}
                  {f.source_reference ? ` — ${f.source_reference}` : ""} · recorded {formatWhen(f.created_at)}
                </p>
                {f.note && <p className="text-xs text-brand-500">Note: {f.note}</p>}
                <p className={`text-xs ${STATUS_TEXT[f.verification_state as keyof typeof STATUS_TEXT]?.cls ?? ""}`}>
                  {f.verification_state === "verified"
                    ? `Verified by ${f.verified_by_email ?? "a reviewer"} on ${formatWhen(f.verified_at)}`
                    : f.verification_state === "rejected"
                      ? `Rejected by ${f.verified_by_email ?? "a reviewer"} on ${formatWhen(f.verified_at)}`
                      : "Waiting for verification"}
                  {f.value !== undefined && JSON.stringify(f.value) !== JSON.stringify(currentValue(identity, f.field)) && (
                    <span className="ml-2 text-amber-900">(differs from the product’s current value)</span>
                  )}
                </p>
                {!locked && (
                  <div className="flex gap-3 text-xs">
                    {f.verification_state !== "verified" && (
                      <button type="button" className="text-brand-700 underline" onClick={() => verify(f)}>
                        Mark verified (I checked the source)
                      </button>
                    )}
                    {f.verification_state !== "rejected" && (
                      <button type="button" className="text-red-700 underline" onClick={() => reject(f)}>
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!locked && (
        <form onSubmit={add} className="card space-y-3" aria-label="Record a source">
          <h3 className="font-semibold text-brand-900">Record a source</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="label">Fact *</span>
              <select className="input" value={field} onChange={(e) => pick(e.target.value)}>
                <option value="">Choose…</option>
                {[...FACT_FIELDS, ...attrFields].map((f) => (
                  <option key={f} value={f}>
                    {FIELD_LABEL[f] ?? f.replace("attribute:", "Attribute: ").replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label">Source *</span>
              <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">Choose…</option>
                {FACT_SOURCES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="label">Value, as the source states it *</span>
            <textarea className="input min-h-[4rem]" value={value} onChange={(e) => setValue(e.target.value)} />
            {LIST_FIELDS.has(field) && <span className="text-xs text-brand-500">Codes separated by commas.</span>}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="label">Reference</span>
              <input className="input" value={reference} maxLength={500} onChange={(e) => setReference(e.target.value)} placeholder="URL, document name or photo reference" />
            </label>
            <label className="block text-sm">
              <span className="label">Note</span>
              <input className="input" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Record source"}
          </button>
        </form>
      )}
      {locked && error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
