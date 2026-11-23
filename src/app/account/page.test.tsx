import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccountPage from "./page";

const push = vi.fn();
const assign = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/account",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test.customer@example.com", full_name: "Test Customer", role: "customer" },
    loading: false,
  }),
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  push.mockReset();
  assign.mockReset();
  vi.stubGlobal("location", { ...window.location, assign, search: "" });
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

function startDelete(password: string) {
  fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
  fireEvent.change(screen.getByLabelText("Enter your password to confirm"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Permanently delete my account" }));
}

describe("AccountPage", () => {
  it("downloads the customer's data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ account: { email: "test.customer@example.com" } }));
    vi.stubGlobal("fetch", fetchMock);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Download my data" }));
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/account/export");
    click.mockRestore();
  });

  it("withdraws photo consent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ id: "c", consent_type: "facial_image_processing", granted: false }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw photo consent" }));
    expect(await screen.findByText(/Consent withdrawn/)).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ consent_type: "facial_image_processing", granted: false });
  });

  it("needs the password before deleting, and shows a wrong-password error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail: "That password isn’t correct." }, 403)));
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(screen.getByRole("button", { name: "Permanently delete my account" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Enter your password to confirm"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete my account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That password isn’t correct.");
    expect(assign).not.toHaveBeenCalled();
  });

  it("explains when an open request blocks deletion", async () => {
    const detail =
      "You have an order or product request in progress. Cancel it, or wait until it’s completed, then delete your account.";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail }, 409)));
    render(<AccountPage />);
    startDelete("SuperSecret1");
    expect(await screen.findByRole("alert")).toHaveTextContent(/in progress/);
  });

  it("signs out and leaves after a successful deletion", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);
    startDelete("SuperSecret1");
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/?account=deleted"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/account/delete");
    expect(init.method).toBe("POST");
  });
});
