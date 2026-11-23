import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReviewPage from "./review/page";
import StudioResultsPage from "./results/page";
import StudioIntroPage from "./page";
import { groupIntoSteps } from "@/components/studio/RoutineMap";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/studio" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const OPTIONS = {
  categories: [
    { code: "cleanser", label: "Cleanser" },
    { code: "serum", label: "Serum" },
    { code: "sunscreen", label: "Sunscreen" },
  ],
  skin_types: [{ code: "dry", label: "Dry" }],
  concerns: [{ code: "dryness", label: "Dryness" }],
  avoid_groups: [{ code: "fragrance", label: "Fragrance (parfum)", terms: ["parfum"] }],
  availability: [],
};
const ANSWERS = { skin_type: "dry", concerns: ["dryness"], avoid_groups: ["fragrance"], avoid_text: "shea butter", category: "" };

function product(id: string, category: string, name: string) {
  return {
    id,
    sku: id,
    name,
    brand: null,
    category,
    description: null,
    size_label: null,
    price_amount: null,
    currency: null,
    availability: "in_stock",
    ingredients_inci: null,
    skin_types: null,
    concerns: ["dryness"],
    is_test_fixture: true,
    reviewed_at: null,
    retailer: { id: "r", name: "Test Retailer", city: null, is_test_fixture: true, whatsapp_available: false },
  };
}
const RESULT = {
  method: "rules-v1",
  evaluated_count: 3,
  recommended: [
    { product: product("p1", "cleanser", "Gentle Cleanser"), score: 2, matched_concerns: ["dryness"], reasons: ["Listed for dryness, one of your concerns."], cautions: [] },
    { product: product("p2", "cleanser", "Second Cleanser"), score: 2, matched_concerns: ["dryness"], reasons: ["Listed for dryness, one of your concerns."], cautions: [] },
  ],
  excluded: [],
  not_matched_count: 1,
  limitations: ["Rules only."],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  push.mockReset();
  window.sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("Beauty Studio intro", () => {
  it("starts the assessment, or resumes saved answers", async () => {
    const { unmount } = render(<StudioIntroPage />);
    expect(screen.getByRole("link", { name: "Start the assessment" })).toHaveAttribute("href", "/studio/assessment");
    unmount();
    window.sessionStorage.setItem("sca.studio.v1", JSON.stringify(ANSWERS));
    render(<StudioIntroPage />);
    expect(await screen.findByRole("link", { name: "Continue where I left off" })).toHaveAttribute("href", "/studio/review");
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(window.sessionStorage.getItem("sca.studio.v1")).toBeNull();
    expect(screen.getByRole("link", { name: "Start the assessment" })).toBeInTheDocument();
  });
});

describe("Review my needs", () => {
  it("lists every answer with an edit link and continues to results", async () => {
    window.sessionStorage.setItem("sca.studio.v1", JSON.stringify(ANSWERS));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(OPTIONS)));
    render(<ReviewPage />);
    expect(await screen.findByText("Here’s what we understood")).toBeInTheDocument();
    expect(screen.getByText("Dry")).toBeInTheDocument();
    expect(screen.getByText("Fragrance (parfum)")).toBeInTheDocument();
    expect(screen.getByText("shea butter")).toBeInTheDocument();
    expect(screen.getByText("Any product type")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit: What would you like help with?" })).toHaveAttribute(
      "href",
      "/studio/assessment?edit=concerns"
    );
    fireEvent.click(screen.getByRole("button", { name: "Show my matches" }));
    expect(push).toHaveBeenCalledWith("/studio/results");
  });

  it("asks to start when nothing has been answered", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(OPTIONS)));
    render(<ReviewPage />);
    expect(await screen.findByText("You haven’t answered the questions yet.")).toBeInTheDocument();
  });
});

describe("Studio results", () => {
  it("sends exactly the saved answers and shows a routine built only from matches", async () => {
    window.sessionStorage.setItem("sca.studio.v1", JSON.stringify(ANSWERS));
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(String(url).includes("/options") ? json(OPTIONS) : json(RESULT))
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<StudioResultsPage />);
    expect(await screen.findByRole("heading", { name: "Your routine, step by step" })).toBeInTheDocument();
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes("/recommendations"))!;
    expect(JSON.parse((call as unknown as [string, RequestInit])[1].body as string)).toEqual({
      skin_type: "dry",
      concerns: ["dryness"],
      avoid_groups: ["fragrance"],
      avoid_ingredients: ["shea butter"],
      category: null,
    });
    expect(screen.getAllByRole("link", { name: "Gentle Cleanser" }).length).toBeGreaterThan(0);
    expect(screen.getByText("+1 more")).toBeInTheDocument();
    // Steps with no matched product say so instead of being filled in.
    expect(screen.getAllByText("No listed match for this step yet")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Change my answers" }));
    expect(push).toHaveBeenCalledWith("/studio/review");
  });

  it("shows an error with retry", async () => {
    window.sessionStorage.setItem("sca.studio.v1", JSON.stringify(ANSWERS));
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/options")) return Promise.resolve(json(OPTIONS));
        const r = fail ? json({ detail: "x" }, 500) : json(RESULT);
        fail = false;
        return Promise.resolve(r);
      })
    );
    render(<StudioResultsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your routine, step by step" })).toBeInTheDocument());
  });

  it("groups matches into routine steps by category", () => {
    const steps = groupIntoSteps(RESULT.recommended as never);
    expect(steps.map((s) => s.step)).toEqual(["Cleanse", "Tone", "Treat", "Moisturise", "Protect (daytime)", "Extras"]);
    expect(steps[0].products).toHaveLength(2);
    expect(steps[2].products).toHaveLength(0);
  });
});
