import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantResults } from "./AssistantResults";
import { ProfileEditor } from "./ProfileEditor";
import { AssistantConfig, EMPTY_PROFILE, Recommendations } from "@/lib/assistant";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/assistant" }));

const product = {
  id: "p1",
  name: "Gentle Cream Cleanser",
  brand: "TestBrand",
  category: "cleanser",
  description: null,
  size_label: "100 ml",
  price_amount: 18000,
  currency: "TZS",
  availability: "in_stock",
  ingredients_inci: "Aqua, Glycerin",
  skin_types: ["all"],
  concerns: ["dryness"],
  retailer: { id: "r1", name: "Test Shop", city: null, is_test_fixture: false, whatsapp_available: false },
  is_test_fixture: false,
  images: [],
};

function recs(overrides: Partial<Recommendations> = {}): Recommendations {
  return {
    method: "assistant-rules-v1",
    items: [
      {
        product: product as never,
        identity_id: "i1",
        product_url: "/products/p1",
        request_url: "/products/p1/request",
        score: 4,
        reasons: [{ text: "Listed for dryness, which you mentioned.", field: "concerns", basis: "verified", basis_label: "Checked by our team against a source" }],
        cautions: ["Label warning: For external use only."],
      },
    ],
    excluded: [{ product_id: "p2", name: "Rich Moisturiser", brand: null, retailer_name: "Test Shop", reasons: ["Lists “parfum”, which you asked to avoid."] }],
    excluded_count: 1,
    exclusion_counts: { avoid_match: 1 },
    evaluated_count: 2,
    not_matched_count: 0,
    message: "I found 1 product(s).",
    limitations: ["Products are chosen by fixed rules."],
    disclaimer: "This is general cosmetic guidance, not medical advice.",
    ...overrides,
  };
}

const options: AssistantConfig["options"] = {
  focus: [{ code: "skin", label: "Skin care" }],
  skin_types: [{ code: "dry", label: "dry" }],
  skin_concerns: [{ code: "dryness", label: "dryness" }],
  hair_types: [],
  hair_concerns: [],
  avoid_groups: [{ code: "fragrance", label: "fragrance" }],
  categories: [{ code: "skincare", label: "Skincare", children: [{ code: "cleanser", label: "Cleanser" }] }],
  currencies: ["TZS", "KES"],
  feedback_reasons: ["missed_need"],
};

describe("AssistantResults", () => {
  it("shows catalogue products with their reasons, cautions and links", () => {
    render(<AssistantResults lang="en" conversationId="c1" recs={recs()} categoryLabel={(c) => c} feedbackReasons={["missed_need"]} />);
    expect(screen.getAllByText("Gentle Cream Cleanser").length).toBeGreaterThan(0);
    expect(screen.getByText(/Listed for dryness/)).toBeInTheDocument();
    expect(screen.getByText("Checked by our team against a source")).toBeInTheDocument();
    expect(screen.getByText(/For external use only/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request this product" })).toHaveAttribute("href", "/products/p1/request");
    expect(screen.getByText(/parfum/)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/)).toBeInTheDocument();
  });

  it("never renders a link that leaves the product pages", () => {
    const bad = recs();
    bad.items[0] = { ...bad.items[0], request_url: "https://evil.example/pay", product_url: "javascript:alert(1)" };
    render(<AssistantResults lang="en" conversationId="c1" recs={bad} categoryLabel={(c) => c} feedbackReasons={[]} />);
    expect(screen.queryByRole("link", { name: "Request this product" })).toBeNull();
    expect(screen.queryByRole("link", { name: "View details" })).toBeNull();
  });

  it("says plainly when nothing fits", () => {
    render(
      <AssistantResults
        lang="en"
        conversationId="c1"
        recs={recs({ items: [], message: "I couldn't find a reviewed product that fits all of your needs." })}
        categoryLabel={(c) => c}
        feedbackReasons={[]}
      />
    );
    expect(screen.getByText(/couldn't find a reviewed product/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Request this product" })).toBeNull();
  });

  it("sends feedback naming only the products shown", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"f1"}', { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantResults lang="sw" conversationId="c1" recs={recs()} categoryLabel={(c) => c} feedbackReasons={["missed_need"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ndiyo" }));
    await waitFor(() => expect(screen.getByText("Asante kwa maoni yako.")).toBeInTheDocument());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toEqual({ conversation_id: "c1", helpful: true, product_ids: ["p1"] });
    vi.unstubAllGlobals();
  });
});

describe("ProfileEditor", () => {
  it("saves only controlled values, a parsed budget and cleaned ingredients", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileEditor lang="en" profile={EMPTY_PROFILE} options={options} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText("Skin type"), { target: { value: "dry" } });
    fireEvent.click(screen.getByLabelText("Cleanser"));
    fireEvent.click(screen.getByLabelText("fragrance"));
    fireEvent.change(screen.getByLabelText(/Other ingredients/), { target: { value: "Lanolin, x" } });
    fireEvent.change(screen.getByLabelText("Most per product"), { target: { value: "30,000" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "KES" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      skin_type: "dry",
      categories: ["cleanser"],
      avoid_groups: ["fragrance"],
      avoid_ingredients: ["lanolin"],
      budget_max: 30000,
      budget_currency: "KES",
    });
  });

  it("refuses a budget that isn't a whole number", async () => {
    const onSave = vi.fn();
    render(<ProfileEditor lang="sw" profile={EMPTY_PROFILE} options={options} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText("Kiwango cha juu kwa bidhaa"), { target: { value: "elfu thelathini" } });
    fireEvent.click(screen.getByRole("button", { name: "Hifadhi mabadiliko" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("namba kamili");
    expect(onSave).not.toHaveBeenCalled();
  });
});
