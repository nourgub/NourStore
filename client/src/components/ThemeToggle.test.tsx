import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
  localStorage.removeItem("theme");
});

describe("ThemeToggle (shared component, real DOM)", () => {
  it("renders and toggles the real document theme when switchable", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="dark" switchable>
        <ThemeToggle lang="en" />
      </ThemeProvider>
    );
    const button = screen.getByRole("button");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await user.click(button);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("renders nothing when the provider is not switchable", () => {
    const { container } = render(
      <ThemeProvider defaultTheme="dark" switchable={false}>
        <ThemeToggle lang="en" />
      </ThemeProvider>
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows a localized accessible label per language", () => {
    render(
      <ThemeProvider defaultTheme="dark" switchable>
        <ThemeToggle lang="fr" />
      </ThemeProvider>
    );
    expect(
      screen.getByLabelText("Passer au mode clair")
    ).toBeInTheDocument();
  });
});
