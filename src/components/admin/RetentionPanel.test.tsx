import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RetentionPanel } from "./RetentionPanel";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const PREVIEW = { retention_days: 365, order_requests_to_clear: 2, old_sessions: 5, old_reset_tokens: 0 };
const EMPTY = { ...PREVIEW, order_requests_to_clear: 0, old_sessions: 0 };

afterEach(() => vi.unstubAllGlobals());

describe("RetentionPanel", () => {
  it("previews, asks for confirmation, then runs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(PREVIEW))
      .mockResolvedValueOnce(json(PREVIEW))
      .mockResolvedValueOnce(json(EMPTY));
    vi.stubGlobal("fetch", fetchMock);
    render(<RetentionPanel />);
    expect(await screen.findByText("Order requests to clear: 2")).toBeInTheDocument();
    expect(screen.getByText(/more\s+than 365 days ago/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run clean-up" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Yes, remove this data" }));
    expect(await screen.findByText(/contact details removed from 2 request/)).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/v1/admin/privacy/retention/run");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(await screen.findByText("Nothing to remove right now.")).toBeInTheDocument();
  });

  it("shows an error when the preview fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail: "Admin access required" }, 403)));
    render(<RetentionPanel />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run clean-up" })).not.toBeInTheDocument();
  });
});
