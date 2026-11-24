"use client";

import { useCallback, useEffect, useState } from "react";
import { CatalogueNav, formatWhen } from "@/components/admin/catalogue/shared";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState, Spinner } from "@/components/ui/States";
import { api } from "@/lib/api";
import { adminError } from "@/lib/adminCatalog";

interface Summary {
  days: number;
  conversations_started: number;
  events: { kind: string; code: string | null; count: number }[];
  feedback_total: number;
  feedback_helpful: number;
  feedback: {
    id: string;
    helpful: boolean;
    reason: string | null;
    comment: string | null;
    language: string;
    products: string[];
    created_at: string;
  }[];
}

const KIND_LABEL: Record<string, string> = {
  parser_error: "AI parser unavailable (rules used instead)",
  ai_output_rejected: "AI values dropped (not found in the message)",
  merge_error: "Invalid needs rejected",
  not_understood: "Messages not understood",
  clarification: "Follow-up questions asked",
  safety_notice: "Safety notices shown",
  no_results: "Searches with no suitable product",
};

function AssistantSummary() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    api
      .get<Summary>(`/api/v1/admin/assistant/summary?days=${days}`)
      .then(setData)
      .catch((err) => setError(adminError(err, "Could not load the assistant summary.")));
  }, [days]);
  useEffect(load, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Spinner label="Loading assistant summary" />;

  return (
    <div className="container-page space-y-6">
      <h1 className="display text-4xl">Beauty Assistant</h1>
      <CatalogueNav />
      <p className="max-w-2xl text-sm text-brand-700">
        Counts only. Customer messages are never stored, so they can’t be shown here. Feedback comments are shown without the customer’s identity.
      </p>
      <label className="flex items-center gap-2 text-sm">
        Period
        <select className="input !w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 30, 90, 365].map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </label>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Totals">
        <div className="card">
          <p className="text-3xl font-semibold">{data.conversations_started}</p>
          <p className="text-sm text-brand-600">Conversations started</p>
        </div>
        <div className="card">
          <p className="text-3xl font-semibold">{data.feedback_total}</p>
          <p className="text-sm text-brand-600">Feedback received</p>
        </div>
        <div className="card">
          <p className="text-3xl font-semibold">{data.feedback_total ? `${data.feedback_helpful} / ${data.feedback_total}` : "—"}</p>
          <p className="text-sm text-brand-600">Rated helpful</p>
        </div>
      </section>
      <section className="card overflow-x-auto" aria-label="Events">
        <h2 className="mb-2 text-xl font-semibold text-brand-900">Errors and events</h2>
        {data.events.length === 0 ? (
          <p className="text-sm text-brand-600">Nothing recorded in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-brand-500">
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Detail</th>
                <th className="py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={`${e.kind}-${e.code}`} className="border-b border-brand-50">
                  <td className="py-2 pr-3">{KIND_LABEL[e.kind] ?? e.kind}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{e.code ?? "—"}</td>
                  <td className="py-2">{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="space-y-2" aria-label="Feedback">
        <h2 className="text-xl font-semibold text-brand-900">Latest feedback</h2>
        {data.feedback.length === 0 && <p className="text-sm text-brand-600">No feedback in this period.</p>}
        {data.feedback.map((f) => (
          <div key={f.id} className="card text-sm">
            <p className="font-semibold">
              {f.helpful ? "Helpful" : "Not helpful"}
              {f.reason ? ` · ${f.reason.replace(/_/g, " ")}` : ""}
              <span className="font-normal text-brand-500"> · {f.language} · {formatWhen(f.created_at)}</span>
            </p>
            {f.comment && <p className="mt-1 whitespace-pre-line">“{f.comment}”</p>}
            {f.products.length > 0 && <p className="mt-1 text-xs text-brand-600">Products shown: {f.products.join(", ")}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}

export default function AdminAssistantPage() {
  return (
    <RequireAuth adminOnly>
      <AssistantSummary />
    </RequireAuth>
  );
}
