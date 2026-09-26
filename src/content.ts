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

// TODO: replace these with your real projects.
export const PROJECTS: Project[] = [
  {
    name: "project-one",
    description: "A short description of a project you're proud of.",
    tech: ["TypeScript", "Node.js"],
    link: "https://github.com/",
  },
  {
    name: "project-two",
    description: "Another project — what problem did it solve?",
    tech: ["Python"],
    link: "https://github.com/",
  },
  {
    name: "project-three",
    description: "A third project, or delete this one.",
    tech: ["Rust"],
    link: "https://github.com/",
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

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
