import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Assessment } from "./Assessment";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/studio/assessment" }));
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
  ],
  skin_types: [
    { code: "dry", label: "Dry" },
    { code: "oily", label: "Oily" },
  ],
  concerns: [
    { code: "dryness", label: "Dryness" },
    { code: "oiliness", label: "Oiliness" },
  ],
  avoid_groups: [{ code: "fragrance", label: "Fragrance (parfum)", terms: ["parfum", "fragrance"] }],
  availability: [],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  push.mockReset();
  window.sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(OPTIONS)));
});
afterEach(() => vi.unstubAllGlobals());

const next = () => fireEvent.click(screen.getByRole("button", { name: /^(Next|Review my answers|Save and return to review)$/ }));

describe("Assessment", () => {
  it("is a fixed full-screen dialog that locks page scrolling", async () => {
    render(<Assessment />);
    await screen.findByRole("heading", { name: "How would you describe your skin?" });
    expect(screen.getByRole("dialog")).toHaveClass("fixed", "inset-0");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("requires a skin type, then moves one question at a time with stable progress", async () => {
    render(<Assessment />);
    await screen.findByRole("heading", { name: "How would you describe your skin?" });
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Please choose one option to continue.");
    fireEvent.click(screen.getByLabelText("Dry"));
    next();
    const q2 = await screen.findByRole("heading", { name: "What would you like help with?" });
    expect(q2).toHaveFocus();
    expect(q2.closest("fieldset")).toHaveClass("question-enter-up");
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "How would you describe your skin?" })).not.toBeInTheDocument();
  });

  it("goes back without losing answers, animating the previous question down", async () => {
    render(<Assessment />);
    fireEvent.click(await screen.findByLabelText("Oily"));
    next();
    fireEvent.click(await screen.findByLabelText("Oiliness"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    const q1 = await screen.findByRole("heading", { name: "How would you describe your skin?" });
    expect(q1.closest("fieldset")).toHaveClass("question-enter-down");
    expect(screen.getByLabelText("Oily")).toBeChecked();
    next();
    expect(await screen.findByLabelText("Oiliness")).toBeChecked();
  });

  it("submits on Enter (form submit) for keyboard users", async () => {
    render(<Assessment />);
    fireEvent.click(await screen.findByLabelText("Dry"));
    fireEvent.submit(screen.getByLabelText("Dry").closest("form")!);
    expect(await screen.findByRole("heading", { name: "What would you like help with?" })).toBeInTheDocument();
  });

  it("validates typed ingredients and finishes on the review screen with answers saved", async () => {
    render(<Assessment />);
    fireEvent.click(await screen.findByLabelText("Dry"));
    next();
    fireEvent.click(await screen.findByLabelText("Dryness"));
    next();
    fireEvent.click(await screen.findByLabelText(/Fragrance \(parfum\)/));
    next();
    const input = await screen.findByLabelText("Any other ingredients to avoid?");
    fireEvent.change(input, { target: { value: "ab" } });
    expect(screen.getByText(/between 3 and 60 characters/)).toBeInTheDocument();
    next();
    expect(screen.getByRole("alert")).toHaveTextContent(/between 3 and 60/);
    fireEvent.change(input, { target: { value: "shea butter" } });
    next();
    fireEvent.click(await screen.findByLabelText("Serum"));
    next();
    expect(push).toHaveBeenCalledWith("/studio/review");
    expect(JSON.parse(window.sessionStorage.getItem("sca.studio.v1")!)).toEqual({
      skin_type: "dry",
      concerns: ["dryness"],
      avoid_groups: ["fragrance"],
      avoid_text: "shea butter",
      category: "serum",
    });
  });

  it("opens a single question for editing and returns to review", async () => {
    window.sessionStorage.setItem(
      "sca.studio.v1",
      JSON.stringify({ skin_type: "dry", concerns: [], avoid_groups: [], avoid_text: "", category: "" })
    );
    render(<Assessment editId="concerns" />);
    expect(await screen.findByRole("heading", { name: "What would you like help with?" })).toBeInTheDocument();
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Oiliness"));
    next();
    expect(push).toHaveBeenCalledWith("/studio/review");
    expect(JSON.parse(window.sessionStorage.getItem("sca.studio.v1")!).concerns).toEqual(["oiliness"]);
  });

  it("shows loading, then an error with retry when the questions can't load", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ detail: "boom" }, 500))
      .mockResolvedValue(json(OPTIONS));
    vi.stubGlobal("fetch", fetchMock);
    render(<Assessment />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading questions");
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByLabelText("Dry")).toBeInTheDocument());
  });
});
