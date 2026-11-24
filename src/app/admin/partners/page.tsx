"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, ConfirmRequest } from "@/components/admin/catalogue/ConfirmDialog";
import { CatalogueNav, formatWhen } from "@/components/admin/catalogue/shared";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState, Spinner } from "@/components/ui/States";
import { api } from "@/lib/api";
import { adminCatalogApi, adminError, FIELD_LABEL } from "@/lib/adminCatalog";
import type { AdminRetailer } from "@/lib/catalog";

interface ApplicationRow {
  id: string;
  user_email: string | null;
  user_name: string | null;
  shop_name: string;
  city: string | null;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  retailer: { id: string; name: string } | null;
  decided_by_email: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  created_at: string;
}

interface MemberRow {
  id: string;
  retailer_id: string;
  retailer_name: string;
  user_email: string | null;
  role: string;
  status: "active" | "suspended";
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by_email: string | null;
  created_at: string;
}

interface ChangeRow {
  id: string;
  identity_id: string;
  product_name: string | null;
  product_status: string | null;
  retailer_name: string | null;
  requested_by_email: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decision_reason: string | null;
  decided_by_email: string | null;
  created_at: string;
}

const BASE = "/api/v1/admin/partners";
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "(empty)" : Array.isArray(v) ? v.join(", ") : String(v));

