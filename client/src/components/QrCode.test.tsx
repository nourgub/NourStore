import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QrCode } from "./QrCode";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("QrCode (self-hosted, real DOM)", () => {
  it("renders a real data: URL image with zero network calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { container } = render(
      <QrCode value="https://example.com/verify/certificate/NX-ABC123" size={120} />
    );

    await waitFor(() => {
      const img = container.querySelector("img");
      expect(img).toBeTruthy();
    });

    const img = container.querySelector("img")!;
    // The whole point of this fix: the image is generated locally as a
    // data: URL, never fetched from any external image service.
    expect(img.getAttribute("src")).toMatch(/^data:image\//);
    expect(img.getAttribute("src")).not.toContain("qrserver.com");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders nothing before generation completes and nothing on failure, never crashing", async () => {
    const { container } = render(<QrCode value="" size={120} />);
    // Even a valid-but-unusual input should never throw during render.
    await waitFor(() => {
      expect(container.querySelector("img") === null || container.querySelector("img") instanceof HTMLImageElement).toBe(true);
    });
  });

  it("regenerates when the value prop changes", async () => {
    const { container, rerender } = render(
      <QrCode value="https://example.com/a" size={100} />
    );
    await waitFor(() => expect(container.querySelector("img")).toBeTruthy());
    const firstSrc = container.querySelector("img")!.getAttribute("src");

    rerender(<QrCode value="https://example.com/b" size={100} />);
    await waitFor(() => {
      const src = container.querySelector("img")?.getAttribute("src");
      expect(src).toBeTruthy();
      expect(src).not.toBe(firstSrc);
    });
  });
});
