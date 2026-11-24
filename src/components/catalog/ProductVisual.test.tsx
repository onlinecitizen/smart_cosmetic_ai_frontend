import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductVisual } from "./ProductVisual";

const image = {
  url: "/api/v1/catalog/images/abc/file?v=123",
  alt_text: "Photo of CeraVe Hydrating Facial Cleanser",
  licence_note: "Photo: CC BY-SA 3.0, Open Beauty Facts contributors (Open Beauty Facts)",
};

describe("ProductVisual", () => {
  it("shows the photo with its credit on the product page", () => {
    render(<ProductVisual category="cleanser" categoryLabel="Cleanser" size="detail" image={image} />);
    expect(screen.getByRole("img", { name: image.alt_text })).toBeInTheDocument();
    expect(screen.getByText(image.licence_note)).toBeInTheDocument();
  });

  it("keeps cards compact: no credit line on a card", () => {
    render(<ProductVisual category="cleanser" categoryLabel="Cleanser" image={image} />);
    expect(screen.getByRole("img", { name: image.alt_text })).toBeInTheDocument();
    expect(screen.queryByText(image.licence_note)).not.toBeInTheDocument();
  });

  it("shows the explicit no-photo placeholder when there is no image", () => {
    render(<ProductVisual category="cleanser" categoryLabel="Cleanser" image={null} />);
    expect(screen.getByText("No photo supplied yet")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
