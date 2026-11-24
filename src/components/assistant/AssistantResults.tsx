"use client";

import Link from "next/link";
import { useState } from "react";
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { Alert } from "@/components/ui/States";
import { errorMessage } from "@/lib/api";
import { AssistantLang, assistantApi, Recommendations, safeProductHref, ui, UiKey } from "@/lib/assistant";

function Feedback({ lang, conversationId, productIds, reasons }: { lang: AssistantLang; conversationId: string; productIds: string[]; reasons: string[] }) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(h: boolean) {
    setError(null);
    try {
      await assistantApi.feedback({
        conversation_id: conversationId,
        helpful: h,
        reason: h ? undefined : reason || undefined,
        comment: h ? undefined : comment.trim() || undefined,
        product_ids: productIds,
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, "We couldn’t send your feedback."));
    }
  }

  if (sent) return <p className="text-sm text-brand-700" role="status">{ui(lang, "thanks")}</p>;
  return (
    <div className="card space-y-2 text-sm">
      <p className="font-semibold text-brand-900">{ui(lang, "helpful")}</p>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={() => send(true)}>
          {ui(lang, "yes")}
        </button>
        <button type="button" className="btn-secondary" aria-pressed={helpful === false} onClick={() => setHelpful(false)}>
          {ui(lang, "no")}
        </button>
      </div>
      {helpful === false && (
        <div className="space-y-2">
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} aria-label={ui(lang, "helpful")}>
            <option value="">—</option>
            {reasons.map((r) => (
              <option key={r} value={r}>
                {ui(lang, `reason_${r}` as UiKey)}
              </option>
            ))}
          </select>
          <label className="block">
            <span className="label">{ui(lang, "commentLabel")}</span>
            <textarea className="input" maxLength={500} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          <button type="button" className="btn-primary" onClick={() => send(false)}>
            {ui(lang, "sendFeedback")}
          </button>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

/** Products from the reviewed catalogue, each with the facts it was chosen on. */
export function AssistantResults({
  lang,
  conversationId,
  recs,
  categoryLabel,
  feedbackReasons,
}: {
  lang: AssistantLang;
  conversationId: string;
  recs: Recommendations;
  categoryLabel: (code: string) => string;
  feedbackReasons: string[];
}) {
  return (
    <section className="space-y-4" aria-labelledby="assistant-results">
      <h2 id="assistant-results" className="text-xl font-semibold text-brand-900">
        {ui(lang, "results")}
      </h2>
      <p className="text-sm text-brand-800">{recs.message}</p>
      {recs.items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {recs.items.map((item) => {
            const view = safeProductHref(item.product_url);
            const request = safeProductHref(item.request_url);
            return (
              <li key={item.product.id}>
                <CatalogProductCard product={item.product} categoryLabel={categoryLabel} headingLevel="h3">
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="font-semibold text-brand-900">{ui(lang, "why")}</p>
                    <ul className="space-y-1">
                      {item.reasons.map((r) => (
                        <li key={r.text}>
                          ✓ {r.text} <span className="block text-xs text-brand-500">{r.basis_label}</span>
                        </li>
                      ))}
                    </ul>
                    {item.cautions.length > 0 && (
                      <>
                        <p className="font-semibold text-amber-900">{ui(lang, "cautions")}</p>
                        <ul className="space-y-1 text-amber-900">
                          {item.cautions.map((c) => (
                            <li key={c}>• {c}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {view && (
                        <Link href={view} className="btn-secondary">
                          {ui(lang, "view")}
                        </Link>
                      )}
                      {request && (
                        <Link href={request} className="btn-primary">
                          {ui(lang, "request")}
                        </Link>
                      )}
                    </div>
                  </div>
                </CatalogProductCard>
              </li>
            );
          })}
        </ul>
      )}
      {recs.excluded.length > 0 && (
        <details className="card text-sm">
          <summary className="cursor-pointer font-semibold text-brand-900">
            {ui(lang, "leftOut")} ({recs.excluded_count})
          </summary>
          <ul className="mt-2 space-y-1">
            {recs.excluded.map((e) => (
              <li key={e.product_id}>
                <span className="font-semibold">{e.name}</span> ({e.retailer_name}): {e.reasons.join(" ")}
              </li>
            ))}
          </ul>
        </details>
      )}
      <details className="card text-sm">
        <summary className="cursor-pointer font-semibold text-brand-900">{ui(lang, "limitations")}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {recs.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </details>
      <p className="text-xs text-brand-600">{recs.disclaimer}</p>
      <Feedback
        key={recs.items.map((i) => i.product.id).join(",")}
        lang={lang}
        conversationId={conversationId}
        productIds={recs.items.map((i) => i.product.id)}
        reasons={feedbackReasons}
      />
    </section>
  );
}
