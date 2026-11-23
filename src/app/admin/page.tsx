"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert } from "@/components/ui/States";
import { api, errorMessage, Formula, FormulationRule, Ingredient, Order, User } from "@/lib/api";
import { AdminCatalogProduct, AdminRetailer } from "@/lib/catalog";
import { ADMIN_ACTIONS, AdminOrderRequest, orderRequestApi, phoneError } from "@/lib/orderRequests";
import { formatPrice } from "@/lib/product";

type Tab = "customers" | "formulas" | "ingredients" | "rules" | "orders" | "catalog" | "requests" | "lab" | "audit";

interface LabDispatchRow {
  id: string;
  order_id: string;
  request_id: string;
  status: string;
  response_code: number | null;
  sent_at: string;
}

interface WebhookEventRow {
  id: string;
  request_id: string;
  event_type: string;
  order_id: string | null;
  signature_valid: boolean;
  processed: boolean;
  received_at: string;
}

interface AuditRow {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "formulas", label: "Formulas" },
  { key: "ingredients", label: "Ingredients" },
  { key: "rules", label: "Formulation Rules" },
  { key: "orders", label: "Orders" },
  { key: "catalog", label: "Catalogue" },
  { key: "requests", label: "Order requests" },
  { key: "lab", label: "Lab Events" },
  { key: "audit", label: "Audit Log" },
];

