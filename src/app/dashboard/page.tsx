"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Reveal } from "@/components/Reveal";
import { Bottle } from "@/components/Bottle";
import { EmptyState, ErrorState, Spinner, StatusBadge } from "@/components/ui/States";
import { api, errorMessage, Formula, Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { orderStatusInfo } from "@/lib/orderStatus";
import { firstName } from "@/lib/product";

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function DashboardContent() {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.get<Formula[]>("/api/v1/formulas"), api.get<Order[]>("/api/v1/orders")])
      .then(([f, o]) => {
        setFormulas(f);
        setOrders(o);
      })
      // Previously swallowed, which showed "No formulas yet" when loading failed.
      .catch((err) => setError(errorMessage(err, "We couldn’t load your formulas and orders.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const name = firstName(user?.full_name);
  const latest = formulas.find((f) => f.status === "VALIDATED");
  const codeById = Object.fromEntries(formulas.map((f) => [f.id, f.formula_code]));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <section className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <p className="eyebrow">Your account</p>
          <h1 className="display mt-4 text-4xl sm:text-6xl">Welcome back{name ? `, ${name}` : ""}.</h1>
          <p className="mt-4 max-w-md text-brand-600">
            Your formulas and orders live here. You can take a new assessment at any time.
          </p>
          <Link href="/analyze" className="btn-primary mt-8">
            New skin assessment
          </Link>
        </Reveal>
        <div className="mx-auto hidden h-72 w-40 md:block">
          <Bottle name={name} code={latest?.formula_code} className="h-full w-full" />
        </div>
      </section>

      {error && <ErrorState className="mt-12" message={error} onRetry={load} />}

      <section className="mt-14 md:mt-20">
        <h2 className="eyebrow mb-6">Your formulas</h2>
        {loading ? (
          <Spinner label="Loading your formulas" />
        ) : error ? null : formulas.length === 0 ? (
          <EmptyState title="No formulas yet" body="Start an assessment to create your first formula." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formulas.map((f, i) => (
              <Reveal key={f.id} delay={Math.min(i, 5) * 80}>
                <Link
                  href={`/formula/${f.id}`}
                  className="card block h-full transition duration-500 hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-sm tracking-wider text-brand-900">{f.formula_code}</span>
                    <StatusBadge
                      label={f.status === "VALIDATED" ? "Orderable" : "Not orderable"}
                      tone={f.status === "VALIDATED" ? "progress" : "stopped"}
                    />
                  </div>
                  <p className="mt-6 text-sm text-brand-600">
                    {f.items.length} active{f.items.length === 1 ? "" : "s"} · {fmtDate(f.created_at)}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="eyebrow mb-6">Your orders</h2>
        {loading ? (
          <Spinner label="Loading your orders" />
        ) : error ? null : orders.length === 0 ? (
          <EmptyState title="No orders yet" body="Open a formula to send an order request." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((o, i) => (
              <Reveal key={o.id} delay={Math.min(i, 5) * 80}>
                <Link
                  href={`/orders/${o.id}`}
                  className="card block h-full transition duration-500 hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-sm tracking-wider text-brand-900">{o.order_code}</span>
                    <StatusBadge label={orderStatusInfo(o.status).label} tone={orderStatusInfo(o.status).tone} />
                  </div>
                  <p className="mt-6 text-sm text-brand-500">
                    {codeById[o.formula_id] ?? "Personalized Serum"} · {fmtDate(o.created_at)}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
