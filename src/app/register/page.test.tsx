import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./page";

const register = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/register",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ register }) }));

beforeEach(() => register.mockReset().mockResolvedValue({ id: "u1" }));

function fill() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test Person" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test.person@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "SuperSecret1" } });
}

describe("RegisterPage", () => {
  it("links to the privacy notice", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("link", { name: "privacy notice" })).toHaveAttribute("href", "/privacy");
  });

  it("does not register until the privacy notice is acknowledged", () => {
    render(<RegisterPage />);
    fill();
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent(/confirm you have read the privacy notice/);
    expect(register).not.toHaveBeenCalled();
  });

  it("sends the acknowledgement with the registration", async () => {
    render(<RegisterPage />);
    fill();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);
    await vi.waitFor(() =>
      expect(register).toHaveBeenCalledWith("test.person@example.com", "Test Person", "SuperSecret1", true)
    );
  });
});
