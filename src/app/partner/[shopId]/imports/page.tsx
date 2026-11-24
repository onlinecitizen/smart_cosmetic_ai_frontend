"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatWhen } from "@/components/admin/catalogue/shared";
import { CapabilityNotes } from "@/components/admin/intake/CapabilityNotes";
import { PartnerNav } from "@/components/partner/PartnerNav";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState, Spinner } from "@/components/ui/States";
import { adminError } from "@/lib/adminCatalog";
import { Batch, BATCH_STATUS_LABEL, Capabilities } from "@/lib/intake";
import { makeShopApi } from "@/lib/partner";

function PartnerImports() {
  const { shopId } = useParams<{ shopId: string }>();
  const router = useRouter();
  const shopApi = useMemo(() => makeShopApi(shopId), [shopId]);
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([shopApi.intake.capabilities(), shopApi.intake.batches()])
      .then(([c, b]) => {
        setCaps(c);
        setBatches(b);
      })
      .catch((err) => setError(adminError(err, "Could not load your imports.")));
  }, [shopApi]);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setFormError("Give the import a name.");
    setBusy(true);
    try {
      const b = await shopApi.intake.createBatch({ name: name.trim(), retailer_id: null });
      router.push(`/partner/${shopId}/imports/${b.id}`);
    } catch (err) {
      setFormError(adminError(err, "Could not start the import."));
      setBusy(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!caps || !batches) return <Spinner label="Loading imports" />;
  return (
    <div className="container-page space-y-6">
      <PartnerNav shopId={shopId} />
      <h1 className="display text-4xl">Import documents</h1>
      <p className="text-sm text-brand-700">
        Upload your product sheets, price lists or packaging photos. We read them, propose products for you to check, and you submit the
        ones you confirm for approval. Only your shop can see these files.
      </p>
      <CapabilityNotes caps={caps} />
      {caps.storage_configured ? (
        <form onSubmit={create} className="card flex flex-wrap items-end gap-3" aria-label="Start an import">
          <label className="block flex-1 text-sm">
            <span className="label">Import name</span>
            <input className="input" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} placeholder="e.g. New stock, November" />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Starting…" : "Start import"}
          </button>
          {formError && (
            <p role="alert" className="w-full text-sm text-red-700">
              {formError}
            </p>
          )}
        </form>
      ) : (
        <p className="alert alert-warning text-sm">Document import isn’t available yet. Add products manually for now.</p>
      )}
      {batches.length > 0 && (
        <ul className="space-y-2">
          {batches.map((b) => (
            <li key={b.id} className="card flex flex-wrap justify-between gap-2 text-sm">
              <Link href={`/partner/${shopId}/imports/${b.id}`} className="font-semibold underline underline-offset-4">
                {b.name}
              </Link>
              <span className="text-xs text-brand-600">
                {BATCH_STATUS_LABEL[b.status]} · {b.file_count} file(s) · {formatWhen(b.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PartnerImportsPage() {
  return (
    <RequireAuth>
      <PartnerImports />
    </RequireAuth>
  );
}
