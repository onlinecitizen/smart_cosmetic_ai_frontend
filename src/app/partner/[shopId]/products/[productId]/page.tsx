"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog, ConfirmRequest } from "@/components/admin/catalogue/ConfirmDialog";
import { IdentityForm } from "@/components/admin/catalogue/IdentityForm";
import { ImageGallery } from "@/components/admin/catalogue/ImageGallery";
import { CatalogStatus, formatWhen, ReadinessList, useUnsavedChangesWarning } from "@/components/admin/catalogue/shared";
import { ListingEditor } from "@/components/admin/ListingEditor";
import { PartnerNav } from "@/components/partner/PartnerNav";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert, ErrorState, Spinner } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { adminError, FIELD_LABEL, IdentityFields, isStale } from "@/lib/adminCatalog";
import type { AdminCatalogProduct } from "@/lib/catalog";
import { makeShopApi, ProductDetail } from "@/lib/partner";
import { useAdminFormOptions } from "@/lib/useAdminFormOptions";

const CHANGEABLE = ["name", "brand", "variant", "size_label", "gtin", "manufacturer_code", "ingredients_inci", "usage_instructions", "warnings", "description"];

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  return Array.isArray(v) ? v.join(", ") : String(v);
}

function toFields(p: ProductDetail): IdentityFields {
  return {
    name: p.name,
    brand: p.brand,
    variant: p.variant,
    size_label: p.size_label,
    category: p.category_code,
    description: p.description,
    ingredients_inci: p.ingredients_inci,
    usage_instructions: p.usage_instructions,
    warnings: p.warnings,
    skin_types: p.skin_types,
    concerns: p.concerns,
    attributes: p.attributes,
    gtin: p.gtin,
    manufacturer_code: p.manufacturer_code,
  };
}

