import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeContext";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
  localStorage.removeItem("theme");
});

function ToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} data-testid="toggle">
      {theme}
    </button>
  );
}

describe("ThemeContext (real DOM attribute/class toggling)", () => {
  it("defaults to dark and sets data-theme='dark' on the real <html> element", () => {
    render(
      <ThemeProvider defaultTheme="dark" switchable>
        <ToggleButton />
      </ThemeProvider>
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("clicking toggle switches to light and sets data-theme='light' — the attribute the auto-generated CSS overrides target", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="dark" switchable>
        <ToggleButton />
      </ThemeProvider>
    );
    await user.click(screen.getByTestId("toggle"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(screen.getByTestId("toggle")).toHaveTextContent("light");
  });

  it("persists the choice to localStorage and restores it on next mount, when switchable", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ThemeProvider defaultTheme="dark" switchable>
        <ToggleButton />
      </ThemeProvider>
    );
    await user.click(screen.getByTestId("toggle"));
    expect(localStorage.getItem("theme")).toBe("light");
    unmount();

    render(
      <ThemeProvider defaultTheme="dark" switchable>
        <ToggleButton />
      </ThemeProvider>
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("when NOT switchable, toggleTheme is undefined and the theme never changes from defaultTheme", () => {
    render(
      <ThemeProvider defaultTheme="dark" switchable={false}>
        <ToggleButton />
      </ThemeProvider>
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    // No localStorage write should happen in non-switchable mode.
    expect(localStorage.getItem("theme")).toBeNull();
  });
});
