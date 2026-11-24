import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitch, translate } from "@/lib/i18n";
import { isComplete, toRecommendationRequest, EMPTY_ANSWERS } from "@/lib/studio";

let pathname = "/";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: null, loading: false }) }));

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}
afterEach(() => vi.unstubAllGlobals());

describe("Homepage", () => {
  it("follows the reference: hero, two feature cards, three steps and the products banner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ items: [], total: 0 })));
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Discover YourNatural Beauty");
    expect(screen.getByRole("link", { name: "Start Your Beauty Journey" })).toHaveAttribute("href", "/studio");
    expect(screen.getByRole("link", { name: /Talk to AI/ })).toHaveAttribute("href", "/assistant");
    // Signed out: the camera page asks for an account first.
    expect(screen.getByRole("link", { name: /Face Scan/ })).toHaveAttribute("href", "/register?next=/analyze");
    expect(screen.getByText(/Share Your Needs/)).toBeInTheDocument();
    expect(screen.getByText(/Get Personalized Guidance/)).toBeInTheDocument();
    expect(screen.getByText(/Explore Suitable Products/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore Products" })).toHaveAttribute("href", "/products");
  });

  it("labels the face scan as a demonstration and makes no precision claims", () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const { container } = render(<HomePage />);
    expect(screen.getByText(/Demonstration: results are not a skin analysis/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/precise|diagnos|%/i);
  });
});

describe("BottomNav", () => {
  it("marks the current tab and offers login when signed out", () => {
    pathname = "/products";
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Beauty Studio" })).toHaveAttribute("href", "/studio");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("is hidden inside the full-screen assessment", () => {
    pathname = "/studio/assessment";
    const { container } = render(<BottomNav />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("i18n", () => {
  it("falls back to English and fills variables", () => {
    expect(translate("sw", "nav.products")).toBe("Bidhaa");
    expect(translate("sw", "home.lead")).toBe(translate("en", "home.lead"));
    expect(translate("en", "assess.progress", { n: 2, total: 5 })).toBe("Question 2 of 5");
  });

  it("keeps the unreviewed Kiswahili switch hidden by default", () => {
    const { container } = render(<LanguageSwitch />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("studio answers", () => {
  it("needs a skin type and maps 'Any' category to null", () => {
    expect(isComplete(EMPTY_ANSWERS)).toBe(false);
    const a = { ...EMPTY_ANSWERS, skin_type: "not_sure" as const, avoid_text: "Shea Butter, shea butter" };
    expect(isComplete(a)).toBe(true);
    expect(toRecommendationRequest(a)).toEqual({
      skin_type: "not_sure",
      concerns: [],
      avoid_groups: [],
      avoid_ingredients: ["shea butter"],
      category: null,
    });
  });
});
