"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState, Spinner } from "@/components/ui/States";
import { labeller, parseAvoidList } from "@/lib/catalog";
import { MessageKey, useT } from "@/lib/i18n";
import { clearAnswers, isComplete, loadAnswers, QuestionId, StudioAnswers } from "@/lib/studio";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

export default function ReviewPage() {
  const { t } = useT();
  const router = useRouter();
  const { options, error, reload } = useCatalogOptions();
  const [answers, setAnswers] = useState<StudioAnswers | null | undefined>(undefined);

  useEffect(() => setAnswers(loadAnswers()), []);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }
  if (answers === undefined || !options) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner label={t("assess.loading")} />
      </div>
    );
  }
  if (!answers || !answers.skin_type) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="display text-3xl">{t("review.empty")}</p>
        <Link href="/studio/assessment" className="btn-studio mt-8">
          {t("studio.start")}
        </Link>
      </div>
    );
  }

  const skin = labeller([...options.skin_types, { code: "not_sure", label: t("assess.notSure") }]);
  const concern = labeller(options.concerns);
  const avoid = labeller(options.avoid_groups);
  const category = labeller(options.categories);
  const others = parseAvoidList(answers.avoid_text);

  const rows: { id: QuestionId; label: MessageKey; value: string }[] = [
    { id: "skin_type", label: "assess.q.skin_type", value: skin(answers.skin_type) },
    { id: "concerns", label: "assess.q.concerns", value: answers.concerns.map(concern).join(", ") || t("review.none") },
    { id: "avoid_groups", label: "assess.q.avoid_groups", value: answers.avoid_groups.map(avoid).join(", ") || t("review.none") },
    { id: "avoid_ingredients", label: "assess.q.avoid_ingredients", value: others.join(", ") || t("review.none") },
    { id: "category", label: "assess.q.category", value: answers.category ? category(answers.category) : t("assess.any") },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-6">
      <p className="eyebrow">{t("review.eyebrow")}</p>
      <h1 className="display mt-4 text-4xl sm:text-5xl">{t("review.title")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-600">{t("review.lead")}</p>

      <dl className="card mt-8 divide-y divide-brand-200/70 !p-0">
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <dt className="text-xs text-brand-500">{t(r.label)}</dt>
              <dd className="mt-1 font-semibold text-brand-900">{r.value}</dd>
            </div>
            <Link
              href={`/studio/assessment?edit=${r.id}`}
              className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 underline-offset-4 hover:underline"
              aria-label={`${t("review.edit")}: ${t(r.label)}`}
            >
              {t("review.edit")}
            </Link>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="btn-studio"
          disabled={!isComplete(answers)}
          onClick={() => router.push("/studio/results")}
        >
          {t("review.submit")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            clearAnswers();
            router.push("/studio/assessment");
          }}
        >
          {t("review.restart")}
        </button>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-brand-500">{t("studio.safety")}</p>
    </div>
  );
}
