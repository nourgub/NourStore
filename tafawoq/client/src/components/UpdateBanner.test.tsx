import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpdateBanner from "./UpdateBanner";

afterEach(() => {
  cleanup();
  delete (window as any).__nourixApplyUpdate;
});

describe("UpdateBanner (real DOM rendering)", () => {
  it("renders nothing initially — no update event has fired yet", () => {
    render(<UpdateBanner />);
    expect(
      screen.queryByText("نسخة جديدة من المنصة متوفرة")
    ).not.toBeInTheDocument();
  });

  it("shows the update banner once the real service-worker event fires", async () => {
    render(<UpdateBanner />);
    window.dispatchEvent(new CustomEvent("nourix:sw-update-available"));
    expect(
      await screen.findByText("نسخة جديدة من المنصة متوفرة")
    ).toBeInTheDocument();
  });

  it("clicking 'update now' calls the real window.__nourixApplyUpdate hook main.tsx installs", async () => {
    const applyUpdate = vi.fn();
    (window as any).__nourixApplyUpdate = applyUpdate;

    const user = userEvent.setup();
    render(<UpdateBanner />);
    window.dispatchEvent(new CustomEvent("nourix:sw-update-available"));

    const button = await screen.findByRole("button", { name: "تحديث الآن" });
    await user.click(button);

    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it("disables the button and shows a loading label after being clicked, so a person can't double-trigger the update", async () => {
    (window as any).__nourixApplyUpdate = vi.fn();
    const user = userEvent.setup();
    render(<UpdateBanner />);
    window.dispatchEvent(new CustomEvent("nourix:sw-update-available"));

    const button = await screen.findByRole("button", { name: "تحديث الآن" });
    await user.click(button);

    expect(
      await screen.findByRole("button", { name: "جارٍ التحديث…" })
    ).toBeDisabled();
  });

  it("cleans up its event listener on unmount (no memory leak / stale handler)", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<UpdateBanner />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "nourix:sw-update-available",
      expect.any(Function)
    );
    removeSpy.mockRestore();
  });
});
