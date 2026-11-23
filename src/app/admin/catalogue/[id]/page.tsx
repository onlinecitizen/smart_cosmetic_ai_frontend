"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog, ConfirmRequest } from "@/components/admin/catalogue/ConfirmDialog";
import { FactsPanel } from "@/components/admin/catalogue/FactsPanel";
import { IdentityForm } from "@/components/admin/catalogue/IdentityForm";
import { ImageGallery } from "@/components/admin/catalogue/ImageGallery";
import { ListingsPanel } from "@/components/admin/catalogue/ListingsPanel";
import { HistoryPanel, ReviewPanel } from "@/components/admin/catalogue/ReviewPanel";
import { CatalogStatus, CatalogueNav, useUnsavedChangesWarning } from "@/components/admin/catalogue/shared";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert, ErrorState, Spinner } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import {
  adminCatalogApi,
  adminError,
  AdminIdentity,
  AdminListing,
  identityToFields,
  IdentityFields,
  isStale,
  ReviewEvent,
} from "@/lib/adminCatalog";
import type { AdminRetailer } from "@/lib/catalog";
import { useAdminFormOptions } from "@/lib/useAdminFormOptions";

const TABS = [
  { key: "details", label: "Details" },
  { key: "photos", label: "Photos" },
  { key: "sources", label: "Sources" },
  { key: "shops", label: "Shops, price and stock" },
  { key: "review", label: "Review" },
  { key: "history", label: "History" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function Workspace() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const initialTab = (TABS.find((t) => t.key === search.get("tab"))?.key ?? "details") as TabKey;
  const [tab, setTab] = useState<TabKey>(initialTab);
  const { options, error: optionsError, reload: reloadOptions } = useAdminFormOptions();

  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [history, setHistory] = useState<ReviewEvent[]>([]);
  const [retailers, setRetailers] = useState<AdminRetailer[]>([]);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(search.get("notice"));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  useUnsavedChangesWarning(dirty);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [i, l, h, r, o] = await Promise.all([
        adminCatalogApi.identity(id),
        adminCatalogApi.listings(id),
        adminCatalogApi.history(id),
        adminCatalogApi.retailers(),
        adminCatalogApi.overview(),
      ]);
      setIdentity(i);
      setListings(l);
      setHistory(h);
      setRetailers(r);
      setUploadsEnabled(o.image_uploads_enabled);
    } catch (err) {
      setLoadError(
        err instanceof ApiError && err.status === 404 ? "This product doesn’t exist." : adminError(err, "Could not load the product.")
      );
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  // Keyed on the field values, not the object: reloading after a photo or shop
  // change must not reset unsaved edits on the Details tab.
  const fieldsKey = identity ? JSON.stringify(identityToFields(identity)) : "";
  const initialFields = useMemo<IdentityFields | null>(() => (fieldsKey ? JSON.parse(fieldsKey) : null), [fieldsKey]);

  async function save(changes: Partial<IdentityFields>) {
    if (!identity) return;
    setSaving(true);
    setSaveError(null);
    setStale(false);
    try {
      const updated = await adminCatalogApi.updateIdentity(identity.id, {
        ...changes,
        expected_updated_at: identity.updated_at,
      });
      setDirty(false);
      setNotice(
        identity.status === "PUBLISHED" && updated.status === "DRAFT"
          ? "Saved. The product was published, so it is hidden again until it is re-published (see Review)."
          : "Saved."
      );
      await load();
    } catch (err) {
      setStale(isStale(err));
      setSaveError(adminError(err, "The changes could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  if (optionsError) return <ErrorState message={optionsError} onRetry={reloadOptions} />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!identity || !options || !initialFields) return <Spinner label="Loading the product" />;

  const locked = identity.status === "ARCHIVED";

  return (
    <div className="container-page space-y-6">
      <CatalogueNav />
      <header className="space-y-2">
        <p className="text-xs text-brand-500">
          <Link href="/admin/catalogue" className="underline">
            Catalogue
          </Link>{" "}
          › {identity.category_path.map((c) => options.categories.find((x) => x.code === c)?.label ?? c).join(" › ")}
        </p>
        <h1 className="display text-3xl">{identity.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-brand-600">
          <CatalogStatus status={identity.status} />
          {[identity.brand, identity.variant, identity.size_label].filter(Boolean).join(" · ")}
          {identity.is_test_fixture && <span className="text-amber-800">test fixture</span>}
        </div>
      </header>

      {notice && (
        <Alert tone="info">
          {notice}{" "}
          <button type="button" className="underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </Alert>
      )}
      {dirty && tab !== "details" && (
        <Alert tone="warning">You have unsaved edits on the Details tab.</Alert>
      )}

      <div role="tablist" aria-label="Product sections" className="flex flex-wrap gap-2 border-b border-brand-100 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            id={`tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t.key ? "bg-brand-600 text-white" : "text-brand-600 hover:bg-brand-50"}`}
          >
            {t.label}
            {t.key === "photos" && ` (${identity.images.length})`}
            {t.key === "sources" && ` (${identity.facts.length})`}
            {t.key === "shops" && ` (${listings.length})`}
          </button>
        ))}
      </div>

      {/* The details form stays mounted (hidden) so switching tabs never loses unsaved edits. */}
      <div role="tabpanel" id="panel-details" aria-labelledby="tab-details" hidden={tab !== "details"}>
        {locked ? (
          <p className="text-sm text-brand-600">This product is archived. Restore it on the Review tab before editing.</p>
        ) : (
          <>
            {stale && (
              <Alert tone="warning" className="mb-4">
                Someone changed this product after you opened it, so your changes were not saved.{" "}
                <button type="button" className="font-semibold underline" onClick={() => { setStale(false); setSaveError(null); load(); }}>
                  Load the latest version
                </button>{" "}
                (your unsaved edits will be replaced).
              </Alert>
            )}
            <IdentityForm
              initial={initialFields}
              options={options}
              mode="edit"
              submitLabel="Save product facts"
              busy={saving}
              serverError={stale ? null : saveError}
              onDirtyChange={setDirty}
              onSubmit={(changes) => save(changes)}
            />
          </>
        )}
      </div>
      {tab === "photos" && (
        <div role="tabpanel" id="panel-photos" aria-labelledby="tab-photos">
          <ImageGallery
            identityId={identity.id}
            images={identity.images}
            uploadsEnabled={uploadsEnabled}
            locked={locked}
            onChanged={load}
            confirm={setConfirmReq}
          />
        </div>
      )}
      {tab === "sources" && (
        <div role="tabpanel" id="panel-sources" aria-labelledby="tab-sources">
          <FactsPanel identity={identity} locked={locked} onChanged={load} confirm={setConfirmReq} />
        </div>
      )}
      {tab === "shops" && (
        <div role="tabpanel" id="panel-shops" aria-labelledby="tab-shops">
          <ListingsPanel identity={identity} listings={listings} retailers={retailers} onChanged={load} confirm={setConfirmReq} />
        </div>
      )}
      {tab === "review" && (
        <div role="tabpanel" id="panel-review" aria-labelledby="tab-review">
          <ReviewPanel identity={identity} history={history} onChanged={load} confirm={setConfirmReq} blockedByUnsaved={dirty} />
        </div>
      )}
      {tab === "history" && (
        <div role="tabpanel" id="panel-history" aria-labelledby="tab-history">
          <HistoryPanel history={history} />
          <p className="mt-4 text-xs text-brand-500">
            Field-by-field changes (old and new values) are in the{" "}
            <Link href="/admin?tab=audit" className="underline">
              audit log
            </Link>
            .
          </p>
        </div>
      )}

      <ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}

export default function ProductWorkspacePage() {
  return (
    <RequireAuth adminOnly>
      <Suspense fallback={<Spinner label="Loading" />}>
        <Workspace />
      </Suspense>
    </RequireAuth>
  );
}
