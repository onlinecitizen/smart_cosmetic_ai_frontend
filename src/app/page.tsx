"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountDeletedNotice } from "@/components/AccountDeletedNotice";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { useAssessmentHref } from "@/components/Navbar";
import { ArrowRightIcon, BagIcon, MessageIcon, MicIcon, ScanIcon, SparkleIcon, SproutIcon } from "@/components/ui/Icons";
import { CatalogProduct, catalogApi } from "@/lib/catalog";
import { SITE_STATUS } from "@/lib/siteStatus";

// Landing page from the design pack (references/00_PRIMARY_REFERENCE_EXACT_HOME_DESIGN.png,
// SCREEN_BY_SCREEN_SPEC.md §01). Every statement describes what the application does
// today: no scores, precision claims or invented product facts.

const STEPS = [
  { icon: MessageIcon, title: "Share Your Needs", body: "By voice, text or a few questions" },
  { icon: SparkleIcon, title: "Get Personalized Guidance", body: "Each match says why it fits" },
  { icon: BagIcon, title: "Explore Suitable Products", body: "Listed by partner shops" },
];

/** A few catalogue photos for the hero visual (real listings only). */
function useHeroProducts() {
  const [items, setItems] = useState<CatalogProduct[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    catalogApi
      .list({ limit: 3, sort: "recent" })
      .then((page) => !cancelled && setItems(Array.isArray(page?.items) ? page.items : []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);
  return items;
}

function FeatureCard({
  href,
  icon,
  title,
  body,
  note,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] border border-rose-line bg-white/80 p-5 shadow-rose backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white active:translate-y-0 sm:gap-6 sm:p-7 lg:min-h-[200px]"
    >
      {/* soft wave along the bottom edge, as in the reference */}
      <svg aria-hidden viewBox="0 0 400 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-rose-100 sm:h-14">
        <path d="M0 30C80 0 150 55 240 34s120-30 160-14v40H0z" fill="currentColor" />
      </svg>
      <span className="relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-600 to-rose-950 text-white shadow-cta sm:h-24 sm:w-24 lg:h-[116px] lg:w-[116px]">
        {icon}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-display text-[1.6rem] font-semibold leading-tight text-ink sm:text-[2rem] lg:text-[2.35rem]">{title}</span>
        <span className="mt-1.5 block max-w-xs text-[15px] leading-snug text-brand-600 sm:text-[17px]">{body}</span>
        {note && <span className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">{note}</span>}
      </span>
      <span
        aria-hidden
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-100 text-ink transition group-hover:translate-x-1 group-hover:bg-rose-200 sm:h-14 sm:w-14"
      >
        <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
    </Link>
  );
}

export default function HomePage() {
  const products = useHeroProducts();
  const scanHref = useAssessmentHref();

  return (
    <>
      <AccountDeletedNotice />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-rose-50 to-rose-50">
        <div className="mx-auto grid max-w-[1240px] items-center gap-4 px-5 pb-6 pt-4 sm:px-8 lg:min-h-[500px] lg:grid-cols-[46fr_54fr] lg:gap-6 lg:px-12 lg:pb-0 lg:pt-0">
          <div className="relative z-10 lg:py-14">
            <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight text-ink sm:text-[3.4rem] lg:text-[3.75rem] xl:text-[4.5rem]">
              Discover Your
              <span className="block text-rose-700">Natural Beauty</span>
            </h1>
            <p className="mt-5 max-w-[500px] text-[17px] leading-[1.45] text-brand-700 sm:text-[20px] lg:text-[21px]">
              Powered by AI, our Beauty Studio helps you discover your beauty goals and explore suitable products.
            </p>
            <Link href="/studio" className="btn-hero mt-7 w-full max-w-[400px] sm:w-auto sm:min-w-[340px] lg:h-[68px] lg:w-[400px]">
              <SparkleIcon className="h-5 w-5" />
              Start Your Beauty Journey
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
          <div className="relative -mx-5 h-[280px] sm:-mx-8 sm:h-[380px] lg:mx-0 lg:h-[500px]">
            <HeroVisual products={products} />
          </div>
        </div>
      </section>

      {/* Two feature cards */}
      <section id="features" aria-label="Ways to start" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-6 sm:px-8 lg:-mt-6 lg:px-12">
        <div className="relative z-10 grid gap-4 lg:grid-cols-2 lg:gap-6">
          <FeatureCard
            href="/assistant"
            icon={<MicIcon className="h-9 w-9 sm:h-11 sm:w-11 lg:h-14 lg:w-14" />}
            title="Talk to AI"
            body="Talk to your personal AI to describe your beauty goals."
          />
          <FeatureCard
            href={scanHref}
            icon={<ScanIcon className="h-9 w-9 sm:h-11 sm:w-11 lg:h-14 lg:w-14" />}
            title="Face Scan"
            body="Use your camera to explore visible skin characteristics."
            note={SITE_STATUS.skinScoresAreDemo ? "Demonstration: results are not a skin analysis" : undefined}
          />
        </div>
      </section>

      {/* Three steps */}
      <section aria-labelledby="journey-heading" className="mx-auto max-w-[1240px] px-5 pt-12 sm:px-8 lg:px-12 lg:pt-14">
        <div className="flex items-center gap-4 sm:gap-6">
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-rose-300" />
          <h2 id="journey-heading" className="text-center font-display text-[1.5rem] font-semibold leading-tight text-ink sm:text-[1.9rem]">
            Your Beauty Journey in 3 Simple Steps
          </h2>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-rose-300" />
        </div>
        <ol className="mt-7 grid gap-4 sm:grid-cols-3 sm:gap-2">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative flex items-center gap-4 sm:flex-col sm:gap-0 sm:text-center">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700 sm:h-[100px] sm:w-[100px]">
                <Icon className="h-8 w-8 [&_*]:[stroke-width:2.2] sm:h-12 sm:w-12" />
              </span>
              <span>
                <span className="block font-display text-[1.2rem] font-semibold text-ink sm:mt-4 sm:text-[1.35rem]">
                  {i + 1}. {title}
                </span>
                <span className="mt-0.5 block text-[15px] text-brand-600 sm:text-[16px]">{body}</span>
              </span>
              {i < STEPS.length - 1 && (
                <ArrowRightIcon className="absolute -right-4 top-[42px] hidden h-7 w-7 text-rose-500/80 sm:block lg:-right-6" />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Banner */}
      <section aria-labelledby="banner-heading" className="mx-auto max-w-[1240px] px-5 pb-12 pt-12 sm:px-8 lg:px-12 lg:pt-14">
        <div className="relative flex flex-col items-start gap-5 overflow-hidden rounded-[1.75rem] border border-rose-line bg-gradient-to-r from-rose-100 via-rose-50 to-rose-100 p-6 shadow-rose sm:p-8 lg:min-h-[145px] lg:flex-row lg:items-center lg:gap-6 lg:pl-56">
          <svg aria-hidden viewBox="0 0 160 120" className="pointer-events-none absolute -left-4 -top-2 hidden h-36 w-48 lg:block">
            <g fill="#5E8B3A">
              <path d="M10 110C40 80 70 60 120 52" stroke="#6B4F2A" strokeWidth="2" fill="none" />
              <path d="M40 86C30 60 38 30 62 14c10 26 6 52-22 72z" opacity=".9" />
              <path d="M70 66c2-26 20-46 48-50-2 26-20 44-48 50z" fill="#7BA84A" />
              <path d="M96 56c16-14 38-18 58-8-14 14-36 16-58 8z" />
              <path d="M28 98C10 88 2 70 4 52c18 8 26 26 24 46z" fill="#7BA84A" />
            </g>
          </svg>
          <SproutIcon className="hidden h-11 w-11 shrink-0 text-rose-700 lg:block" />
          <div className="flex-1">
            <h2 id="banner-heading" className="font-display text-[1.6rem] font-semibold leading-tight text-ink sm:text-[2rem]">
              Your Beauty. Our Care.
            </h2>
            <p className="mt-1 text-[15px] text-brand-600 sm:text-[17px]">Smarter discovery. More confident choices.</p>
          </div>
          <Link href="/products" className="btn-hero w-full shrink-0 sm:w-auto sm:min-w-[260px]">
            Explore Products
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
