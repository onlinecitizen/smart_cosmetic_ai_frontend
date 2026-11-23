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

const OPTIONS = { categories: [{ code: "serum", label: "Serum" }], skin_types: [], concerns: [], avoid_groups: [], availability: [] };
function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}
afterEach(() => vi.unstubAllGlobals());

describe("Homepage", () => {
  it("has the two primary actions and category tiles from the catalogue vocabulary", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(OPTIONS)));
    render(<HomePage />);
    expect(screen.getAllByRole("link", { name: "Discover My Routine" })[0]).toHaveAttribute("href", "/studio");
    expect(screen.getByRole("link", { name: "Explore Products" })).toHaveAttribute("href", "/products");
    expect(await screen.findByRole("link", { name: /Serum/ })).toHaveAttribute("href", "/products?category=serum");
  });

  it("hides the category section if the vocabulary can't load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Explore Products" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Browse by category" })).not.toBeInTheDocument();
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
