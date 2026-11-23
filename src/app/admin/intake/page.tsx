"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CatalogueNav, formatWhen } from "@/components/admin/catalogue/shared";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/States";
import { adminCatalogApi, adminError } from "@/lib/adminCatalog";
import type { AdminRetailer } from "@/lib/catalog";
import { CapabilityNotes } from "@/components/admin/intake/CapabilityNotes";
import { Batch, BATCH_STATUS_LABEL, Capabilities, intakeApi } from "@/lib/intake";

function IntakeList() {
  const router = useRouter();
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [retailers, setRetailers] = useState<AdminRetailer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [retailer, setRetailer] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([intakeApi.capabilities(), intakeApi.batches(), adminCatalogApi.retailers()])
      .then(([c, b, r]) => {
        setCaps(c);
        setBatches(b);
        setRetailers(r);
      })
      .catch((err) => setError(adminError(err, "Could not load imports.")));
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setFormError("Give the import a name, for example the supplier and month.");
    setBusy(true);
    setFormError(null);
    try {
      const b = await intakeApi.createBatch({ name: name.trim(), retailer_id: retailer || null });
      router.push(`/admin/intake/${b.id}`);
    } catch (err) {
      setFormError(adminError(err, "Could not start the import."));
      setBusy(false);
    }
  }

  return (
    <div className="container-page space-y-6">
      <h1 className="display text-4xl">Import products</h1>
      <CatalogueNav />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !caps || !batches ? (
        <Spinner label="Loading imports" />
      ) : (
        <>
          <CapabilityNotes caps={caps} />
          {!caps.storage_configured ? (
            <p className="alert alert-warning text-sm">
              Document import is switched off on this server until private storage is configured (INTAKE_STORAGE_DIR).
            </p>
          ) : (
            <form onSubmit={create} className="card grid gap-3 sm:grid-cols-[2fr_1.5fr_auto]" aria-label="Start an import">
              <label className="block text-sm">
                <span className="label">Import name</span>
                <input className="input" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} placeholder="e.g. Supplier catalogue, November" />
              </label>
              <label className="block text-sm">
                <span className="label">Shop the documents are for</span>
                <select className="input" value={retailer} onChange={(e) => setRetailer(e.target.value)}>
                  <option value="">No shop (product details only)</option>
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn-primary self-end" disabled={busy}>
                {busy ? "Starting…" : "Start import"}
              </button>
              <p className="text-xs text-brand-500 sm:col-span-3">
                Choose the shop when the documents contain its codes, prices or stock. Without a shop, only product details are imported.
              </p>
              {formError && (
                <p role="alert" className="text-sm text-red-700 sm:col-span-3">
                  {formError}
                </p>
              )}
            </form>
          )}
          {batches.length === 0 ? (
            <EmptyState title="No imports yet." body="Start one above, then upload catalogues, price lists or packaging photos." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Imports</caption>
                <thead>
                  <tr className="border-b border-brand-100 text-left text-brand-500">
                    <th className="py-2 pr-4">Import</th>
                    <th className="py-2 pr-4">Shop</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Drafts</th>
                    <th className="py-2">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b border-brand-50">
                      <td className="py-2 pr-4">
                        <Link href={`/admin/intake/${b.id}`} className="font-semibold underline underline-offset-4">
                          {b.name}
                        </Link>
                        <span className="block text-xs text-brand-500">
                          {b.file_count} file(s){b.failed_files ? `, ${b.failed_files} failed` : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{b.retailer?.name ?? "—"}</td>
                      <td className="py-2 pr-4">{BATCH_STATUS_LABEL[b.status]}</td>
                      <td className="py-2 pr-4 text-xs">
                        {b.candidate_counts.NEEDS_REVIEW ?? 0} to review · {b.candidate_counts.CONFIRMED ?? 0} confirmed ·{" "}
                        {b.candidate_counts.SUBMITTED ?? 0} submitted
                      </td>
                      <td className="py-2 text-xs">
                        {formatWhen(b.created_at)}
                        {b.created_by_email ? ` by ${b.created_by_email}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function IntakePage() {
  return (
    <RequireAuth adminOnly>
      <IntakeList />
    </RequireAuth>
  );
}
