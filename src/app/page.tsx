import { AssessmentLink } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { PersonalBottle } from "@/components/home/PersonalBottle";
import { IngredientShowcase } from "@/components/home/IngredientShowcase";
import { ProductCard } from "@/components/home/ProductCard";
import { DemoBadge } from "@/components/ui/States";
import { SITE_STATUS, transparencyItems } from "@/lib/siteStatus";

// Each step describes what the application actually does (see DESIGN.md
// "Copy rules"). Do not add claims here without matching backend behaviour.
const STEPS = [
  {
    n: "01",
    title: "Take one photo",
    body: "Use your camera or upload a photo. It is checked for lighting and sharpness, then discarded.",
  },
  {
    n: "02",
    title: "See your skin scores",
    body: "Four scores from 0 to 100: hydration, redness, pore density and barrier index.",
  },
  {
    n: "03",
    title: "Get your formula",
    body: "Formulation rules turn your scores into exact ingredient volumes, and each formula is checked against concentration limits.",
  },
  {
    n: "04",
    title: "Request your serum",
    body: "Review every ingredient and the price, then place an order request. No payment is taken online.",
  },
];

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#F3E7CF_0%,transparent_55%),radial-gradient(ellipse_at_10%_90%,#F4EEE4_0%,transparent_50%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-4 px-4 pb-14 pt-8 sm:px-6 md:grid-cols-[1.15fr_1fr] md:gap-6 md:pb-24 md:pt-16">
          <div className="space-y-6 sm:space-y-8">
            <p className="eyebrow">Personalized skincare</p>
            <h1 className="display text-[2.75rem] leading-[0.98] sm:text-7xl lg:text-[5.4rem]">
              Your skin profile.
              <br />
              <em className="text-gold-700">Your formula.</em>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-brand-600 sm:text-lg">
              Take one photo and get a serum formula built from your skin scores, with every ingredient, amount and
              reason shown before you order.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <AssessmentLink className="btn-primary">Start my skin assessment</AssessmentLink>
              <a href="#how" className="btn-secondary">
                How it works
              </a>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-brand-500">
              {SITE_STATUS.skinScoresAreDemo && (
                <p className="flex flex-wrap items-center gap-2">
                  <DemoBadge>Early version</DemoBadge>
                  <span>Skin scores currently come from a demonstration model.</span>
                </p>
              )}
              <p>Cosmetic personalization, not a medical diagnosis.</p>
            </div>
          </div>
          <div className="relative mx-auto h-[260px] w-[150px] sm:h-[520px] sm:w-[300px]">
            <PersonalBottle className="h-full w-full" />
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="scroll-mt-20 border-y border-brand-200/70 bg-white/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
          <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-4">How it works</p>
              <h2 className="display text-4xl sm:text-6xl">Four steps from photo to formula.</h2>
            </div>
          </Reveal>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-brand-200/70 bg-brand-200/70 sm:grid-cols-2 lg:grid-cols-4 md:mt-14">
            {STEPS.map((s) => (
              <li key={s.n} className="flex h-full flex-col gap-6 bg-brand-50 p-6 sm:gap-10 sm:p-8">
                <span className="font-display text-4xl text-brand-400 sm:text-5xl" aria-hidden>
                  {s.n}
                </span>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-900">
                    <span className="sr-only">Step {s.n}: </span>
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-brand-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= PRODUCT ================= */}
      <section id="product" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
        <Reveal className="mb-8 md:mb-12">
          <p className="eyebrow mb-4">What you can order</p>
          <h2 className="display text-4xl sm:text-6xl">One serum, formulated for you.</h2>
        </Reveal>
        <div className="max-w-3xl">
          <ProductCard />
        </div>
      </section>

      {/* ================= INGREDIENTS ================= */}
      <section id="ingredients" className="scroll-mt-20 bg-brand-100/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
          <Reveal className="mb-10 flex flex-col justify-between gap-4 md:mb-14 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-4">Ingredients</p>
              <h2 className="display text-4xl sm:text-6xl">What can go into your formula.</h2>
            </div>
            <p className="max-w-sm text-sm text-brand-600 sm:text-base">
              Your scores decide which of these are added and how much. Your formula page lists each one with its
              volume, concentration and the reason it was added.
            </p>
          </Reveal>
          <IngredientShowcase />
        </div>
      </section>

      {/* ================= TRANSPARENCY ================= */}
      <section id="transparency" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
        <Reveal>
          <p className="eyebrow mb-4">Transparency</p>
          <h2 className="display max-w-3xl text-4xl sm:text-6xl">What’s real today, and what isn’t yet.</h2>
        </Reveal>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:mt-14">
          {transparencyItems().map((item) => (
            <li key={item.title} className="card h-full">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-brand-900">{item.title}</h3>
                {item.kind === "demo" && <DemoBadge />}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-brand-600">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative overflow-hidden bg-brand-900">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(200,169,110,0.35)_0%,transparent_60%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 md:py-32">
          <h2 className="display text-4xl !text-brand-50 sm:text-6xl">
            Ready to see
            <br />
            <em className="text-gold-300">your formula?</em>
          </h2>
          <AssessmentLink className="btn-gold mt-10">Start my skin assessment</AssessmentLink>
          <p className="mt-6 text-xs text-brand-300">Free to try. You only order if you want to.</p>
        </div>
      </section>
    </div>
  );
}
