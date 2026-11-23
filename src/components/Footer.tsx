import Link from "next/link";
import { SITE_STATUS } from "@/lib/siteStatus";

export function Footer() {
  return (
    <footer className="border-t border-brand-200/70 bg-brand-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="text-[13px] font-semibold tracking-[0.3em] text-brand-900">SMART COSMETIC AI</p>
          <p className="max-w-sm text-sm leading-relaxed text-brand-500">
            A personalized serum formula built from your skin scores, with every ingredient explained.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="eyebrow">Explore</p>
          <Link href="/#how" className="block text-brand-600 hover:text-brand-900">
            How it works
          </Link>
          <Link href="/#product" className="block text-brand-600 hover:text-brand-900">
            Serum
          </Link>
          <Link href="/#transparency" className="block text-brand-600 hover:text-brand-900">
            Transparency
          </Link>
          <Link href="/products" className="block text-brand-600 hover:text-brand-900">
            Partner products
          </Link>
          <Link href="/recommendations" className="block text-brand-600 hover:text-brand-900">
            Find products for my skin
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          <p className="eyebrow">Account</p>
          <Link href="/dashboard" className="block text-brand-600 hover:text-brand-900">
            My formulas
          </Link>
          <Link href="/orders" className="block text-brand-600 hover:text-brand-900">
            Orders
          </Link>
          <Link href="/order-requests" className="block text-brand-600 hover:text-brand-900">
            My requests
          </Link>
        </div>
      </div>
      <div className="border-t border-brand-200/70">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-brand-400 sm:px-6">
          Smart Cosmetic AI provides cosmetic personalization. Skin scores are estimates from a single photo
          {SITE_STATUS.skinScoresAreDemo ? ", currently produced by a demonstration model," : ""} and are not a
          medical or dermatological diagnosis.
        </p>
      </div>
    </footer>
  );
}
