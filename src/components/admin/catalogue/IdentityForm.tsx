"use client";

import { useEffect, useMemo, useState } from "react";
import type { Option } from "@/lib/catalog";
import {
  AdminCategory,
  AttributeSpec,
  AttributeSpecs,
  changedFields,
  FIELD_LABEL,
  IdentityFields,
  splitList,
} from "@/lib/adminCatalog";

export interface FormOptions {
  categories: AdminCategory[];
  specs: AttributeSpecs;
  skinTypes: Option[];
  concerns: Option[];
}

/** Client-side checks that mirror the server; the server still decides. */
export function identityFormErrors(f: IdentityFields): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = "Enter the product name exactly as on the pack.";
  if (!f.category) e.category = "Choose a subcategory.";
  if (f.gtin && !/^[\d\s-]{8,20}$/.test(f.gtin)) e.gtin = "A barcode has 8, 12, 13 or 14 digits.";
  if ((f.description ?? "").length > 2000) e.description = "At most 2,000 characters.";
  if ((f.usage_instructions ?? "").length > 2000) e.usage_instructions = "At most 2,000 characters.";
  if ((f.warnings ?? "").length > 2000) e.warnings = "At most 2,000 characters.";
  if (f.skin_types?.includes("all") && f.skin_types.length > 1) e.skin_types = "“All skin types” can’t be combined with others.";
  return e;
}

