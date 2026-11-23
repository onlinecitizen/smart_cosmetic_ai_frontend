"use client";

import Link from "next/link";
import { AccountDeletedNotice } from "@/components/AccountDeletedNotice";
import { EditorialVisual } from "@/components/editorial/EditorialVisual";
import { MessageKey, useT } from "@/lib/i18n";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

// Every statement here describes what the application does today (DESIGN.md
// "Copy rules"). Do not add claims without matching backend behaviour.
const HOW: [MessageKey, MessageKey][] = [
  ["home.how.1.title", "home.how.1.body"],
  ["home.how.2.title", "home.how.2.body"],
  ["home.how.3.title", "home.how.3.body"],
  ["home.how.4.title", "home.how.4.body"],
];
const TRUST: [MessageKey, MessageKey][] = [
  ["home.trust.1.title", "home.trust.1.body"],
  ["home.trust.2.title", "home.trust.2.body"],
  ["home.trust.3.title", "home.trust.3.body"],
];

export default function HomePage() {
  const { t } = useT();
  const { options } = useCatalogOptions();

  return (
    <>
      <AccountDeletedNotice />

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-20 lg:pt-12">
        <div>
          <p className="eyebrow">{t("home.eyebrow")}</p>
          <h1 className="display mt-5 text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.2rem]">{t("home.title")}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-600 sm:text-lg">{t("home.lead")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/studio" className="btn-studio !py-4 sm:!px-8">
              {t("home.cta.routine")}
            </Link>
            <Link href="/products" className="btn-secondary !py-4 sm:!px-8">
              {t("home.cta.products")}
            </Link>
          </div>
          <p className="mt-4 text-xs text-brand-500">{t("home.note")}</p>
        </div>
        <EditorialVisual variant="hero" className="h-[300px] sm:h-[460px]" />
      </section>

      {options && options.categories.length > 0 && (
        <section aria-labelledby="categories-heading" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <h2 id="categories-heading" className="display text-3xl sm:text-4xl">
              {t("home.categories")}
            </h2>
            <p className="text-sm text-brand-600">{t("home.categories.lead")}</p>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {options.categories.map((c, i) => (
              <li key={c.code}>
                <Link
                  href={`/products?category=${encodeURIComponent(c.code)}`}
                  className={`group flex h-24 items-end justify-between rounded-2xl border border-brand-200/70 p-4 transition hover:-translate-y-0.5 hover:shadow-soft sm:h-28 ${
                    i % 3 === 0 ? "bg-teal-50" : i % 3 === 1 ? "bg-blush-50" : "bg-gold-100/60"
                  }`}
                >
                  <span className="display text-xl leading-tight text-brand-900">{c.label}</span>
                  <span aria-hidden className="text-brand-500 transition group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="how" aria-labelledby="how-heading" className="border-y border-brand-200/70 bg-white/50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="eyebrow">{t("home.how")}</p>
          <h2 id="how-heading" className="sr-only">
            {t("home.how")}
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map(([title, body], i) => (
              <li key={title} className="card">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-brand-900">{t(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-600">{t(body)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link href="/studio" className="btn-studio">
              {t("home.cta.routine")}
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="What you can rely on" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ul className="grid gap-6 rounded-3xl bg-brand-100/70 p-6 sm:grid-cols-3 sm:p-8">
          {TRUST.map(([title, body]) => (
            <li key={title}>
              <p className="font-semibold text-brand-900">{t(title)}</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-600">{t(body)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
