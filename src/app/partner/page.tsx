"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert, ErrorState, Spinner } from "@/components/ui/States";
import { adminError } from "@/lib/adminCatalog";
import { PartnerMe, partnerApi } from "@/lib/partner";

function PartnerHome() {
  const [me, setMe] = useState<PartnerMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    partnerApi
      .me()
      .then(setMe)
      .catch((err) => setError(adminError(err, "Could not load your partner details.")));
  }, []);
  useEffect(load, [load]);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (shopName.trim().length < 2) return setFormError("Enter your shop’s name.");
    setBusy(true);
    setFormError(null);
    try {
      await partnerApi.apply({ shop_name: shopName.trim(), city: city.trim() || null, message: message.trim() || null });
      load();
    } catch (err) {
      setFormError(adminError(err, "Could not send the application."));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!me) return <Spinner label="Loading" />;
  const pending = me.applications.find((a) => a.status === "PENDING");
  const lastRejected = me.applications.find((a) => a.status === "REJECTED");

  return (
    <div className="container-page max-w-3xl space-y-6">
      <h1 className="display text-4xl">Partner portal</h1>
      <p className="text-brand-700">
        For shopkeepers selling on Smart Cosmetic AI: add your products, keep prices and stock up to date, and follow their
        approval. Every product is checked by the Smart Cosmetic AI team before customers see it.
      </p>

      {me.shops.length > 0 && (
        <section className="space-y-2" aria-label="Your shops">
          <h2 className="font-semibold text-brand-900">Your shops</h2>
          <ul className="space-y-2">
            {me.shops.map((s) => (
              <li key={s.retailer_id} className="card flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-900">{s.name}</p>
                  <p className="text-xs text-brand-500">
                    {s.city ?? "City not set"} · {s.role === "owner" ? "Owner" : "Staff"}
                  </p>
                  {s.status === "suspended" && (
                    <p className="text-sm text-red-700">
                      Access suspended{s.suspended_reason ? `: ${s.suspended_reason}` : ""}. Contact the Smart Cosmetic AI team.
                    </p>
                  )}
                </div>
                {s.status === "active" && (
                  <Link href={`/partner/${s.retailer_id}`} className="btn-primary">
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending ? (
        <Alert tone="info" title="Application received">
          Your application for “{pending.shop_name}” is waiting for the Smart Cosmetic AI team. You’ll get access here once it is
          approved.
        </Alert>
      ) : (
        <section className="card space-y-3" aria-label="Apply to become a partner">
          <h2 className="font-semibold text-brand-900">{me.shops.length ? "Apply for another shop" : "Apply to become a partner"}</h2>
          {lastRejected && (
            <p className="alert alert-warning text-sm">
              Your previous application for “{lastRejected.shop_name}” was not approved
              {lastRejected.decision_reason ? `: ${lastRejected.decision_reason}` : "."}
            </p>
          )}
          <form onSubmit={apply} className="space-y-3">
            <label className="block text-sm">
              <span className="label">Shop name</span>
              <input className="input" value={shopName} maxLength={120} onChange={(e) => setShopName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="label">City</span>
              <input className="input" value={city} maxLength={120} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="label">Anything the team should know</span>
              <textarea
                className="input min-h-[5rem]"
                value={message}
                maxLength={1000}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="For example where the shop is and what you sell. Don’t include passwords or payment details."
              />
            </label>
            {formError && (
              <p role="alert" className="text-sm text-red-700">
                {formError}
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Send application"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

export default function PartnerPage() {
  return (
    <RequireAuth>
      <PartnerHome />
    </RequireAuth>
  );
}
