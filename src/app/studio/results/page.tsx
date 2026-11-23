"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RecommendationResults } from "@/components/catalog/RecommendationResults";
import { RoutineMap } from "@/components/studio/RoutineMap";
import { ErrorState, Spinner } from "@/components/ui/States";
import { errorMessage } from "@/lib/api";
import { catalogApi, labeller, RecommendationResult } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { isComplete, loadAnswers, StudioAnswers, toRecommendationRequest } from "@/lib/studio";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

export default function StudioResultsPage() {
  const { t } = useT();
  const router = useRouter();
  const { options } = useCatalogOptions();
  const [answers, setAnswers] = useState<StudioAnswers | null | undefined>(undefined);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => setAnswers(loadAnswers()), []);

  const run = useCallback(async (a: StudioAnswers) => {
    setError(null);
    setResult(null);
    try {
      setResult(await catalogApi.recommend(toRecommendationRequest(a)));
      requestAnimationFrame(() => heading.current?.focus());
    } catch (err) {
      setError(errorMessage(err, "We couldn’t get your matches. Please try again."));
    }
  }, []);

  useEffect(() => {
    if (answers && isComplete(answers)) run(answers);
  }, [answers, run]);

  if (answers === undefined) return null;

  if (!answers || !isComplete(answers)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="display text-3xl">{t("results.empty")}</p>
        <Link href="/studio" className="btn-studio mt-8">
          {t("studio.start")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <p className="eyebrow">{t("results.eyebrow")}</p>
      <div aria-live="polite" className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={() => run(answers)} />
        ) : !result ? (
          <div className="grid min-h-[40vh] place-items-center">
            <Spinner label={t("results.loading")} />
          </div>
        ) : (
          <div className="space-y-10">
            {result.recommended.length > 0 && <RoutineMap recommended={result.recommended} />}
            <RecommendationResults
              ref={heading}
              result={result}
              categoryLabel={labeller(options?.categories)}
              onEdit={() => router.push("/studio/review")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
