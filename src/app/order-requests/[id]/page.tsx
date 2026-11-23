"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/PageLoader";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert, StatusBadge } from "@/components/ui/States";
import { errorMessage } from "@/lib/api";
import { OrderRequest, REQUEST_STATUS_TONE, orderErrorMessage, orderRequestApi } from "@/lib/orderRequests";
import { formatPrice } from "@/lib/product";

function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [req, setReq] = useState<OrderRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReq(await orderRequestApi.get(id));
    } catch (err) {
      setError(errorMessage(err, "We couldn’t load this request."));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!req) return <PageLoader message={error} onRetry={load} />;

  async function cancel() {
    setCancelling(true);
    setActionError(null);
    try {
      setReq(await orderRequestApi.cancel(id));
      setConfirmingCancel(false);
    } catch (err) {
      setActionError(orderErrorMessage(err, "We couldn’t cancel this request."));
    } finally {
      setCancelling(false);
    }
  }

  const received = req.status === "RECEIVED";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-6">
      <Link href="/order-requests" className="text-xs uppercase tracking-[0.2em] text-brand-600 hover:text-brand-900">
        ← My requests
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <StatusBadge label={req.status_label} tone={REQUEST_STATUS_TONE[req.status] ?? "neutral"} />
        {req.is_test_fixture && <span className="badge-demo">Test data</span>}
      </div>
      <h1 className="display mt-4 text-4xl">{received ? "Request received" : "Your request"}</h1>
      <p className="mt-3 text-brand-600">
        Reference <span className="font-mono text-lg tracking-wider text-brand-900">{req.reference}</span>
      </p>

      <Alert tone={received ? "info" : "success"} className="mt-6" title="What happens next">
        <ul className="list-disc space-y-1 pl-5">
          {req.next_steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Alert>

      <section className="card mt-6" aria-labelledby="items-heading">
        <h2 id="items-heading" className="font-semibold text-brand-900">
          Requested from {req.retailer.name}
          {req.retailer.city ? `, ${req.retailer.city}` : ""}
        </h2>
        <ul className="mt-4 divide-y divide-brand-100">
          {req.items.map((item) => (
            <li key={item.product_id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <span>
                <span className="font-medium text-brand-900">
                  {item.quantity} × {item.product_name}
                </span>
                <span className="block text-xs text-brand-500">
                  {[item.brand, item.size_label, `Code ${item.sku}`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="text-brand-700">
                {item.line_total != null ? formatPrice(item.line_total, item.currency) : "Price not provided"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-brand-100 pt-4 text-sm text-brand-700">
          {req.price_complete && req.total_amount != null
            ? `Listed total: ${formatPrice(req.total_amount, req.currency)}. The retailer confirms the final price.`
            : "Total to be confirmed by the retailer: at least one item has no listed price."}
        </p>
      </section>

      <section className="card mt-6 text-sm text-brand-700" aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="font-semibold text-brand-900">
          Your details (shared with {req.retailer.name})
        </h2>
        {req.personal_data_removed ? (
          <p className="mt-3">Your contact details for this request have been removed, as described in the privacy notice.</p>
        ) : (
        <dl className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr]">
          <dt className="text-brand-500">Name</dt>
          <dd>{req.customer_name}</dd>
          <dt className="text-brand-500">Phone</dt>
          <dd>
            {req.customer_phone} ({req.contact_method === "whatsapp" ? "WhatsApp" : "phone call"})
          </dd>
          <dt className="text-brand-500">Collection</dt>
          <dd>{req.fulfilment === "delivery" ? `Delivery to ${req.delivery_address}` : "Collect from the retailer"}</dd>
          {req.notes && (
            <>
              <dt className="text-brand-500">Notes</dt>
              <dd className="whitespace-pre-wrap">{req.notes}</dd>
            </>
          )}
        </dl>
        )}
      </section>

      {received && (
        <section className="card mt-6 space-y-3" aria-labelledby="wa-heading">
          <h2 id="wa-heading" className="font-semibold text-brand-900">
            Message the retailer on WhatsApp (optional)
          </h2>
          {req.whatsapp.available && req.whatsapp.url ? (
            <>
              <p className="text-sm text-brand-600">
                Sends your reference and the products to {req.whatsapp.retailer_name}. Your address and notes are not
                included. Nothing is sent until you press send in WhatsApp.
              </p>
              <a href={req.whatsapp.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Open WhatsApp
              </a>
            </>
          ) : (
            <p className="text-sm text-brand-600">{req.whatsapp.reason} We’ll pass your request on.</p>
          )}
        </section>
      )}

      {actionError && (
        <Alert tone="error" className="mt-6">
          {actionError}
        </Alert>
      )}
      {received && (
        <div className="mt-6">
          {confirmingCancel ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-brand-700">Cancel this request?</span>
              <button type="button" className="btn-secondary" onClick={cancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Yes, cancel request"}
              </button>
              <button type="button" className="text-sm underline" onClick={() => setConfirmingCancel(false)}>
                Keep it
              </button>
            </div>
          ) : (
            <button type="button" className="text-sm text-red-700 underline" onClick={() => setConfirmingCancel(true)}>
              Cancel request
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderRequestPage() {
  return (
    <RequireAuth>
      <RequestDetail />
    </RequireAuth>
  );
}
