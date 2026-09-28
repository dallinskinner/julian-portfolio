// ---------------------------------------------------------------------------
// Site content. Edit the values below to make this your own — nothing else
// in the codebase needs to change for basic content updates.
// ---------------------------------------------------------------------------

export const NAME = "Julian Skinner";

export const ABOUT_LINES: string[] = [
  // TODO: replace with your real bio.
  "I build things for the web — right now this terminal is one of them.",
  "Type 'projects' to see what else I've been working on, or 'contact' to reach me.",
];

export interface Project {
  name: string;
  description: string;
  tech: string[];
  link?: string;
}

export const PROJECTS: Project[] = [
  {
    name: "Music",
    // TODO: tweak this description if you want.
    description: "Original music, on BandLab.",
    tech: [],
    link: "https://www.bandlab.com/partymakesmusic",
  },
  {
    name: "Make Anything",
    // TODO: tweak this description if you want.
    description: "A web app for making anything.",
    tech: [],
    link: "https://make-anything.dallinskinner.com/",
  },
];

export interface ContactLink {
  label: string;
  value: string;
  href: string;
}

// TODO: add GitHub, LinkedIn, etc. here as you get them.
export const CONTACT_LINKS: ContactLink[] = [
  {
    label: "email",
    value: "juliantheskinner@gmail.com",
    href: "mailto:juliantheskinner@gmail.com",
  },
];

export const NOW_LINES: string[] = [
  // TODO: replace with what you're actually up to right now.
  "Building out this portfolio and shipping small projects on the side.",
  "Always happy to talk music, code, or both — see 'contact'.",
];

// TODO: swap in your real favorite quote.
export const QUOTE = '"pizza" — julian skinner';

export const USES_LINES: string[] = [
  // TODO: replace with your actual setup.
  "Editor:   Superset",
  "Terminal: xterm.js and node-pty",
  "OS:       macOS",
  "Keyboard: whatever's within reach",
];

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
