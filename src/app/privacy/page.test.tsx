import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("PrivacyPage", () => {
  it("does not invent a contact address when none is configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json({ notice_version: "2026-11-23", contact_email: null, order_request_retention_days: 365 }))
    );
    render(<PrivacyPage />);
    expect(await screen.findByText(/hasn’t been published yet/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /@/ })).not.toBeInTheDocument();
    expect(screen.getByText(/365 days/)).toBeInTheDocument();
    expect(screen.getByText(/Version 2026-11-23/)).toBeInTheDocument();
  });

  it("shows the configured contact address", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json({ notice_version: "v", contact_email: "privacy@example.com", order_request_retention_days: 180 })
        )
    );
    render(<PrivacyPage />);
    expect(await screen.findByRole("link", { name: "privacy@example.com" })).toHaveAttribute(
      "href",
      "mailto:privacy@example.com"
    );
  });

  it("describes data handling truthfully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    render(<PrivacyPage />);
    expect(await screen.findByText(/couldn’t load the contact details/)).toBeInTheDocument();
    expect(screen.getByText(/then discarded straight away/)).toBeInTheDocument();
    expect(screen.getByText(/only when you\s+tick the box/)).toBeInTheDocument();
    expect(screen.getByText(/Netlify runs the website/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "account page" })).toHaveAttribute("href", "/account");
  });
});
