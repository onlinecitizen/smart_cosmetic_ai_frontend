"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountDeletedNotice } from "@/components/AccountDeletedNotice";
import { ProductTile } from "@/components/catalog/ProductTile";
import { EditorialVisual } from "@/components/editorial/EditorialVisual";
import { ChevronIcon, SearchIcon } from "@/components/ui/Icons";
import { mediaUrl } from "@/lib/api";
import { CatalogProduct, Option, catalogApi, groupOf, labeller } from "@/lib/catalog";
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
const TILE_TONES = ["bg-blush-50", "bg-teal-50", "bg-gold-100/70", "bg-peach-100"];

/** A few products from the catalogue (real listings only; nothing is invented). */
function useLatestProducts(limit: number) {
  const [items, setItems] = useState<CatalogProduct[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    catalogApi
      .list({ limit, sort: "recent" })
      .then((page) => !cancelled && setItems(Array.isArray(page?.items) ? page.items : []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return items;
}

export default function HomePage() {
  const { t } = useT();
  const { options } = useCatalogOptions();
  const products = useLatestProducts(6);
  const label = labeller(options?.categories);
  const tree = options?.category_tree;
  const categories: Option[] = tree && tree.length > 0 ? tree.map(({ code, label }) => ({ code, label })) : options?.categories ?? [];
  const groupLabel = (code: string) => groupOf(tree, code)?.label ?? label(code);
  // Hero visual: real product photos from the catalogue when there are any, else the decorative illustration.
  const heroPhotos = (products ?? []).flatMap((p) => (mediaUrl(p.images?.[0]?.url) ? [p] : [])).slice(0, 3);
  const anyDemo = (products ?? []).some((p) => p.is_test_fixture);

  return (
    <>
      <AccountDeletedNotice />

      <div className="mx-auto max-w-6xl px-4 pt-2 sm:px-6 sm:pt-6">
        <Link
          href="/products"
          className="flex items-center gap-3 rounded-full border border-peach-200 bg-white px-4 py-3 text-[15px] text-brand-400 shadow-tile transition hover:border-peach-300 lg:hidden"
        >
          <SearchIcon className="h-[18px] w-[18px] text-brand-500" />
          Search products or brands
        </Link>

        <section className="mt-4 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-peach-100 via-blush-50 to-peach-200 sm:mt-0">
          <div className="grid items-center gap-2 p-5 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:p-12">
            <div>
              <p className="eyebrow">{t("home.eyebrow")}</p>
              <h1 className="display mt-3 text-[2.15rem] leading-[1.06] sm:text-5xl lg:text-[3.6rem]">{t("home.title")}</h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-brand-600 sm:text-base">{t("home.lead")}</p>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <Link href="/studio" className="btn-studio !py-3.5 sm:!px-8">
                  {t("home.cta.routine")}
                </Link>
                <Link href="/products" className="btn-secondary !bg-white/80 !py-3.5 sm:!px-8">
                  {t("home.cta.products")}
                </Link>
              </div>
              <p className="mt-3 text-xs text-brand-500">{t("home.note")}</p>
            </div>

            {heroPhotos.length === 3 ? (
              <div aria-hidden className="relative mx-auto mt-4 grid h-[180px] w-full max-w-md grid-cols-3 items-end gap-2 sm:h-[300px] lg:mt-0 lg:h-[380px]">
                {heroPhotos.map((p, i) => (
                  <div key={p.id} className={`overflow-hidden rounded-3xl bg-white shadow-tile ${i === 1 ? "h-full" : "h-[82%]"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(p.images?.[0]?.url) ?? undefined} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <EditorialVisual variant="hero" className="mt-4 h-[220px] sm:h-[320px] lg:mt-0 lg:h-[380px]" />
            )}
          </div>
        </section>
      </div>

      {categories.length > 0 && (
        <section aria-labelledby="categories-heading" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <h2 id="categories-heading" className="display text-2xl sm:text-3xl">
              {t("home.categories")}
            </h2>
            <p className="hidden text-sm text-brand-600 sm:block">{t("home.categories.lead")}</p>
          </div>
          <ul className="no-scrollbar -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
            {categories.map((c, i) => (
              <li key={c.code} className="shrink-0">
                <Link
                  href={`/products?category=${encodeURIComponent(c.code)}`}
                  className={`group flex h-20 w-32 flex-col justify-between rounded-2xl border border-peach-200/80 p-3.5 transition hover:-translate-y-0.5 hover:shadow-tile sm:w-auto ${TILE_TONES[i % TILE_TONES.length]}`}
                >
                  <span className="display text-lg leading-tight text-brand-900">{c.label}</span>
                  <span aria-hidden className="self-end text-brand-500 transition group-hover:translate-x-0.5">
                    <ChevronIcon />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products && products.length > 0 && (
        <section aria-labelledby="latest-heading" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <h2 id="latest-heading" className="display text-2xl sm:text-3xl">
              From the catalogue
            </h2>
            <Link href="/products" className="text-sm font-semibold text-teal-700 hover:text-teal-900">
              See all
            </Link>
          </div>
          {anyDemo && (
            <p className="mt-1 text-xs text-brand-500">
              Products marked “Demo” are sample listings for design review. Their prices and stock are not real.
            </p>
          )}
          <ul className="mt-3 grid grid-cols-2 gap-3 max-[299px]:grid-cols-1 sm:gap-4 md:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}>
                <ProductTile product={p} groupLabel={groupLabel(p.category)} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link
          href="/studio"
          className="group flex items-center justify-between gap-4 rounded-[1.75rem] bg-teal-700 p-5 text-white shadow-soft transition hover:bg-teal-900 sm:p-7"
        >
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-100">Beauty Studio</span>
            <span className="display mt-1 block text-2xl !text-white sm:text-3xl">{t("home.cta.routine")}</span>
            <span className="mt-1 block text-sm text-teal-50/90">{t("home.note")}</span>
          </span>
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">
            <ChevronIcon className="h-5 w-5" />
          </span>
        </Link>
      </section>

      <section id="how" aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <h2 id="how-heading" className="display text-2xl sm:text-3xl">
          {t("home.how")}
        </h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map(([title, body], i) => (
            <li key={title} className="flex gap-3 rounded-2xl border border-peach-200/80 bg-white p-4 shadow-tile">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-brand-900">{t(title)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-brand-600">{t(body)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="What you can rely on" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ul className="grid gap-5 rounded-[1.75rem] bg-peach-100/70 p-5 sm:grid-cols-3 sm:p-8">
          {TRUST.map(([title, body]) => (
            <li key={title}>
              <p className="font-semibold text-brand-900">{t(title)}</p>
              <p className="mt-1 text-sm leading-relaxed text-brand-600">{t(body)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
