import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center space-y-6 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-brand-800">
          Skincare, personalized to your skin and your climate.
        </h1>
        <p className="text-lg text-brand-600 max-w-2xl mx-auto">
          Take a quick browser-based skin assessment, get an AI-estimated skin profile,
          and receive a formula built for your skin and where you live.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/register" className="btn-primary">
            Start your skin assessment
          </Link>
          <Link href="/login" className="btn-secondary">
            I already have an account
          </Link>
        </div>
        <p className="text-xs text-brand-400 max-w-xl mx-auto">
          This is a cosmetic personalization tool, not a medical device. It does not
          diagnose skin conditions or replace a dermatologist.
        </p>
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        {[
          { title: "1. Camera Assessment", body: "Use your browser camera with live guidance to capture a well-lit photo." },
          { title: "2. Skin Scorecard", body: "See AI-estimated hydration, redness, pore density and barrier scores." },
          { title: "3. Climate-aware Formula", body: "Your region's climate feeds into a rules-based formulation engine." },
          { title: "4. Order", body: "Get a unique formula code and place an order for manufacturing." },
        ].map((step) => (
          <div key={step.title} className="card">
            <h3 className="font-semibold text-brand-700 mb-2">{step.title}</h3>
            <p className="text-sm text-brand-500">{step.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
