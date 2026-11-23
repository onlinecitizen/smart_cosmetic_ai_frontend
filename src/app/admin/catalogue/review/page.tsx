"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CatalogueNav, formatWhen, ReadinessList } from "@/components/admin/catalogue/shared";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState, Spinner } from "@/components/ui/States";
import { adminCatalogApi, adminError, AdminIdentity } from "@/lib/adminCatalog";

const QUEUES = [
  { status: "PENDING_REVIEW", title: "Waiting for review", empty: "Nothing is waiting for review." },
  { status: "DRAFT", title: "Drafts", empty: "No drafts." },
  { status: "REJECTED", title: "Rejected", empty: "No rejected products." },
];

function Queue() {
  const [data, setData] = useState<Record<string, AdminIdentity[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setData(null);
    Promise.all(QUEUES.map((q) => adminCatalogApi.identities({ status: q.status })))
      .then((lists) => setData(Object.fromEntries(QUEUES.map((q, i) => [q.status, lists[i]]))))
      .catch((err) => setError(adminError(err, "Could not load the review queue.")));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="container-page space-y-6">
      <h1 className="display text-4xl">Review queue</h1>
      <CatalogueNav />
      <p className="text-sm text-brand-600">
        Open a product to check its details against its sources, then approve and publish it, return it for correction or
        reject it. Nothing here is visible to customers.
      </p>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? (
        <Spinner label="Loading the review queue" />
      ) : (
        QUEUES.map((q) => (
          <section key={q.status} className="space-y-2">
            <h2 className="font-semibold text-brand-900">
              {q.title} ({data[q.status].length})
            </h2>
            {data[q.status].length === 0 ? (
              <p className="text-sm text-brand-600">{q.empty}</p>
            ) : (
              <ul className="space-y-2">
                {data[q.status].map((i) => (
                  <li key={i.id} className="card flex flex-wrap items-start justify-between gap-3 text-sm">
                    <div>
                      <Link href={`/admin/catalogue/${i.id}?tab=review`} className="font-semibold underline underline-offset-4">
                        {i.name}
                      </Link>
                      <span className="block text-xs text-brand-500">
                        {[i.brand, i.size_label].filter(Boolean).join(" · ") || "No brand or size yet"} · updated{" "}
                        {formatWhen(i.updated_at)}
                        {i.created_by_email ? ` · added by ${i.created_by_email}` : ""}
                      </span>
                    </div>
                    <ReadinessList readiness={i.readiness} compact />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}

export default function ReviewQueuePage() {
  return (
    <RequireAuth adminOnly>
      <Queue />
    </RequireAuth>
  );
}
