"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { api, Formula, FormulationRule, Ingredient, Order, User } from "@/lib/api";

type Tab = "customers" | "formulas" | "ingredients" | "rules" | "orders" | "lab" | "audit";

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
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    api.get<User[]>("/api/v1/admin/customers").then(setCustomers);
    api.get<Formula[]>("/api/v1/admin/formulas").then(setFormulas);
    api.get<Ingredient[]>("/api/v1/ingredients").then(setIngredients);
    api.get<FormulationRule[]>("/api/v1/formulation-rules").then(setRules);
    api.get<Order[]>("/api/v1/admin/orders").then(setOrders);
    api.get<LabDispatchRow[]>("/api/v1/admin/lab-dispatches").then(setDispatches);
    api.get<WebhookEventRow[]>("/api/v1/admin/webhook-events").then(setWebhooks);
    api.get<AuditRow[]>("/api/v1/audit").then(setAudit);
  }

  useEffect(reload, []);

  async function approveRule(id: string) {
    setBusyId(id);
    try {
      await api.post(`/api/v1/formulation-rules/${id}/approve`);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  async function disableRule(id: string) {
    setBusyId(id);
    try {
      await api.post(`/api/v1/formulation-rules/${id}/disable`);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  async function dispatchToLab(orderId: string) {
    setBusyId(orderId);
    try {
      await api.post(`/api/v1/lab/dispatch/${orderId}`);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-800">Admin</h1>

      <div className="flex flex-wrap gap-2 border-b border-brand-100 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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
