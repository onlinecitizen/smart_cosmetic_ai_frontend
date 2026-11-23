import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { I18nProvider } from "@/lib/i18n";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Cosmetic AI — Beauty discovery for Zanzibar",
  description:
    "Answer a few questions and find skincare listed by partner shops in Zanzibar, with a clear reason for every suggestion. Cosmetic guidance, not medical advice.",
};

export const viewport: Viewport = {
  themeColor: "#FBF8F3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AuthProvider>
          <I18nProvider>
            <Navbar />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
            <Footer />
            <BottomNav />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
