"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Reveal } from "@/components/Reveal";
import { Bottle } from "@/components/Bottle";
import { api, Formula, Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ORDER_STATUS_LABEL, firstName } from "@/lib/product";

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function DashboardContent() {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Formula[]>("/api/v1/formulas"), api.get<Order[]>("/api/v1/orders")])
      .then(([f, o]) => {
        setFormulas(f);
        setOrders(o);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const name = firstName(user?.full_name);
  const latest = formulas.find((f) => f.status === "VALIDATED");
  const codeById = Object.fromEntries(formulas.map((f) => [f.id, f.formula_code]));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <section className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <p className="eyebrow">Your account</p>
          <h1 className="display mt-4 text-5xl sm:text-6xl">Welcome back{name ? `, ${name}` : ""}.</h1>
          <p className="mt-4 max-w-md text-brand-600">
            Your formulas and orders live here. Skin changes with the seasons — a new assessment takes about two
            minutes.
          </p>
          <Link href="/analyze" className="btn-primary mt-8">
            New skin assessment
          </Link>
        </Reveal>
        <div className="mx-auto h-72 w-40">
          <Bottle name={name} code={latest?.formula_code} className="h-full w-full" />
        </div>
      </section>

      <section className="mt-20">
        <h2 className="eyebrow mb-6">Your formulas</h2>
        {loading ? (
          <p className="text-sm text-brand-400">Loading…</p>
        ) : formulas.length === 0 ? (
          <div className="card text-sm text-brand-500">No formulas yet. Start an assessment to create your first.</div>
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
                    <span className={`chip ${f.status === "VALIDATED" ? "" : "!border-red-200 !text-red-700"}`}>
                      {f.status === "VALIDATED" ? "Ready" : "Not orderable"}
                    </span>
                  </div>
                  <p className="mt-6 text-sm text-brand-500">
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
          <p className="text-sm text-brand-400">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="card text-sm text-brand-500">No orders yet.</div>
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
                    <span className="chip">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
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
