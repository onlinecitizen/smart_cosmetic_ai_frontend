"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EditorialVisual } from "@/components/editorial/EditorialVisual";
import { useT } from "@/lib/i18n";
import { clearAnswers, loadAnswers, StudioAnswers } from "@/lib/studio";

export default function StudioIntroPage() {
  const { t } = useT();
  const [saved, setSaved] = useState<StudioAnswers | null>(null);

  useEffect(() => setSaved(loadAnswers()), []);
  const hasProgress = Boolean(saved && (saved.skin_type || saved.concerns.length || saved.avoid_groups.length));

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-14">
      <div>
        <p className="eyebrow">{t("studio.eyebrow")}</p>
        <h1 className="display mt-4 text-[2.6rem] leading-[1.05] sm:text-6xl">{t("studio.title")}</h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-600">{t("studio.lead")}</p>

        <ul className="mt-6 space-y-2 text-sm text-brand-700">
          {(["studio.points.1", "studio.points.2", "studio.points.3"] as const).map((k) => (
            <li key={k} className="flex items-center gap-3">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal-700" />
              {t(k)}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-brand-600">
          <Link href="/assistant" className="underline underline-offset-4">
            {t("studio.voice")}
          </Link>
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {hasProgress ? (
            <>
              <Link href="/studio/review" className="btn-studio">
                {t("studio.resume")}
              </Link>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  clearAnswers();
                  setSaved(null);
                }}
              >
                {t("studio.restart")}
              </button>
            </>
          ) : (
            <Link href="/studio/assessment" className="btn-studio">
              {t("studio.start")}
            </Link>
          )}
          <Link href="/products" className="btn-secondary">
            {t("studio.browse")}
          </Link>
        </div>

        <p className="mt-8 max-w-xl rounded-2xl border border-blush-100 bg-blush-50 px-5 py-4 text-sm leading-relaxed text-blush-700">
          {t("studio.safety")}
        </p>
      </div>
      <EditorialVisual variant="studio" className="h-[280px] sm:h-[420px]" />
    </div>
  );
}
