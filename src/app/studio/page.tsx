"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CardWave, FeatureCard } from "@/components/landing/FeatureCard";
import { useAssessmentHref } from "@/components/Navbar";
import { ArrowRightIcon, ChecklistIcon, MicIcon, ScanIcon } from "@/components/ui/Icons";
import { useT } from "@/lib/i18n";
import { SITE_STATUS } from "@/lib/siteStatus";
import { clearAnswers, loadAnswers, StudioAnswers } from "@/lib/studio";

/**
 * Beauty Studio: "Start your beauty journey" chooser (design pack SCREEN_BY_SCREEN_SPEC §02).
 * AI-first options come first; the five-question assessment (Help Me Discover) keeps its
 * start / resume / restart actions. Each card opens an existing, working flow.
 */
export default function StudioIntroPage() {
  const { t } = useT();
  const scanHref = useAssessmentHref();
  const [saved, setSaved] = useState<StudioAnswers | null>(null);

  useEffect(() => setSaved(loadAnswers()), []);
  const hasProgress = Boolean(saved && (saved.skin_type || saved.concerns.length || saved.avoid_groups.length));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-3 sm:px-6 sm:pt-8">
      <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-rose-800">{t("studio.eyebrow")}</p>
      <h1 className="mt-1.5 font-display text-[2rem] font-bold leading-[1.08] text-ink sm:text-[2.75rem]">
        How would you like to <span className="text-rose-700">start?</span>
      </h1>
      <p className="mt-2 text-[15px] leading-snug text-brand-600 sm:text-[17px]">Pick one. You can switch at any time.</p>

      <ul className="mt-5 space-y-3 sm:space-y-4">
        <li>
          <FeatureCard
            size="md"
            href="/assistant"
            icon={<MicIcon className="h-7 w-7 sm:h-9 sm:w-9" />}
            title="Talk to AI"
            body="Describe your beauty goals by voice or text."
          />
        </li>
        <li>
          <FeatureCard
            size="md"
            href={scanHref}
            icon={<ScanIcon className="h-7 w-7 sm:h-9 sm:w-9" />}
            title="Face Scan"
            body="Use your camera to explore visible skin characteristics."
            note={SITE_STATUS.skinScoresAreDemo ? "Demo only, not a skin analysis" : undefined}
          />
        </li>
        <li>
          <section
            aria-labelledby="discover-heading"
            className="relative overflow-hidden rounded-[1.75rem] border border-rose-line bg-white/80 p-4 pb-6 shadow-rose sm:p-6 sm:pb-7"
          >
            <CardWave />
            <div className="relative flex items-center gap-4 sm:gap-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-800 sm:h-20 sm:w-20">
                <ChecklistIcon className="h-7 w-7 sm:h-9 sm:w-9" />
              </span>
              <div className="min-w-0">
                <h2 id="discover-heading" className="font-display text-[1.35rem] font-semibold leading-tight text-ink sm:text-[1.7rem]">
                  Help Me Discover
                </h2>
                <p className="mt-1 text-[14.5px] leading-snug text-brand-600 sm:text-[16px]">
                  Five short questions. Go back, skip or review before we match.
                </p>
              </div>
            </div>
            <p className="relative mt-3 text-[12.5px] text-brand-500">
              {t("studio.points.1")} · {t("studio.points.2")} · {t("studio.points.3")}
            </p>
            <div className="relative mt-4 flex flex-col gap-2.5 sm:flex-row">
              {hasProgress ? (
                <>
                  <Link href="/studio/review" className="btn-hero !min-h-[48px] !text-[15px]">
                    {t("studio.resume")}
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>
                  <button
                    type="button"
                    className="min-h-[48px] rounded-full border border-rose-line bg-white px-6 text-[15px] font-semibold text-ink transition hover:border-rose-300"
                    onClick={() => {
                      clearAnswers();
                      setSaved(null);
                    }}
                  >
                    {t("studio.restart")}
                  </button>
                </>
              ) : (
                <Link href="/studio/assessment" className="btn-hero !min-h-[48px] !text-[15px]">
                  {t("studio.start")}
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
              )}
            </div>
          </section>
        </li>
      </ul>

      <p className="mt-5 text-center">
        <Link href="/products" className="text-[15px] font-semibold text-rose-800 underline underline-offset-4 hover:text-rose-950">
          {t("studio.browse")}
        </Link>
      </p>

      <p className="mt-5 rounded-2xl bg-rose-100/60 px-4 py-3 text-[13px] leading-relaxed text-brand-700">{t("studio.safety")}</p>
    </div>
  );
}
