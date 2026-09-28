import Link from "next/link";
import { AssessmentLink } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { PersonalBottle } from "@/components/home/PersonalBottle";
import { IngredientShowcase } from "@/components/home/IngredientShowcase";
import { EXAMPLE_CLIMATE } from "@/lib/product";

const STAGES = [
  { n: "01", title: "Scan", body: "A camera-based skin assessment, guided right in your browser." },
  { n: "02", title: "Analyze", body: "Visible skin characteristics are processed into a skin profile." },
  { n: "03", title: "Personalize", body: "Your skin profile is combined with information about your environment." },
  { n: "04", title: "Create", body: "A personalized formula is generated, checked and given its own code." },
];

const SKIN_METRICS = ["Hydration", "Redness", "Pore density", "Barrier index"];

function StageIcon({ n }: { n: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 text-gold-700" aria-hidden>
      {n === "01" && (
        <>
          <ellipse cx="24" cy="24" rx="11" ry="14" {...common} />
          <path d="M6 14V8h6M42 14V8h-6M6 34v6h6M42 34v6h-6" {...common} />
        </>
      )}
      {n === "02" && (
        <>
          <circle cx="24" cy="24" r="15" {...common} />
          <circle cx="24" cy="24" r="8" {...common} />
          <path d="M24 4v6M24 38v6M4 24h6M38 24h6" {...common} />
        </>
      )}
      {n === "03" && (
        <>
          <circle cx="18" cy="24" r="10" {...common} />
          <circle cx="30" cy="24" r="10" {...common} />
        </>
      )}
      {n === "04" && (
        <>
          <path d="M20 8h8v6h-8zM18 14h12l2 6v18a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V20z" {...common} />
          <path d="M16 28h16" {...common} />
        </>
      )}
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#F3E7CF_0%,transparent_55%),radial-gradient(ellipse_at_10%_90%,#F4EEE4_0%,transparent_50%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pb-24 md:pt-16">
          <div className="space-y-8">
            <Reveal>
              <p className="eyebrow">AI-personalized skincare</p>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="display text-[3.2rem] leading-[0.95] sm:text-7xl lg:text-[5.6rem]">
                Your skin.
                <br />
                Your climate.
                <br />
                <em className="text-gold-700">Your formula.</em>
              </h1>
            </Reveal>
            <Reveal delay={240}>
              <p className="max-w-md text-base leading-relaxed text-brand-600 sm:text-lg">
                Personalized skincare created around your skin profile and environment.
              </p>
            </Reveal>
            <Reveal delay={360}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <AssessmentLink className="btn-primary">Start my skin assessment</AssessmentLink>
                <Link href="/#how" className="btn-secondary">
                  See how it works
                </Link>
              </div>
            </Reveal>
            <Reveal delay={480}>
              <p className="text-xs text-brand-400">Cosmetic personalization — not a medical diagnosis.</p>
            </Reveal>
          </div>
          <div className="relative mx-auto h-[420px] w-[240px] sm:h-[520px] sm:w-[300px]">
            <PersonalBottle className="h-full w-full" />
          </div>
        </div>
      </section>

      {/* ================= PROBLEM ================= */}
      <section className="border-y border-brand-200/70 bg-white/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <p className="eyebrow mb-6">The question</p>
            <h2 className="display text-5xl sm:text-6xl md:text-7xl">Why generic skincare?</h2>
          </Reveal>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {[
              "Every person’s skin is different.",
              "Every environment is different.",
              "One formula does not necessarily fit everyone.",
            ].map((line, i) => (
              <Reveal key={line} delay={i * 150}>
                <div className="border-t border-brand-800 pt-6">
                  <span className="font-display text-lg italic text-gold-700">0{i + 1}</span>
                  <p className="display mt-3 text-3xl leading-tight">{line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-6">How it works</p>
              <h2 className="display text-5xl sm:text-6xl">Four steps to your formula.</h2>
            </div>
            <p className="max-w-sm text-brand-500">About two minutes, from a single photo to a formula made for you.</p>
          </Reveal>
          <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-brand-200/70 bg-brand-200/70 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((s, i) => (
              <Reveal key={s.n} delay={i * 150} className="h-full">
                <div className="flex h-full flex-col gap-10 bg-brand-50 p-8">
                  <div className="flex items-start justify-between">
                    <span className="font-display text-5xl text-brand-300">{s.n}</span>
                    <StageIcon n={s.n} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-900">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-brand-500">{s.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SKIN + CLIMATE ================= */}
      <section id="technology" className="scroll-mt-20 bg-brand-100/60">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
          <Reveal className="text-center">
            <p className="eyebrow mb-6">The technology</p>
            <h2 className="display mx-auto max-w-3xl text-5xl sm:text-6xl">Two inputs. One formula.</h2>
          </Reveal>
          <div className="mt-16 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <Reveal>
              <div className="glass h-full p-8">
                <p className="eyebrow">Your skin</p>
                <ul className="mt-6 space-y-3">
                  {SKIN_METRICS.map((m) => (
                    <li key={m} className="flex items-center justify-between border-b border-brand-200/70 pb-3 text-sm text-brand-700">
                      {m}
                      <span className="h-1.5 w-16 rounded-full bg-gradient-to-r from-gold-100 to-gold-500" />
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={150} className="text-center font-display text-5xl text-gold-700">
              +
            </Reveal>
            <Reveal delay={300}>
              <div className="glass h-full p-8">
                <p className="eyebrow">Your environment</p>
                <ul className="mt-6 space-y-3">
                  {["Temperature", "Humidity", "UV index", "Region"].map((m) => (
                    <li key={m} className="flex items-center justify-between border-b border-brand-200/70 pb-3 text-sm text-brand-700">
                      {m}
                      <span className="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-200 to-brand-500" />
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={450} className="text-center font-display text-5xl text-gold-700">
              =
            </Reveal>
            <Reveal delay={600}>
              <div className="h-full rounded-3xl bg-brand-900 p-8 text-brand-50 shadow-lift">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">Your formula</p>
                <p className="display mt-6 text-4xl !text-brand-50">Made for one.</p>
                <p className="mt-4 text-sm leading-relaxed text-brand-300">
                  A personalized serum with its own formula code, built from your profile and your surroundings.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= FORMULA ENGINE ================= */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow mb-6">The formula engine</p>
            <h2 className="display text-5xl sm:text-6xl">From analysis to a bottle.</h2>
            <p className="mt-6 max-w-md leading-relaxed text-brand-600">
              Approved formulation rules translate your skin profile and climate into precise ingredient
              volumes. Every formula is checked against concentration limits before it can be ordered —
              if it doesn’t pass, it isn’t made.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="relative space-y-3">
              {["Skin profile", "Climate", "Formulation rules"].map((label, i) => (
                <div key={label} className="glass flex items-center justify-between px-6 py-5">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-800">{label}</span>
                  <span className="font-display text-2xl text-gold-700">{i < 2 ? "+" : ""}</span>
                </div>
              ))}
              <div className="flex justify-center py-2" aria-hidden>
                <svg viewBox="0 0 20 60" className="h-14 w-5">
                  <line x1="10" y1="0" x2="10" y2="50" stroke="#C8A96E" strokeWidth="1.5" className="draw-line" />
                  <path d="M4 46l6 8 6-8" fill="none" stroke="#C8A96E" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-gold-300 via-gold-100 to-gold-500 p-[1px] shadow-lift">
                <div className="flex items-center justify-between rounded-3xl bg-brand-900 px-6 py-6">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-50">Personalized formula</span>
                  <span className="font-mono text-xs text-gold-300">FORMULA-····</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= PRODUCT REVEAL ================= */}
      <section id="formula" className="relative scroll-mt-20 overflow-hidden bg-brand-900 text-brand-50">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(200,169,110,0.28)_0%,transparent_60%)]"
          aria-hidden
        />
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="drift absolute bottom-0 h-1 w-1 rounded-full bg-gold-300"
            style={{ left: `${6 + i * 6.7}%`, animationDelay: `${(i * 0.7) % 9}s` }}
          />
        ))}
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-2 md:py-32">
          <Reveal className="order-2 md:order-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">The reveal</p>
            <h2 className="display mt-6 text-5xl !text-brand-50 sm:text-6xl">
              One serum.
              <br />
              <em className="text-gold-300">Only yours.</em>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-brand-300">
              Your formula is labelled with your name and a unique formula code, so every bottle can be traced
              back to the profile it was made for.
            </p>
            <AssessmentLink className="btn-gold mt-10">Create my formula</AssessmentLink>
          </Reveal>
          <div className="order-1 mx-auto h-[440px] w-[250px] sm:h-[540px] sm:w-[310px] md:order-2">
            <PersonalBottle className="h-full w-full" />
          </div>
        </div>
      </section>

      {/* ================= INGREDIENTS ================= */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <Reveal className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-6">Ingredient transparency</p>
            <h2 className="display text-5xl sm:text-6xl">What can go into your formula.</h2>
          </div>
          <p className="max-w-sm text-brand-500">
            Your profile decides which of these are included and in what amount. Every volume is shown on your
            formula.
          </p>
        </Reveal>
        <IngredientShowcase />
      </section>

      {/* ================= CLIMATE ================= */}
      <section className="border-y border-brand-200/70 bg-white/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <p className="eyebrow mb-6">Your environment</p>
            <h2 className="display max-w-2xl text-5xl sm:text-6xl">Where you live matters.</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-brand-200/70 bg-brand-200/70 md:grid-cols-4">
            {[
              { k: "Temperature", v: `${EXAMPLE_CLIMATE.temperature_c}°C` },
              { k: "Humidity", v: `${Math.round(EXAMPLE_CLIMATE.humidity * 100)}%` },
              { k: "UV index", v: `${EXAMPLE_CLIMATE.uv_index}` },
              { k: "Region", v: EXAMPLE_CLIMATE.region.split(",")[0] },
            ].map((d, i) => (
              <Reveal key={d.k} delay={i * 120} className="h-full">
                <div className="h-full bg-brand-50 p-6 sm:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-400">{d.k}</p>
                  <p className="display mt-4 text-3xl sm:text-5xl">{d.v}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 flex flex-col justify-between gap-3 md:flex-row">
            <p className="max-w-xl text-lg text-brand-700">
              Your environment is considered when building your personalized formula.
            </p>
            <p className="text-xs text-brand-400">Example reading from our demo climate service.</p>
          </Reveal>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="grid gap-12 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow mb-6">About</p>
            <h2 className="display text-5xl sm:text-6xl">Beauty technology, built honestly.</h2>
          </Reveal>
          <Reveal delay={150} className="space-y-6 leading-relaxed text-brand-600">
            <p>
              Smart Cosmetic AI brings together a camera-based skin assessment, local climate information and a
              rules-based formulation engine to create skincare for one person at a time.
            </p>
            <p>
              Your photo is processed to produce your skin profile and is then deleted. It is never made public
              and never sent to the laboratory that makes your serum.
            </p>
            <p className="text-sm text-brand-400">
              Assessments are AI estimates from a single photo for cosmetic personalization. They are not a
              medical or dermatological diagnosis.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative overflow-hidden bg-brand-900">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(200,169,110,0.35)_0%,transparent_60%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 py-28 text-center sm:px-6 md:py-40">
          <Reveal>
            <h2 className="display text-5xl !text-brand-50 sm:text-7xl">
              Ready to meet
              <br />
              <em className="text-gold-300">your formula?</em>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <AssessmentLink className="btn-gold mt-12">Start your personalized skin assessment</AssessmentLink>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
