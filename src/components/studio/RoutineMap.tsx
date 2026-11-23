import Link from "next/link";
import { RecommendationResult } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { ROUTINE_STEPS } from "@/lib/studio";

type Recommended = RecommendationResult["recommended"][number];

/** Groups matched products into routine steps by catalogue category. Pure, for tests. */
export function groupIntoSteps(recommended: Recommended[]) {
  return ROUTINE_STEPS.map((s) => ({
    step: s.step,
    products: recommended.filter((r) => s.categories.includes(r.product.category)),
  }));
}

/**
 * Routine visualization built only from products the rules matched. A step
 * with no matched product says so; nothing is filled in to look complete.
 */
export function RoutineMap({ recommended }: { recommended: Recommended[] }) {
  const { t } = useT();
  const steps = groupIntoSteps(recommended).filter((s) => s.step !== "Extras" || s.products.length > 0);

  return (
    <section aria-labelledby="routine-heading" className="card !p-5 sm:!p-7">
      <h2 id="routine-heading" className="display text-2xl sm:text-3xl">
        {t("results.routine")}
      </h2>
      <p className="mt-2 text-sm text-brand-600">{t("results.routine.note")}</p>

      <ol className="relative mt-6 grid gap-4 lg:grid-cols-5 lg:gap-3">
        {steps.map((s, i) => {
          const first = s.products[0];
          return (
            <li key={s.step} className="relative flex gap-4 lg:flex-col lg:gap-3">
              <div className="flex flex-col items-center lg:flex-row">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    first ? "bg-teal-700 text-white" : "border border-dashed border-brand-300 bg-white text-brand-500"
                  }`}
                  aria-hidden
                >
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span aria-hidden className="mt-1 w-px flex-1 bg-brand-200 lg:ml-2 lg:mt-0 lg:h-px lg:w-auto" />
                )}
              </div>
              <div className="min-w-0 pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">{s.step}</p>
                {first ? (
                  <>
                    <Link
                      href={`/products/${first.product.id}`}
                      className="mt-1 block font-semibold leading-snug text-brand-900 underline-offset-4 hover:underline"
                    >
                      {first.product.name}
                    </Link>
                    {s.products.length > 1 && (
                      <p className="text-xs text-brand-500">{t("results.routine.more", { n: s.products.length - 1 })}</p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-brand-500">{t("results.routine.none")}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
