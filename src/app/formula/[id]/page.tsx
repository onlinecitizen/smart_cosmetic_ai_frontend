"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { api, Formula, Order } from "@/lib/api";

function FormulaContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [formula, setFormula] = useState<Formula | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Formula>(`/api/v1/formulas/${id}`).then(setFormula);
  }, [id]);

  async function createOrder() {
    if (!formula) return;
    setBusy(true);
    setError(null);
    try {
      const order = await api.post<Order>("/api/v1/orders", { formula_id: formula.id, quantity: 1 });
      router.push(`/orders/${order.id}`);
    } catch {
      setError("Could not create the order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!formula) return <p className="text-brand-400 text-sm">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="card space-y-4">
        <div className="flex justify-between items-start">
          <h1 className="text-xl font-mono text-brand-800">{formula.formula_code}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              formula.status === "VALIDATED" ? "bg-brand-100 text-brand-700" : "bg-red-50 text-red-600"
            }`}
          >
            {formula.status}
          </span>
        </div>
        <p className="text-sm text-brand-500">
          Base emulsion: {formula.base_emulsion_ml} ml &middot; Version {formula.formula_version} &middot; Diagnostic
          model {formula.diagnostic_model_version}
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-400 border-b border-brand-100">
              <th className="py-2">Ingredient</th>
              <th className="py-2">Volume (ml)</th>
              <th className="py-2">Concentration</th>
            </tr>
          </thead>
          <tbody>
            {formula.items.map((item) => (
              <tr key={item.ingredient_id} className="border-b border-brand-50">
                <td className="py-2 font-mono text-xs">{item.ingredient_id.slice(0, 8)}</td>
                <td className="py-2">{item.volume_ml}</td>
                <td className="py-2">
                  {item.percentage}% <span className="text-brand-300">/ max {item.max_allowed_percentage}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {formula.validation_errors.length > 0 && (
          <div className="text-sm text-red-600 space-y-1">
            {formula.validation_errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {formula.status === "VALIDATED" && (
          <button className="btn-primary" onClick={createOrder} disabled={busy}>
            {busy ? "Creating order..." : "Order this formula"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function FormulaPage() {
  return (
    <RequireAuth>
      <FormulaContent />
    </RequireAuth>
  );
}
