import Link from "next/link";
import { SITE_STATUS } from "@/lib/siteStatus";

export function Footer() {
  return (
    <footer className="border-t border-brand-200/70 bg-brand-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="text-[13px] font-semibold tracking-[0.3em] text-brand-900">SMART COSMETIC AI</p>
          <p className="max-w-sm text-sm leading-relaxed text-brand-500">
            Beauty discovery for Zanzibar: products listed by local partner shops, matched to your answers with a
            clear reason for every suggestion.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="eyebrow">Explore</p>
          <Link href="/studio" className="block text-brand-600 hover:text-brand-900">
            Beauty Studio
          </Link>
          <Link href="/products" className="block text-brand-600 hover:text-brand-900">
            Products
          </Link>
          <Link href="/recommendations" className="block text-brand-600 hover:text-brand-900">
            Quick product finder (one page)
          </Link>
          <Link href="/analyze" className="block text-brand-600 hover:text-brand-900">
            Custom serum (demonstration)
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          <p className="eyebrow">Account</p>
          <Link href="/order-requests" className="block text-brand-600 hover:text-brand-900">
            My requests
          </Link>
          <Link href="/account" className="block text-brand-600 hover:text-brand-900">
            Account and data
          </Link>
          <Link href="/privacy" className="block text-brand-600 hover:text-brand-900">
            Privacy notice
          </Link>
        </div>
      </div>
      <div className="border-t border-brand-200/70">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-brand-500 sm:px-6">
          Smart Cosmetic AI offers cosmetic product guidance, not medical advice. Product matches use fixed, explained
          rules on details listed by partner shops. The optional custom serum is a demonstration: its skin scores are
          estimates from a single photo
          {SITE_STATUS.skinScoresAreDemo ? ", currently produced by a demonstration model," : ""} and are not a medical
          or dermatological diagnosis.
        </p>
      </div>
    </footer>
  );
}