function ChangeForm({ product, onSent, send }: { product: ProductDetail; onSent: () => void; send: (changes: Record<string, unknown>, reason: string) => Promise<unknown> }) {
  const [field, setField] = useState("");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = field ? (product as unknown as Record<string, unknown>)[field] : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!field) return setError("Choose what to change.");
    if (reason.trim().length < 3) return setError("Say why, so the team can check it.");
    setBusy(true);
    setError(null);
    try {
      await send({ [field]: value.trim() === "" ? null : value.trim() }, reason.trim());
      setField("");
      setValue("");
      setReason("");
      onSent();
    } catch (err) {
      setError(adminError(err, "Could not send the change."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3" aria-label="Propose a change">
      <h2 className="font-semibold text-brand-900">Propose a change</h2>
      <p className="text-xs text-brand-500">
        This product can’t be edited directly. Your proposal is checked by the Smart Cosmetic AI team before anything changes for
        customers.
      </p>
      <label className="block text-sm">
        <span className="label">What should change?</span>
        <select
          className="input"
          value={field}
          onChange={(e) => {
            setField(e.target.value);
            const cur = (product as unknown as Record<string, unknown>)[e.target.value];
            setValue(cur == null ? "" : String(cur));
          }}
        >
          <option value="">Choose…</option>
          {CHANGEABLE.map((f) => (
            <option key={f} value={f}>
              {FIELD_LABEL[f] ?? f}
            </option>
          ))}
        </select>
      </label>
      {field && (
        <>
          <p className="text-xs text-brand-600">Now: {show(current)}</p>
          <label className="block text-sm">
            <span className="label">New value</span>
            <textarea className="input min-h-[4rem]" value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
        </>
      )}
      <label className="block text-sm">
        <span className="label">Why? (for example “the pack was redesigned”)</span>
        <input className="input" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Sending…" : "Send for review"}
      </button>
    </form>
  );
}

function PartnerProduct() {
  const { shopId, productId } = useParams<{ shopId: string; productId: string }>();
  const shopApi = useMemo(() => makeShopApi(shopId), [shopId]);
  const { options } = useAdminFormOptions(shopApi.formOptions);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  useUnsavedChangesWarning(dirty);

  const load = useCallback(async () => {
    try {
      setProduct(await shopApi.product(productId));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "This product isn’t available to your shop." : adminError(err, "Could not load the product."));
    }
  }, [shopApi, productId]);
  useEffect(() => {
    load();
  }, [load]);

  const fieldsKey = product ? JSON.stringify(toFields(product)) : "";
  const initial = useMemo<IdentityFields | null>(() => (fieldsKey ? JSON.parse(fieldsKey) : null), [fieldsKey]);

  async function save(changes: Partial<IdentityFields>) {
    if (!product) return;
    setSaving(true);
    setSaveError(null);
    try {
      await shopApi.update(product.id, { ...changes, expected_updated_at: product.updated_at });
      setDirty(false);
      setNotice("Saved.");
      await load();
    } catch (err) {
      setSaveError(isStale(err) ? "This product changed after you opened it. Reload the page and make your change again." : adminError(err, "Could not save."));
    } finally {
      setSaving(false);
    }
  }

  function submit() {
    if (!product) return;
    setConfirmReq({
      title: "Submit for approval?",
      body: "The Smart Cosmetic AI team checks the details against the product before it is published. You can’t edit it while it waits.",
      confirmLabel: "Submit for approval",
      onConfirm: async () => {
        try {
          await shopApi.submit(product.id);
        } catch (err) {
          throw new Error(adminError(err, "Could not submit."));
        }
        setNotice("Submitted. You’ll see the decision here.");
        await load();
      },
    });
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!product || !options || !initial) return <Spinner label="Loading the product" />;

  return (
    <div className="container-page space-y-6">
      <PartnerNav shopId={shopId} />
      <header className="space-y-2">
        <h1 className="display text-3xl">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-brand-600">
          <CatalogStatus status={product.status} />
          {[product.brand, product.variant, product.size_label].filter(Boolean).join(" · ")}
          {!product.owned && <span>Managed by the platform; your shop sells it.</span>}
        </div>
      </header>
      {notice && <Alert tone="info">{notice}</Alert>}
      {product.feedback && (
        <Alert tone="warning" title={product.feedback.action === "return" ? "Returned for correction" : "Not approved"}>
          “{product.feedback.reason}” — {product.feedback.by}, {formatWhen(product.feedback.at)}. Correct the details below and submit again.
        </Alert>
      )}

      {product.editable ? (
        <section className="space-y-4" aria-label="Approval">
          <div className="card space-y-3">
            <ReadinessList readiness={{ ...product.readiness, blockers: product.readiness.blockers.filter((b) => b.code !== "rejected") }} />
            <button type="button" className="btn-primary" disabled={dirty || product.blockers > 0} onClick={submit}>
              Submit for approval
            </button>
            {dirty && <p className="text-xs text-amber-900">Save your changes first.</p>}
          </div>
          {saveError && <Alert tone="error">{saveError}</Alert>}
          <IdentityForm
            initial={initial}
            options={options}
            mode="edit"
            submitLabel="Save changes"
            busy={saving}
            onDirtyChange={setDirty}
            onSubmit={(changes) => save(changes)}
          />
        </section>
      ) : (
        <section className="space-y-4" aria-label="Details">
          <dl className="card grid gap-2 text-sm sm:grid-cols-2">
            {CHANGEABLE.map((f) => (
              <div key={f}>
                <dt className="text-xs text-brand-500">{FIELD_LABEL[f] ?? f}</dt>
                <dd className="whitespace-pre-line text-brand-900">{show((product as unknown as Record<string, unknown>)[f])}</dd>
              </div>
            ))}
          </dl>
          {product.status !== "ARCHIVED" && <ChangeForm product={product} onSent={() => { setNotice("Change sent for review."); load(); }} send={(c, r) => shopApi.requestChange(product.id, c, r)} />}
        </section>
      )}

      <section className="space-y-2" aria-label="Photos">
        <h2 className="text-xl font-semibold text-brand-900">Photos</h2>
        {!product.editable && <p className="text-sm text-brand-600">Photos can be changed while the product is a draft or returned for correction.</p>}
        <ImageGallery
          identityId={product.id}
          images={product.images}
          uploadsEnabled
          locked={!product.editable}
          onChanged={load}
          confirm={setConfirmReq}
          api={shopApi.images}
        />
      </section>

      {product.listing && (
        <section className="card space-y-2" aria-label="Your listing">
          <h2 className="font-semibold text-brand-900">Your listing: {product.listing.sku}</h2>
          <p className="text-xs text-brand-500">Listing {product.listing.status.toLowerCase()}. Price and stock changes apply to your listing straight away.</p>
          <ListingEditor
            key={product.listing.updated_at}
            product={{ ...product.listing, name: product.name } as unknown as AdminCatalogProduct & { stock_quantity: number | null }}
            endpoint={shopApi.offerEndpoint(product.listing.id)}
            onSaved={load}
          />
        </section>
      )}

      {product.change_requests.length > 0 && (
        <section className="card space-y-2" aria-label="Proposed changes">
          <h2 className="font-semibold text-brand-900">Proposed changes</h2>
          <ul className="space-y-2 text-sm">
            {product.change_requests.map((cr) => (
              <li key={cr.id} className="border-b border-brand-50 pb-2">
                {Object.entries(cr.changes).map(([f, c]) => (
                  <p key={f}>
                    <span className="font-semibold">{FIELD_LABEL[f] ?? f}:</span> {show(c.from)} → {show(c.to)}
                  </p>
                ))}
                <p className="text-xs text-brand-500">
                  “{cr.reason}” · {formatWhen(cr.created_at)} ·{" "}
                  <span className={cr.status === "REJECTED" ? "text-red-700" : cr.status === "APPROVED" ? "text-emerald-800" : ""}>
                    {cr.status === "PENDING" ? "waiting for review" : cr.status.toLowerCase()}
                  </span>
                  {cr.decision_reason && ` — “${cr.decision_reason}”`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" aria-label="History">
        <h2 className="mb-2 font-semibold text-brand-900">History</h2>
        <ol className="space-y-1 text-sm">
          {[...product.history].reverse().map((h) => (
            <li key={h.id} className="border-b border-brand-50 pb-1">
              <span className="font-semibold">
                {h.entity_type === "listing" ? "Listing" : "Product"}: {h.action.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-brand-500">
                {" "}
                · {h.actor} · {formatWhen(h.created_at)}
              </span>
              {h.note && <span className="block text-xs text-brand-700">“{h.note}”</span>}
            </li>
          ))}
        </ol>
      </section>
      <ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}

export default function PartnerProductPage() {
  return (
    <RequireAuth>
      <PartnerProduct />
    </RequireAuth>
  );
}
