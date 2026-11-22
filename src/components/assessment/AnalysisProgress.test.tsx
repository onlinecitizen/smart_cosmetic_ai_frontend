import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalysisProgress } from "./AnalysisProgress";

describe("AnalysisProgress", () => {
  it("reports each real step's state in text for screen readers", () => {
    render(<AnalysisProgress photoUrl={null} states={{ photo: "done", climate: "active", formula: "pending" }} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(/Checking photo quality.*done/);
    expect(items[1]).toHaveTextContent(/Recording your local climate.*in progress/);
    expect(items[2]).toHaveTextContent(/Applying formulation rules.*waiting/);
  });

  it("marks a failed step", () => {
    render(<AnalysisProgress photoUrl={null} states={{ photo: "error", climate: "pending", formula: "pending" }} />);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(/failed/);
  });

  it("does not claim face detection", () => {
    const { container } = render(
      <AnalysisProgress photoUrl={null} states={{ photo: "active", climate: "pending", formula: "pending" }} />
    );
    expect(container.textContent).not.toMatch(/facial region|detect/i);
  });
});