function Partners() {
  const [apps, setApps] = useState<ApplicationRow[] | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [retailers, setRetailers] = useState<AdminRetailer[]>([]);
  const [linkTo, setLinkTo] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api.get<ApplicationRow[]>(`${BASE}/applications`),
      api.get<MemberRow[]>(`${BASE}/members`),
      api.get<ChangeRow[]>(`${BASE}/change-requests`),
      adminCatalogApi.retailers(),
    ])
      .then(([a, m, c, r]) => {
        setApps(a);
        setMembers(m);
        setChanges(c);
        setRetailers(r);
        setError(null);
      })
      .catch((err) => setError(adminError(err, "Could not load partner data.")));
  }, []);
  useEffect(load, [load]);

  const act = (req: Omit<ConfirmRequest, "onConfirm">, run: (reason: string) => Promise<unknown>) =>
    setConfirmReq({
      ...req,
      onConfirm: async (reason) => {
        try {
          await run(reason);
        } catch (err) {
          throw new Error(adminError(err, "That didn’t work."));
        }
        load();
      },
    });

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!apps) return <Spinner label="Loading partners" />;
  const pendingApps = apps.filter((a) => a.status === "PENDING");
  const pendingChanges = changes.filter((c) => c.status === "PENDING");

  return (
    <div className="container-page space-y-8">
      <h1 className="display text-4xl">Partners</h1>
      <CatalogueNav />

      <section className="space-y-3" aria-label="Applications">
        <h2 className="text-xl font-semibold text-brand-900">Applications waiting ({pendingApps.length})</h2>
        {pendingApps.length === 0 && <p className="text-sm text-brand-600">No applications waiting.</p>}
        {pendingApps.map((a) => (
          <div key={a.id} className="card space-y-2 text-sm">
            <p className="font-semibold text-brand-900">
              {a.shop_name}
              {a.city ? `, ${a.city}` : ""}
            </p>
            <p className="text-xs text-brand-600">
              {a.user_name} · {a.user_email} · applied {formatWhen(a.created_at)}
            </p>
            {a.message && <p className="whitespace-pre-line text-brand-800">“{a.message}”</p>}
            <p className="text-xs text-amber-900">Check that this person really runs the shop before approving (for example by phone or a visit).</p>
            <label className="block text-xs">
              <span className="label">Link to</span>
              <select className="input" value={linkTo[a.id] ?? ""} onChange={(e) => setLinkTo((l) => ({ ...l, [a.id]: e.target.value }))}>
                <option value="">Create a new shop named “{a.shop_name}”</option>
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    Existing shop: {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  act(
                    { title: `Approve ${a.user_email}?`, body: "They will be able to manage this shop’s products, prices, stock and imports. Products still need your approval to be published.", confirmLabel: "Approve" },
                    () => api.post(`${BASE}/applications/${a.id}/approve`, linkTo[a.id] ? { retailer_id: linkTo[a.id] } : undefined)
                  )
                }
              >
                Approve
              </button>
              <button
                type="button"
                className="btn-secondary !text-red-700"
                onClick={() =>
                  act(
                    { title: "Reject this application?", body: "The applicant sees your reason.", confirmLabel: "Reject", danger: true, reasonLabel: "Reason shown to the applicant" },
                    (reason) => api.post(`${BASE}/applications/${a.id}/reject`, { reason })
                  )
                }
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3" aria-label="Change requests">
        <h2 className="text-xl font-semibold text-brand-900">Proposed product changes ({pendingChanges.length} waiting)</h2>
        {changes.length === 0 && <p className="text-sm text-brand-600">No change requests.</p>}
        {changes.map((c) => (
          <div key={c.id} className="card space-y-1 text-sm">
            <p className="font-semibold text-brand-900">
              <Link href={`/admin/catalogue/${c.identity_id}`} className="underline">
                {c.product_name}
              </Link>{" "}
              <span className="text-xs font-normal text-brand-500">
                ({c.product_status?.toLowerCase()}) · from {c.retailer_name} ({c.requested_by_email}) · {formatWhen(c.created_at)}
              </span>
            </p>
            {Object.entries(c.changes).map(([f, v]) => (
              <p key={f}>
                <span className="font-semibold">{FIELD_LABEL[f] ?? f}:</span>{" "}
                <span className="text-brand-500 line-through">{show(v.from)}</span> → {show(v.to)}
              </p>
            ))}
            <p className="text-xs text-brand-700">Reason: “{c.reason}”</p>
            {c.status === "PENDING" ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    act(
                      { title: "Approve this change?", body: "It is applied to the product. A published product stays published if it is still complete; otherwise it returns to draft.", confirmLabel: "Approve change" },
                      () => api.post(`${BASE}/change-requests/${c.id}/approve`)
                    )
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn-secondary !text-red-700"
                  onClick={() =>
                    act(
                      { title: "Reject this change?", body: "The partner sees your reason.", confirmLabel: "Reject change", danger: true, reasonLabel: "Reason shown to the partner" },
                      (reason) => api.post(`${BASE}/change-requests/${c.id}/reject`, { reason })
                    )
                  }
                >
                  Reject
                </button>
              </div>
            ) : (
              <p className="text-xs">
                {c.status.toLowerCase()} by {c.decided_by_email}
                {c.decision_reason ? ` — “${c.decision_reason}”` : ""}
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="card overflow-x-auto" aria-label="Partner access">
        <h2 className="mb-2 text-xl font-semibold text-brand-900">Partner access</h2>
        {members.length === 0 ? (
          <p className="text-sm text-brand-600">No partners yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-brand-500">
                <th className="py-2 pr-3">Person</th>
                <th className="py-2 pr-3">Shop</th>
                <th className="py-2 pr-3">Access</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-brand-50 align-top">
                  <td className="py-2 pr-3">
                    {m.user_email}
                    <span className="block text-xs text-brand-500">{m.role}</span>
                  </td>
                  <td className="py-2 pr-3">{m.retailer_name}</td>
                  <td className="py-2 pr-3 text-xs">
                    {m.status === "active" ? (
                      "Active"
                    ) : (
                      <span className="text-red-700">
                        Suspended {formatWhen(m.suspended_at)} by {m.suspended_by_email}: “{m.suspended_reason}”
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-xs">
                    {m.status === "active" ? (
                      <button
                        type="button"
                        className="text-red-700 underline"
                        onClick={() =>
                          act(
                            { title: `Suspend ${m.user_email} at ${m.retailer_name}?`, body: "They lose access to this shop in the partner portal immediately. Nothing is deleted.", confirmLabel: "Suspend access", danger: true, reasonLabel: "Reason (shown to the partner)" },
                            (reason) => api.post(`${BASE}/members/${m.id}/suspend`, { reason })
                          )
                        }
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="underline"
                        onClick={() =>
                          act(
                            { title: `Restore ${m.user_email}’s access?`, body: "They can manage this shop again.", confirmLabel: "Restore access" },
                            () => api.post(`${BASE}/members/${m.id}/reactivate`)
                          )
                        }
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}

export default function AdminPartnersPage() {
  return (
    <RequireAuth adminOnly>
      <Partners />
    </RequireAuth>
  );
}
