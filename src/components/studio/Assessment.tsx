"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ErrorState, Spinner } from "@/components/ui/States";
import { useT } from "@/lib/i18n";
import {
  buildQuestions,
  EMPTY_ANSWERS,
  loadAnswers,
  QUESTION_ORDER,
  QuestionId,
  questionError,
  saveAnswers,
  StudioAnswers,
} from "@/lib/studio";
import { SkinTypeAnswer } from "@/lib/catalog";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

function toggle(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

/**
 * Fixed-screen, one-question-at-a-time assessment.
 *
 * The overlay fills the viewport (100dvh) so the page itself never scrolls
 * between questions: the header (exit + progress) and footer (Back / Next)
 * stay put and only the question area changes. If a question is taller than a
 * very small screen, only that middle area scrolls.
 */
export function Assessment({ editId }: { editId?: QuestionId | null }) {
  const { t } = useT();
  const router = useRouter();
  const { options, error: optionsError, reload } = useCatalogOptions();

  const startIndex = editId ? Math.max(0, QUESTION_ORDER.indexOf(editId)) : 0;
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [answers, setAnswers] = useState<StudioAnswers>(EMPTY_ANSWERS);
  const [restored, setRestored] = useState(false);
  const [showError, setShowError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const questions = useMemo(
    () => (options ? buildQuestions(options, t("assess.notSure"), t("assess.any")) : null),
    [options, t]
  );

  // Restore answers saved earlier in this tab (Back from review, refresh, edit).
  useEffect(() => {
    const saved = loadAnswers();
    if (saved) setAnswers(saved);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) saveAnswers(answers);
  }, [answers, restored]);

  // Lock page scroll while the full-screen assessment is open.
  useEffect(() => {
    const { body, documentElement: root } = document;
    const previous = [body.style.overflow, root.style.overflow];
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      [body.style.overflow, root.style.overflow] = previous;
    };
  }, []);

  // Move focus to each new question so screen readers announce it.
  useEffect(() => {
    if (!questions) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [index, questions]);

  const total = QUESTION_ORDER.length;
  const question = questions?.[index];
  const errorCode = question ? questionError(question.id, answers) : null;
  const isLast = index === total - 1;

  function goTo(next: number) {
    setDirection(next > index ? "up" : "down");
    setShowError(false);
    setIndex(next);
  }

  function onNext(e?: FormEvent) {
    e?.preventDefault();
    if (!question) return;
    if (errorCode) {
      setShowError(true);
      return;
    }
    if (editId || isLast) {
      router.push("/studio/review");
      return;
    }
    goTo(index + 1);
  }

  function onBack() {
    if (index === 0 || editId) {
      router.push(editId ? "/studio/review" : "/studio");
      return;
    }
    goTo(index - 1);
  }

  const errorText = errorCode === "required" ? t("assess.required") : errorCode;

  return (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-brand-50"
      role="dialog"
      aria-modal="true"
      aria-label={t("studio.eyebrow")}
    >
      {/* Stable header: exit + progress */}
      <header className="shrink-0 border-b border-brand-200/70 bg-brand-50/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <p className="eyebrow">{t("studio.eyebrow")}</p>
          <Link href="/studio" className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 hover:text-brand-900">
            {t("assess.exit")}
          </Link>
        </div>
        <div className="mx-auto mt-3 max-w-2xl">
          <div className="flex items-center justify-between text-xs text-brand-600">
            <span aria-live="polite">{t("assess.progress", { n: index + 1, total })}</span>
            {question?.optional && <span className="text-brand-500">{t("assess.optional")}</span>}
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-200"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            aria-label={t("assess.progress", { n: index + 1, total })}
          >
            <div
              className="h-full rounded-full bg-teal-700 transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <form onSubmit={onNext} className="flex min-h-0 flex-1 flex-col" noValidate>
        {/* Question area: the only part that changes (and, on tiny screens, scrolls). */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8">
          <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center py-6">
            {optionsError ? (
              <ErrorState message={optionsError} onRetry={reload} />
            ) : !question ? (
              <div className="grid place-items-center py-10">
                <Spinner label={t("assess.loading")} />
              </div>
            ) : (
              <fieldset
                key={question.id}
                className={direction === "up" ? "question-enter-up" : "question-enter-down"}
                aria-describedby={`help-${question.id}${showError && errorText ? ` error-${question.id}` : ""}`}
              >
                <legend className="sr-only">{t(question.title)}</legend>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="display text-[2rem] leading-[1.1] focus:outline-none sm:text-5xl"
                >
                  {t(question.title)}
                </h1>
                <p id={`help-${question.id}`} className="mt-3 text-sm leading-relaxed text-brand-600">
                  {t(question.help)}
                </p>

                <div className="mt-6">
                  {question.kind === "text" ? (
                    <>
                      <label htmlFor="avoid-ingredients" className="label">
                        {t("assess.q.avoid_ingredients")}
                      </label>
                      <input
                        id="avoid-ingredients"
                        type="text"
                        className="input"
                        autoComplete="off"
                        maxLength={700}
                        value={answers.avoid_text}
                        aria-invalid={showError && errorText ? true : undefined}
                        onChange={(e) => setAnswers((a) => ({ ...a, avoid_text: e.target.value }))}
                      />
                    </>
                  ) : (
                    <div
                      className={`grid gap-2.5 ${question.options.length > 5 ? "sm:grid-cols-2" : ""}`}
                      role={question.kind === "single" ? "radiogroup" : "group"}
                      aria-label={t(question.title)}
                    >
                      {question.options.map((o) => {
                        const id = `${question.id}-${o.code || "any"}`;
                        const checked =
                          question.id === "skin_type"
                            ? answers.skin_type === o.code
                            : question.id === "category"
                              ? answers.category === o.code
                              : question.id === "concerns"
                                ? answers.concerns.includes(o.code)
                                : answers.avoid_groups.includes(o.code);
                        return (
                          <label key={id} htmlFor={id} className="option-tile">
                            <input
                              id={id}
                              type={question.kind === "single" ? "radio" : "checkbox"}
                              name={question.id}
                              value={o.code}
                              checked={checked}
                              className="h-4 w-4 shrink-0 accent-teal-700"
                              onChange={() => {
                                setShowError(false);
                                setAnswers((a) => {
                                  switch (question.id) {
                                    case "skin_type":
                                      return { ...a, skin_type: o.code as SkinTypeAnswer };
                                    case "category":
                                      return { ...a, category: o.code };
                                    case "concerns":
                                      return { ...a, concerns: toggle(a.concerns, o.code) };
                                    default:
                                      return { ...a, avoid_groups: toggle(a.avoid_groups, o.code) };
                                  }
                                });
                              }}
                            />
                            <span>
                              {o.label}
                              {o.detail && <span className="block text-xs text-brand-500">{t("assess.matches", { terms: o.detail })}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p id={`error-${question.id}`} className="field-error min-h-[1.25rem]" role={showError && errorText ? "alert" : undefined}>
                  {showError ? errorText : question.kind === "text" ? errorText : null}
                </p>
              </fieldset>
            )}
          </div>
        </div>

        {/* Stable footer: Back / Next */}
        <footer className="shrink-0 border-t border-brand-200/70 bg-brand-50/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <button type="button" className="btn-secondary" onClick={onBack}>
              {t("assess.back")}
            </button>
            <button type="submit" className="btn-studio flex-1 sm:flex-none" disabled={!question}>
              {editId ? t("assess.save") : isLast ? t("assess.review") : t("assess.next")}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