function AttributeInput({
  name,
  spec,
  value,
  onChange,
}: {
  name: string;
  spec: AttributeSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = name.replace(/_/g, " ");
  const id = `attr-${name}`;
  if (spec.kind === "bool") {
    return (
      <label className="block text-sm" htmlFor={id}>
        <span className="label capitalize">{label}</span>
        <select
          id={id}
          className="input"
          value={value === true ? "yes" : value === false ? "no" : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "yes")}
        >
          <option value="">Not stated</option>
          <option value="yes">Yes (stated on label/by brand)</option>
          <option value="no">No</option>
        </select>
      </label>
    );
  }
  if (spec.kind === "choice") {
    return (
      <label className="block text-sm" htmlFor={id}>
        <span className="label capitalize">{label}</span>
        <select id={id} className="input" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">Not stated</option>
          {spec.choices.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (spec.kind === "choices") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className="text-sm">
        <legend className="label capitalize">{label}</legend>
        <div className="flex flex-wrap gap-3">
          {spec.choices.map((c) => (
            <label key={c} className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selected.includes(c)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, c] : selected.filter((x) => x !== c);
                  onChange(next.length ? next : null);
                }}
              />
              {c.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (spec.kind === "int") {
    return (
      <label className="block text-sm" htmlFor={id}>
        <span className="label capitalize">{label}</span>
        <input
          id={id}
          className="input"
          inputMode="numeric"
          value={value == null ? "" : String(value)}
          onChange={(e) => {
            const t = e.target.value.trim();
            onChange(t === "" ? null : /^\d+$/.test(t) ? Number(t) : t);
          }}
        />
        {spec.min != null && (
          <span className="text-xs text-brand-500">
            Whole number, {spec.min}–{spec.max}
          </span>
        )}
      </label>
    );
  }
  const isList = spec.kind === "texts";
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="label capitalize">{label}</span>
      <input
        id={id}
        className="input"
        value={isList ? (Array.isArray(value) ? (value as string[]).join(", ") : "") : ((value as string) ?? "")}
        onChange={(e) => {
          const t = e.target.value;
          onChange(isList ? (splitList(t).length ? splitList(t) : null) : t || null);
        }}
      />
      {isList && <span className="text-xs text-brand-500">Separate entries with commas.</span>}
    </label>
  );
}

function CodeChecks({
  legend,
  options,
  value,
  onChange,
  extra,
}: {
  legend: string;
  options: Option[];
  value: string[] | null;
  onChange: (v: string[] | null) => void;
  extra?: Option;
}) {
  const selected = value ?? [];
  const all = extra ? [extra, ...options] : options;
  return (
    <fieldset className="text-sm">
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {all.map((o) => (
          <label key={o.code} className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={selected.includes(o.code)}
              onChange={(e) => {
                const next = e.target.checked ? [...selected, o.code] : selected.filter((x) => x !== o.code);
                onChange(next.length ? next : null);
              }}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Product-level facts (shared by every shop). Shop price and stock are edited
 * per listing, never here. `onSubmit` receives only the changed fields when
 * editing, or all fields when creating.
 */
export function IdentityForm({
  initial,
  options,
  mode,
  submitLabel,
  onSubmit,
  onDirtyChange,
  busy = false,
  serverError,
  beforeSubmit,
}: {
  initial: IdentityFields;
  options: FormOptions;
  mode: "create" | "edit";
  submitLabel: string;
  onSubmit: (fields: Partial<IdentityFields>, all: IdentityFields) => void;
  onDirtyChange?: (dirty: boolean) => void;
  busy?: boolean;
  serverError?: string | null;
  /** Extra form sections shown just above the submit button. */
  beforeSubmit?: React.ReactNode;
}) {
  const [f, setF] = useState<IdentityFields>(initial);
  const [touched, setTouched] = useState(false);
  useEffect(() => setF(initial), [initial]);

  const changes = useMemo(() => changedFields(initial, f), [initial, f]);
  const dirty = Object.keys(changes).length > 0;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const errors = identityFormErrors(f);
  const set = <K extends keyof IdentityFields>(k: K, v: IdentityFields[K]) => setF((x) => ({ ...x, [k]: v }));

  const groups = options.categories.filter((c) => c.parent_code === null);
  const current = options.categories.find((c) => c.code === f.category);
  const group = current?.attribute_group ?? "other";
  const specs = options.specs[group] ?? {};
  const attrs = (f.attributes ?? {}) as Record<string, unknown>;

  function changeCategory(code: string) {
    const next = options.categories.find((c) => c.code === code);
    // Attributes belong to the attribute group: drop keys the new group doesn't allow.
    const allowed = options.specs[next?.attribute_group ?? "other"] ?? {};
    const kept = Object.fromEntries(Object.entries(attrs).filter(([k]) => k in allowed));
    setF((x) => ({ ...x, category: code, attributes: Object.keys(kept).length ? kept : null }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    onSubmit(mode === "edit" ? changes : f, f);
  }

  const text = (k: keyof IdentityFields, hint?: string, long = false, required = false) => (
    <label className="block space-y-1 text-sm">
      <span className="label">
        {FIELD_LABEL[k]}
        {required && <span className="text-red-700"> *</span>}
      </span>
      {long ? (
        <textarea
          className="input min-h-[6rem]"
          value={(f[k] as string | null) ?? ""}
          onChange={(e) => set(k, e.target.value as never)}
        />
      ) : (
        <input className="input" value={(f[k] as string | null) ?? ""} onChange={(e) => set(k, e.target.value as never)} />
      )}
      {hint && <span className="block text-xs text-brand-500">{hint}</span>}
      {touched && errors[k] && (
        <span role="alert" className="block text-xs text-red-700">
          {errors[k]}
        </span>
      )}
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <p className="text-sm text-brand-600">
        These facts describe the product itself and are shared by every shop that sells it. Enter them exactly as printed
        on the pack or stated by the brand; leave a field empty if you don’t know it. Fields marked * are needed before
        publishing.{mode === "edit" && " Editing a published product hides it again until it is re-published."}
      </p>

      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 font-semibold text-brand-900">Identity</h2>
        {text("name", "Exactly as on the pack.", false, true)}
        {text("brand", undefined, false, true)}
        {text("variant", "Shade, scent, formulation or edition, if any.")}
        {text("size_label", "For example 50 mL or 100 g.", false, true)}
        {text("gtin", "The barcode number. Checked by the server.")}
        {text("manufacturer_code")}
        <label className="block space-y-1 text-sm">
          <span className="label">
            Category<span className="text-red-700"> *</span>
          </span>
          <select className="input" value={f.category} onChange={(e) => changeCategory(e.target.value)}>
            <option value="">Choose…</option>
            {groups.map((g) => (
              <optgroup key={g.code} label={g.label + (g.is_active ? "" : " (retired)")}>
                {options.categories
                  .filter((c) => c.parent_code === g.code && (c.is_active || c.code === initial.category))
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                      {c.is_active ? "" : " (retired)"}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          {touched && errors.category && (
            <span role="alert" className="block text-xs text-red-700">
              {errors.category}
            </span>
          )}
        </label>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold text-brand-900">Ingredients and usage</h2>
        {text(
          "ingredients_inci",
          group === "other" ? "Copy the full list from the pack." : "Copy the full list from the pack. Needed before publishing.",
          true,
          group !== "other",
        )}
        {text("usage_instructions", "How to use, as printed or stated by the brand.", true)}
        {text("warnings", "Warnings and precautions from the label.", true)}
        {text("description", "A short neutral description. No medical or efficacy claims.", true)}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold text-brand-900">Who it is listed for</h2>
        <p className="text-xs text-brand-500">
          Used by the recommendation finder. These describe who the brand targets, not proven results.
        </p>
        <CodeChecks
          legend="Skin types"
          options={options.skinTypes}
          value={f.skin_types}
          onChange={(v) => set("skin_types", v)}
          extra={{ code: "all", label: "All skin types" }}
        />
        {touched && errors.skin_types && (
          <p role="alert" className="text-xs text-red-700">
            {errors.skin_types}
          </p>
        )}
        <CodeChecks legend="Concerns" options={options.concerns} value={f.concerns} onChange={(v) => set("concerns", v)} />
      </section>

      {Object.keys(specs).length > 0 && (
        <section className="card grid gap-4 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-semibold text-brand-900">
            Attributes for {current?.label ?? "this category"}
          </h2>
          <p className="sm:col-span-2 text-xs text-brand-500">Only what the label or brand states. “Not stated” is not “no”.</p>
          {Object.entries(specs).map(([key, spec]) => (
            <AttributeInput
              key={key}
              name={key}
              spec={spec}
              value={attrs[key]}
              onChange={(v) => {
                const next = { ...attrs, [key]: v };
                if (v === null) delete next[key];
                set("attributes", Object.keys(next).length ? next : null);
              }}
            />
          ))}
        </section>
      )}

      {beforeSubmit}
      {serverError && (
        <p role="alert" className="alert alert-error text-sm">
          {serverError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy || (mode === "edit" && !dirty)}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {mode === "edit" && dirty && (
          <>
            <span className="text-sm text-amber-900">
              Unsaved changes: {Object.keys(changes).map((k) => FIELD_LABEL[k] ?? k).join(", ")}
            </span>
            <button type="button" className="text-sm underline" onClick={() => setF(initial)} disabled={busy}>
              Discard changes
            </button>
          </>
        )}
      </div>
    </form>
  );
}
