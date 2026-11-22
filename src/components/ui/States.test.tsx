import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Alert, EmptyState, ErrorState, StatusBadge } from "./States";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("state components", () => {
  it("announces errors assertively and other alerts politely", () => {
    render(
      <>
        <Alert tone="error">Broken</Alert>
        <Alert tone="warning">Careful</Alert>
      </>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Broken");
    expect(screen.getByRole("status")).toHaveTextContent("Careful");
  });

  it("offers a retry on errors", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Could not load." onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders an empty state with its action link", () => {
    render(<EmptyState title="No orders yet" action={{ href: "/analyze", label: "Start an assessment" }} />);
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start an assessment" })).toHaveAttribute("href", "/analyze");
  });

  it("shows status text, not colour alone", () => {
    render(<StatusBadge label="Request received" tone="progress" />);
    expect(screen.getByText("Request received")).toBeInTheDocument();
  });
});
