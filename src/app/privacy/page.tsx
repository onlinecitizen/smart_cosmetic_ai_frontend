"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NoticeInfo, privacyApi } from "@/lib/privacy";

/**
 * Privacy notice. Every statement here describes verified behaviour of the
 * backend (docs/privacy.md). It is a plain description of data handling, not
 * a statement of legal compliance; that review is still pending.
 */
export default function PrivacyPage() {
  const [info, setInfo] = useState<NoticeInfo | null>(null);
  const [infoFailed, setInfoFailed] = useState(false);

  useEffect(() => {
    privacyApi
      .noticeInfo()
      .then(setInfo)
      .catch(() => setInfoFailed(true));
  }, []);

  const retention = info ? `${info.order_request_retention_days} days` : "a set period";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <p className="eyebrow">Privacy</p>
      <h1 className="display mt-4 text-4xl">How we handle your information</h1>
      <p className="mt-3 text-sm text-brand-600">
        This notice explains what Smart Cosmetic AI collects, why, who receives it, how long it is kept and what you can
        do about it. {info && <>Version {info.notice_version}.</>}
      </p>

      <Section title="What we collect and why">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-brand-500">
              <th className="py-2 pr-4 font-medium">Information</th>
              <th className="py-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100 align-top text-brand-700">
            <Row a="Your name, email address and password (stored only in scrambled, hashed form)" b="To create your account and let you sign in." />
            <Row
              a="Sign-in records: when you signed in and a short description of your browser"
              b="To keep you signed in and to protect your account."
            />
            <Row
              a="Your consent choices and which version of this notice you accepted"
              b="So we can show what you agreed to, and stop photo analysis if you withdraw consent."
            />
            <Row
              a="Your skin photo"
              b="Analysed on our server to produce skin scores, then discarded straight away. It is never saved or made public."
            />
            <Row
              a="Skin scores, the region you enter, and the formulas and serum orders made from them"
              b="To build your serum formula and process your order."
            />
            <Row
              a="For product requests: your name, phone number, preferred contact method, collection or delivery choice, delivery address and notes"
              b="So the retailer you chose can contact you about the request."
            />
          </tbody>
        </table>
        <p>We don’t use advertising or analytics trackers, and we don’t sell your information.</p>
      </Section>

      <Section title="Who receives it">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>The retailer you choose</strong> receives the contact details on a product request, and only when you
            tick the box allowing it on the request form.
          </li>
          <li>
            <strong>WhatsApp:</strong> if you choose to order on WhatsApp, you send the message yourself from your own
            WhatsApp account, and WhatsApp’s own terms apply. We prepare the text, but we don’t send it and we don’t
            put your name, phone number or address in it.
          </li>
          <li>
            <strong>The laboratory</strong> (for custom serum orders) receives the formula, your skin scores and region,
            and the order reference. It doesn’t receive your photo, name or email address.
          </li>
          <li>
            <strong>Our hosting providers</strong> store and process the data for us: Netlify runs the website, and
            Render runs our server and database. Their servers may be outside Tanzania.
          </li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Contact details on a product request are removed by our clean-up once {retention} have passed since the
            request was closed (declined, cancelled or completed). The request itself stays, without them.
          </li>
          <li>Sign-ins expire after 7 days. The same clean-up deletes sign-in records 30 days after they expire.</li>
          <li>Your account and its history are kept until you delete your account.</li>
          <li>
            We keep a record of important actions, such as an admin changing a price or a request status. These records
            don’t contain your contact details.
          </li>
        </ul>
      </Section>

      <Section title="Your choices">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Download your data</strong> or <strong>delete your account</strong> at any time on your{" "}
            <Link href="/account" className="underline underline-offset-4">
              account page
            </Link>
            . Deleting your account removes your name, email address, skin scores and request contact details, and
            can’t be undone. Formulas, orders and requests stay in our records without your name, so past orders
            remain consistent.
          </li>
          <li>
            <strong>Withdraw your consent to photo analysis</strong> on your account page. We won’t analyse new photos
            until you agree again.
          </li>
          <li>To correct your details, contact us using the address below.</li>
        </ul>
      </Section>

      <Section title="Contact">
        {info?.contact_email ? (
          <p>
            Questions about your information:{" "}
            <a href={`mailto:${info.contact_email}`} className="underline underline-offset-4">
              {info.contact_email}
            </a>
          </p>
        ) : (
          <p>
            {infoFailed
              ? "We couldn’t load the contact details right now. Please try again later."
              : "A contact address for privacy questions hasn’t been published yet. Until it is, you can download or delete your data yourself on your account page."}
          </p>
        )}
      </Section>

      <p className="mt-10 text-xs text-brand-500">
        Skin scores are cosmetic estimates, not a medical or dermatological diagnosis.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 space-y-3 text-sm leading-relaxed text-brand-700">
      <h2 className="font-semibold text-brand-900">{title}</h2>
      {children}
    </section>
  );
}

function Row({ a, b }: { a: string; b: string }) {
  return (
    <tr>
      <td className="py-3 pr-4">{a}</td>
      <td className="py-3">{b}</td>
    </tr>
  );
}
