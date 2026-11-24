"use client";

/**
 * Minimal message catalogue for English and Kiswahili.
 *
 * - English is the source of truth and is complete for the Phase 1 screens
 *   (navigation, homepage, Beauty Studio).
 * - Kiswahili strings are a DRAFT that needs review by a native speaker before
 *   launch. The language switch is therefore hidden unless
 *   NEXT_PUBLIC_ENABLE_KISWAHILI=true. Missing keys fall back to English.
 * - Product names, labels and reasons come from the backend in English and are
 *   not translated here.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "sw";

const en = {
  "nav.home": "Home",
  "nav.studio": "Beauty Studio",
  "nav.products": "Products",
  "nav.assistant": "Beauty Assistant",
  "nav.requests": "My requests",
  "nav.account": "Account",
  "nav.login": "Log in",
  "nav.logout": "Log out",
  "nav.admin": "Admin",
  "nav.menu.open": "Open menu",
  "nav.menu.close": "Close menu",
  "nav.cta": "Discover my routine",
  "nav.main": "Main",
  "nav.tabs": "Primary",
  "nav.more": "More",

  "home.eyebrow": "Beauty discovery · Zanzibar",
  "home.title": "Find what suits your skin, from shops in Zanzibar.",
  "home.lead":
    "Answer a few short questions and we match you with products listed by local partner shops, with a clear reason for every suggestion.",
  "home.cta.routine": "Discover My Routine",
  "home.cta.products": "Explore Products",
  "home.note": "About 2 minutes · no photo needed · cosmetic guidance, not medical advice",
  "home.categories": "Browse by category",
  "home.categories.lead": "Every listing is checked before it appears.",
  "home.how": "How it works",
  "home.how.1.title": "Tell us about your skin",
  "home.how.1.body": "Skin type, what you would like help with, and anything you avoid.",
  "home.how.2.title": "Review your needs",
  "home.how.2.body": "See exactly what we understood and change anything before matching.",
  "home.how.3.title": "See explained matches",
  "home.how.3.body": "Each suggestion says why it fits, and what was left out and why.",
  "home.how.4.title": "Ask the shop",
  "home.how.4.body": "Send a request on the website or on WhatsApp. The shop confirms price and availability.",
  "home.trust.1.title": "Listed by local shops",
  "home.trust.1.body": "Products, prices and stock come from partner retailers, never invented.",
  "home.trust.2.title": "Explained, not hyped",
  "home.trust.2.body": "Matches follow fixed, published rules. We never promise results.",
  "home.trust.3.title": "Your data, your choice",
  "home.trust.3.body": "Assessment answers stay on your device. Download or delete your account at any time.",

  "studio.eyebrow": "Beauty Studio",
  "studio.title": "Let’s find your routine",
  "studio.lead":
    "Five short questions, one at a time. You can go back, skip what doesn’t apply and review everything before we match products.",
  "studio.start": "Start the assessment",
  "studio.resume": "Continue where I left off",
  "studio.restart": "Start again",
  "studio.points.1": "About 2 minutes",
  "studio.points.2": "No photo or account needed",
  "studio.points.3": "Answers stay on this device until you close the tab",
  "studio.voice": "Prefer to talk or type freely? Use the Beauty Assistant, with voice input",
  "studio.safety":
    "This is cosmetic product matching, not medical advice. For pain, bleeding, a spreading rash or sudden changes, please see a health professional.",
  "studio.browse": "Browse products instead",

  "assess.progress": "Question {n} of {total}",
  "assess.back": "Back",
  "assess.next": "Next",
  "assess.review": "Review my answers",
  "assess.save": "Save and return to review",
  "assess.exit": "Exit",
  "assess.loading": "Loading questions",
  "assess.optional": "Optional",
  "assess.required": "Please choose one option to continue.",
  "assess.q.skin_type": "How would you describe your skin?",
  "assess.h.skin_type": "Choose the closest. “Not sure” is fine; we won’t filter by skin type.",
  "assess.notSure": "Not sure",
  "assess.q.concerns": "What would you like help with?",
  "assess.h.concerns": "Choose any that apply, or none.",
  "assess.q.avoid_groups": "Is there anything you avoid?",
  "assess.h.avoid_groups":
    "Products without an ingredient list are left out when you choose anything here, because we can’t check them.",
  "assess.q.avoid_ingredients": "Any other ingredients to avoid?",
  "assess.h.avoid_ingredients": "Separate with commas, for example: shea butter, niacinamide. Leave empty if none.",
  "assess.q.category": "Looking for a particular type of product?",
  "assess.h.category": "Leave as “Any” to see your whole routine.",
  "assess.any": "Any product type",
  "assess.matches": "Matches: {terms}",

  "review.eyebrow": "Review my needs",
  "review.title": "Here’s what we understood",
  "review.lead": "Check each answer. Only what is listed here is used to match products.",
  "review.edit": "Edit",
  "review.none": "None",
  "review.skip": "Not answered",
  "review.submit": "Show my matches",
  "review.restart": "Start again",
  "review.empty": "You haven’t answered the questions yet.",

  "results.eyebrow": "Your matches",
  "results.routine": "Your routine, step by step",
  "results.routine.note":
    "A general order of use for products you matched. It is not a treatment plan; introduce one new product at a time.",
  "results.routine.none": "No listed match for this step yet",
  "results.routine.more": "+{n} more",
  "results.loading": "Matching your answers",
  "results.empty": "Answer the questions first to see your matches.",
} as const;

export type MessageKey = keyof typeof en;

/** DRAFT translations: require native-speaker review before the switch is enabled. */
const sw: Partial<Record<MessageKey, string>> = {
  "nav.home": "Nyumbani",
  "nav.studio": "Studio ya Urembo",
  "nav.products": "Bidhaa",
  "nav.assistant": "Msaidizi wa Urembo",
  "studio.voice": "Ungependa kuongea au kuandika kwa uhuru? Tumia Msaidizi wa Urembo, wenye sauti",
  "nav.requests": "Maombi yangu",
  "nav.account": "Akaunti",
  "nav.login": "Ingia",
  "nav.logout": "Toka",
  "nav.cta": "Gundua utaratibu wangu",
  "home.cta.routine": "Gundua Utaratibu Wangu",
  "home.cta.products": "Tazama Bidhaa",
  "studio.start": "Anza maswali",
  "assess.back": "Rudi",
  "assess.next": "Endelea",
  "assess.exit": "Funga",
  "assess.q.skin_type": "Ngozi yako ikoje?",
  "assess.notSure": "Sina uhakika",
  "review.edit": "Badilisha",
  "review.submit": "Onyesha bidhaa zinazonifaa",
};

