export type ThemeName = "green" | "amber" | "blue";

const THEMES: ThemeName[] = ["green", "amber", "blue"];
const STORAGE_KEY = "theme";

function classFor(theme: ThemeName): string | null {
  return theme === "green" ? null : `theme-${theme}`;
}

export function isThemeName(value: string): value is ThemeName {
  return (THEMES as string[]).includes(value);
}

export function availableThemes(): ThemeName[] {
  return THEMES;
}

export function getTheme(): ThemeName {
  for (const theme of THEMES) {
    const className = classFor(theme);
    if (className && document.body.classList.contains(className)) return theme;
  }
  return "green";
}

export function setTheme(theme: ThemeName): void {
  for (const t of THEMES) {
    const className = classFor(t);
    if (className) document.body.classList.remove(className);
  }
  const className = classFor(theme);
  if (className) document.body.classList.add(className);

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable (e.g. private browsing); the choice just
    // won't persist across reloads.
  }
}

/** Applies the visitor's last-chosen theme, if any. Call once at startup. */
export function applyPersistedTheme(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isThemeName(saved)) setTheme(saved);
  } catch {
    // localStorage unavailable; default theme stays.
  }
}
