"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, Spinner, StatusBadge } from "@/components/ui/States";
import { errorMessage } from "@/lib/api";
import { OrderRequest, REQUEST_STATUS_TONE, orderRequestApi } from "@/lib/orderRequests";

function RequestList() {
  const [rows, setRows] = useState<OrderRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await orderRequestApi.list());
    } catch (err) {
      setError(errorMessage(err, "We couldn’t load your requests."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <p className="eyebrow">Partner products</p>
      <h1 className="display mt-4 text-4xl">My requests</h1>
      <p className="mt-3 text-sm text-brand-600">
        Requests you sent to partner retailers. A request isn’t a confirmed order until the retailer confirms it.
      </p>

      <div className="mt-8">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows === null ? (
          <Spinner label="Loading your requests" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No requests yet"
            body="Browse partner products and request one from its page."
            action={{ href: "/products", label: "Browse partner products" }}
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/order-requests/${r.id}`} className="card block transition hover:shadow-lift">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className="font-mono text-sm tracking-wider text-brand-900">{r.reference}</span>
                    <StatusBadge label={r.status_label} tone={REQUEST_STATUS_TONE[r.status] ?? "neutral"} />
                  </div>
                  <p className="mt-3 text-sm text-brand-600">
                    {r.items.map((i) => `${i.quantity} × ${i.product_name}`).join(", ")} · {r.retailer.name}
                  </p>
                  <p className="mt-1 text-xs text-brand-500">
                    {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function OrderRequestsPage() {
  return (
    <RequireAuth>
      <RequestList />
    </RequireAuth>
  );
}