const CATALOGUES: Record<Locale, Partial<Record<MessageKey, string>>> = { en, sw };

export const KISWAHILI_ENABLED = process.env.NEXT_PUBLIC_ENABLE_KISWAHILI === "true";

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  let text = CATALOGUES[locale][key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
  return text;
}

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue>({
  locale: "en",
  setLocale: () => undefined,
  t: (key, vars) => translate("en", key, vars),
});

const STORAGE_KEY = "sca.locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    if (!KISWAHILI_ENABLED) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "sw" || saved === "en") setLocaleState(saved);
    } catch {
      /* storage unavailable: stay on English */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    if (!KISWAHILI_ENABLED) return;
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: (key, vars) => translate(locale, key, vars) }),
    [locale, setLocale]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext);
}

/** Shown only when Kiswahili is enabled by configuration. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useT();
  if (!KISWAHILI_ENABLED) return null;
  return (
    <div role="group" aria-label="Language / Lugha" className={`flex gap-1 text-[12px] ${className}`}>
      {(["en", "sw"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          className={`rounded-full px-2.5 py-1 font-semibold ${locale === l ? "bg-brand-900 text-brand-50" : "text-brand-600"}`}
        >
          {l === "en" ? "EN" : "SW"}
        </button>
      ))}
    </div>
  );
}