function AdminContent() {
  const [tab, setTab] = useState<Tab>("customers");
  const [customers, setCustomers] = useState<User[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [rules, setRules] = useState<FormulationRule[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dispatches, setDispatches] = useState<LabDispatchRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEventRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [catalog, setCatalog] = useState<AdminCatalogProduct[]>([]);
  const [retailers, setRetailers] = useState<AdminRetailer[]>([]);
  const [requests, setRequests] = useState<AdminOrderRequest[]>([]);
  const [waDrafts, setWaDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  // Previously every load/action failure was silent (unhandled promise).
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  function reload() {
    const loads: [string, Promise<unknown>][] = [
      ["customers", api.get<User[]>("/api/v1/admin/customers").then(setCustomers)],
      ["formulas", api.get<Formula[]>("/api/v1/admin/formulas").then(setFormulas)],
      ["ingredients", api.get<Ingredient[]>("/api/v1/ingredients").then(setIngredients)],
      ["formulation rules", api.get<FormulationRule[]>("/api/v1/formulation-rules").then(setRules)],
      ["orders", api.get<Order[]>("/api/v1/admin/orders").then(setOrders)],
      ["lab dispatches", api.get<LabDispatchRow[]>("/api/v1/admin/lab-dispatches").then(setDispatches)],
      ["webhook events", api.get<WebhookEventRow[]>("/api/v1/admin/webhook-events").then(setWebhooks)],
      ["audit log", api.get<AuditRow[]>("/api/v1/audit").then(setAudit)],
      ["catalogue", api.get<AdminCatalogProduct[]>("/api/v1/admin/catalog/products").then(setCatalog)],
      ["retailers", api.get<AdminRetailer[]>("/api/v1/admin/catalog/retailers").then(setRetailers)],
      ["order requests", orderRequestApi.adminList().then(setRequests)],
    ];
    Promise.allSettled(loads.map(([, p]) => p)).then((results) =>
      setLoadErrors(results.flatMap((r, i) => (r.status === "rejected" ? [loads[i][0]] : [])))
    );
  }

  useEffect(reload, []);

  async function runAction(id: string, path: string, failure: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.post(path);
      reload();
    } catch (err) {
      setActionError(errorMessage(err, failure));
    } finally {
      setBusyId(null);
    }
  }

  const approveRule = (id: string) => runAction(id, `/api/v1/formulation-rules/${id}/approve`, "Could not approve the rule.");
  const disableRule = (id: string) => runAction(id, `/api/v1/formulation-rules/${id}/disable`, "Could not disable the rule.");
  const publishProduct = (id: string) =>
    runAction(id, `/api/v1/admin/catalog/products/${id}/publish`, "Could not publish the product.");
  const archiveProduct = (id: string) =>
    runAction(id, `/api/v1/admin/catalog/products/${id}/archive`, "Could not archive the product.");
  async function setRequestStatus(id: string, status: Parameters<typeof orderRequestApi.adminSetStatus>[1]) {
    setBusyId(id);
    setActionError(null);
    try {
      await orderRequestApi.adminSetStatus(id, status);
      reload();
    } catch (err) {
      setActionError(errorMessage(err, "Could not update the request."));
    } finally {
      setBusyId(null);
    }
  }

  async function saveWhatsApp(r: AdminRetailer) {
    const raw = (waDrafts[r.id] ?? r.whatsapp_number ?? "").replace(/[\s\-().]/g, "");
    const invalid = raw ? phoneError(raw) : null;
    if (invalid) {
      setActionError(`WhatsApp number for ${r.name}: ${invalid}`);
      return;
    }
    setBusyId(r.id);
    setActionError(null);
    try {
      await api.patch(`/api/v1/admin/catalog/retailers/${r.id}`, { whatsapp_number: raw || null });
      setWaDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== r.id)));
      reload();
    } catch (err) {
      setActionError(errorMessage(err, "Could not save the WhatsApp number."));
    } finally {
      setBusyId(null);
    }
  }

  const dispatchToLab = (orderId: string) =>
    runAction(orderId, `/api/v1/lab/dispatch/${orderId}`, "Could not dispatch the order to the lab.");

  return (
    <div className="container-page space-y-6">
      <h1 className="display text-4xl">Admin</h1>

      {loadErrors.length > 0 && (
        <Alert tone="error">
          Could not load: {loadErrors.join(", ")}.{" "}
          <button type="button" className="font-semibold underline underline-offset-4" onClick={reload}>
            Retry
          </button>
        </Alert>
      )}
      {actionError && <Alert tone="error">{actionError}</Alert>}

      <div className="flex flex-wrap gap-2 border-b border-brand-100 pb-2" role="group" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`text-sm px-3 py-1.5 rounded-lg ${
              tab === t.key ? "bg-brand-600 text-white" : "text-brand-600 hover:bg-brand-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "customers" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-400 border-b border-brand-100">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-brand-50">
                  <td className="py-2 pr-4">{c.full_name}</td>
                  <td className="py-2 pr-4">{c.email}</td>
                  <td className="py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "formulas" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-400 border-b border-brand-100">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {formulas.map((f) => (
                <tr key={f.id} className="border-b border-brand-50">
                  <td className="py-2 pr-4 font-mono">{f.formula_code}</td>
                  <td className="py-2 pr-4">{f.status}</td>
                  <td className="py-2">{new Date(f.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ingredients" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-400 border-b border-brand-100">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Max %</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((i) => (
                <tr key={i.id} className="border-b border-brand-50">
                  <td className="py-2 pr-4 font-mono">{i.code}</td>
                  <td className="py-2 pr-4">{i.name}</td>
                  <td className="py-2 pr-4">{i.max_concentration_percent}%</td>
                  <td className="py-2">
                    {i.status}
                    {i.is_development_placeholder && (
                      <span className="ml-2 text-xs text-yellow-600">dev placeholder</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "rules" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-400 border-b border-brand-100">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Condition</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-brand-50">
                  <td className="py-2 pr-4 font-mono">{r.code}</td>
                  <td className="py-2 pr-4">
                    {r.condition_metric} {r.condition_operator} {r.condition_threshold}
                  </td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 space-x-2">
                    {r.status === "DRAFT" && (
                      <button
                        className="text-brand-600 underline text-xs"
                        disabled={busyId === r.id}
                        onClick={() => approveRule(r.id)}
                      >
                        Approve
                      </button>
                    )}
                    {r.status !== "DISABLED" && (
                      <button
                        className="text-red-500 underline text-xs"
                        disabled={busyId === r.id}
                        onClick={() => disableRule(r.id)}
                      >
                        Disable
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orders" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-400 border-b border-brand-100">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-brand-50">
                  <td className="py-2 pr-4 font-mono">{o.order_code}</td>
                  <td className="py-2 pr-4">{o.status}</td>
                  <td className="py-2">
                    {o.status === "VALIDATED" && (
                      <button
                        className="text-brand-600 underline text-xs"
                        disabled={busyId === o.id}
                        onClick={() => dispatchToLab(o.id)}
                      >
                        Dispatch to lab
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "catalog" && (
        <div className="space-y-3">
          <p className="text-sm text-brand-600">
            Publish a product only after checking its details against the real label or partner data. Publishing
            records you as the reviewer. Editing a published product returns it to draft. Bulk import:{" "}
            <code>python -m app.catalog.importer file.csv --retailer &quot;Name&quot;</code> (backend).
          </p>
          <div className="card overflow-x-auto">
            {catalog.length === 0 ? (
              <p className="text-sm text-brand-600">No catalogue products yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-500 border-b border-brand-100">
                    <th className="py-2 pr-4">Product</th>
                    <th className="py-2 pr-4">Retailer</th>
                    <th className="py-2 pr-4">Ingredients</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((p) => (
                    <tr key={p.id} className="border-b border-brand-50 align-top">
                      <td className="py-2 pr-4">
                        {p.name}
                        <span className="block font-mono text-xs text-brand-500">{p.sku}</span>
                        {p.is_test_fixture && <span className="text-xs text-amber-800">test fixture</span>}
                      </td>
                      <td className="py-2 pr-4">{p.retailer.name}</td>
                      <td className="py-2 pr-4">{p.ingredients_inci ? "Listed" : <span className="text-amber-800">Not provided</span>}</td>
                      <td className="py-2 pr-4">{p.status}</td>
                      <td className="py-2 space-x-3 whitespace-nowrap">
                        {p.status !== "PUBLISHED" && (
                          <button
                            className="text-brand-700 underline text-xs"
                            disabled={busyId === p.id}
                            onClick={() => publishProduct(p.id)}
                          >
                            Publish (details checked)
                          </button>
                        )}
                        {p.status !== "ARCHIVED" && (
                          <button
                            className="text-red-700 underline text-xs"
                            disabled={busyId === p.id}
                            onClick={() => archiveProduct(p.id)}
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h2 className="pt-4 font-semibold text-brand-900">Retailers and WhatsApp ordering</h2>
          <p className="text-sm text-brand-600">
            WhatsApp ordering is offered only for retailers with a number here, in international format (+ and country
            code). Enter only a number the retailer has confirmed is theirs. Clear it and save to turn WhatsApp ordering
            off.
          </p>
          <div className="card overflow-x-auto">
            {retailers.length === 0 ? (
              <p className="text-sm text-brand-600">No retailers yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-500 border-b border-brand-100">
                    <th className="py-2 pr-4">Retailer</th>
                    <th className="py-2 pr-4">WhatsApp number</th>
                    <th className="py-2">Save</th>
                  </tr>
                </thead>
                <tbody>
                  {retailers.map((r) => (
                    <tr key={r.id} className="border-b border-brand-50 align-top">
                      <td className="py-2 pr-4">
                        {r.name}
                        {!r.is_active && <span className="block text-xs text-amber-800">inactive</span>}
                        {r.is_test_fixture && <span className="block text-xs text-amber-800">test fixture</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          aria-label={`WhatsApp number for ${r.name}`}
                          className="input max-w-[14rem]"
                          type="tel"
                          placeholder="Not set"
                          value={waDrafts[r.id] ?? r.whatsapp_number ?? ""}
                          onChange={(e) => setWaDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                        />
                      </td>
                      <td className="py-2">
                        <button
                          className="text-brand-700 underline text-xs"
                          disabled={busyId === r.id || waDrafts[r.id] === undefined}
                          onClick={() => saveWhatsApp(r)}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-3">
          <p className="text-sm text-brand-600">
            Website requests for partner products. They are not sent to retailers automatically: contact the retailer,
            then record their answer here. Customers see these statuses. No payment is taken on this website.
          </p>
          <div className="card overflow-x-auto">
            {requests.length === 0 ? (
              <p className="text-sm text-brand-600">No order requests yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-500 border-b border-brand-100">
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2 pr-4">Retailer and items</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Record retailer answer</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-brand-50 align-top">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.reference}
                        <span className="block font-sans text-brand-500">{new Date(r.created_at).toLocaleString()}</span>
                        {r.is_test_fixture && <span className="block font-sans text-amber-800">test data</span>}
                      </td>
                      <td className="py-2 pr-4">
                        {r.retailer.name}
                        <ul className="text-xs text-brand-600">
                          {r.items.map((i) => (
                            <li key={i.product_id}>
                              {i.quantity} × {i.product_name} ({i.sku})
                            </li>
                          ))}
                        </ul>
                        <span className="text-xs text-brand-500">
                          {r.total_amount != null
                            ? `Listed total ${formatPrice(r.total_amount, r.currency)}`
                            : "Total not known"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {r.customer_name}
                        <span className="block">
                          {r.customer_phone} ({r.contact_method === "whatsapp" ? "WhatsApp" : "call"})
                        </span>
                        <span className="block text-brand-500">{r.customer_email}</span>
                        <span className="block">
                          {r.fulfilment === "delivery" ? `Delivery: ${r.delivery_address}` : "Pickup"}
                        </span>
                        {r.notes && <span className="block whitespace-pre-wrap text-brand-500">Note: {r.notes}</span>}
                      </td>
                      <td className="py-2 pr-4">{r.status}</td>
                      <td className="py-2 space-x-3 whitespace-nowrap">
                        {ADMIN_ACTIONS[r.status].map((a) => (
                          <button
                            key={a.status}
                            className={`underline text-xs ${
                              a.status === "CONFIRMED" || a.status === "COMPLETED" ? "text-brand-700" : "text-red-700"
                            }`}
                            disabled={busyId === r.id}
                            onClick={() => setRequestStatus(r.id, a.status)}
                          >
                            {a.label}
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "lab" && (
        <div className="space-y-6">
          <div className="card overflow-x-auto">
            <h3 className="font-semibold text-brand-700 mb-2">Dispatches</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brand-400 border-b border-brand-100">
                  <th className="py-2 pr-4">Request ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Sent</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => (
                  <tr key={d.id} className="border-b border-brand-50">
                    <td className="py-2 pr-4 font-mono text-xs">{d.request_id}</td>
                    <td className="py-2 pr-4">{d.status}</td>
                    <td className="py-2">{new Date(d.sent_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card overflow-x-auto">
            <h3 className="font-semibold text-brand-700 mb-2">Webhook events</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brand-400 border-b border-brand-100">
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Signature</th>
                  <th className="py-2">Received</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((w) => (
                  <tr key={w.id} className="border-b border-brand-50">
                    <td className="py-2 pr-4">{w.event_type}</td>
                    <td className="py-2 pr-4">{w.signature_valid ? "valid" : "invalid"}</td>
                    <td className="py-2">{new Date(w.received_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-400 border-b border-brand-100">
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Resource</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-b border-brand-50">
                  <td className="py-2 pr-4">{a.action}</td>
                  <td className="py-2 pr-4">{a.resource_type}</td>
                  <td className="py-2">{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth adminOnly>
      <AdminContent />
    </RequireAuth>
  );
}
