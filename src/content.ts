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
  /** Longer case-study paragraphs, shown by 'cat <project>.txt'. */
  details?: string[];
  /** Path to an image under public/, e.g. "/screenshots/make-anything.png". */
  screenshot?: string;
}

export const PROJECTS: Project[] = [
  {
    name: "Music",
    // TODO: tweak this description if you want.
    description: "Original music, on BandLab.",
    tech: [],
    link: "https://www.bandlab.com/partymakesmusic",
    // TODO: replace with your real story behind this project, and set
    // `screenshot` to a path under public/ if you want an image here too.
    details: ["Writing and producing my own tracks, mostly for fun and to get better at both."],
  },
  {
    name: "Make Anything",
    // TODO: tweak this description if you want.
    description: "A web app for making anything.",
    tech: [],
    link: "https://make-anything.dallinskinner.com/",
    // TODO: replace with your real story behind this project, and set
    // `screenshot` to a path under public/ if you want an image here too.
    details: ["A small web app I built to explore an idea — check the live link above for the full picture."],
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

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: string[];
}

// TODO: replace these with real posts — add more entries the same shape.
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "hello-world",
    title: "Hello, world",
    date: "2026-09-29",
    summary: "Why this portfolio is a terminal.",
    body: [
      "I wanted a portfolio that felt like something I'd actually build, not another templated grid of cards.",
      "So it's a terminal instead — type 'help' to see what it can do, and 'achievements' if you like hunting for secrets.",
    ],
  },
  {
    slug: "building-in-public",
    title: "Building in public",
    date: "2026-09-29",
    summary: "What the 'roadmap' command is for.",
    body: [
      "I'm adding to this site in small batches, and 'roadmap' is where I'll keep a running list of what just shipped and what's coming next.",
      "If something in there looks interesting, check back later — it'll move from 'coming soon' to actually working eventually.",
    ],
  },
];

export const ROADMAP: { shipped: string[]; planned: string[] } = {
  // TODO: keep this updated as you ship things.
  shipped: [
    "'create': collaborative canvas with invite links, live cursors, PDF import/export",
    "Blog / devlog (this page)",
    "Richer project write-ups — see 'cat music.txt' or 'cat make-anything.txt'",
    "40+ hidden easter-egg commands — see 'achievements'",
    "A full Windows 98 theme, boot sound included — it's hidden, go find it",
  ],
  planned: [
    "A playable mini-game, right here in the terminal",
    "A command-palette (Cmd+K style) way to jump around the site",
  ],
};

export interface AdventureRoom {
  id: string;
  description: string[];
  exits: Record<string, string>;
  item?: string;
}

// TODO: this is a first concept — personalize the rooms/items/ending with
// your own real details whenever you're happy with the shape of it.
export const ADVENTURE_ROOMS: Record<string, AdventureRoom> = {
  start: {
    id: "start",
    description: [
      "You wake up inside a glowing green terminal. Cursor blinking, somewhere in the dark.",
      "Two doors: one hums with music, the other flickers like a monitor.",
      "Exits: studio, cave",
    ],
    exits: { studio: "studio", cave: "cave" },
  },
  studio: {
    id: "studio",
    description: [
      "A small home studio. Headphones on a hook, a half-finished track looping quietly.",
      "This is where the 'Music' project lives — real tracks, on BandLab.",
      "Exits: start, kitchen",
    ],
    exits: { start: "start", kitchen: "kitchen" },
    item: "a vinyl record",
  },
  cave: {
    id: "cave",
    description: [
      "A cluttered dev cave. Three monitors, one of them definitely just for Stack Overflow.",
      "This is where 'Make Anything' got built.",
      "Exits: start, kitchen",
    ],
    exits: { start: "start", kitchen: "kitchen" },
    item: "a floppy disk labeled MAKE ANYTHING",
  },
  kitchen: {
    id: "kitchen",
    description: [
      "The kitchen. There is, as always, pizza.",
      "A sticky note on the fridge just says: \"pizza\" — julian skinner",
      "Exits: exit",
    ],
    exits: { exit: "exit" },
  },
  exit: {
    id: "exit",
    description: [
      "You step back out into the terminal proper.",
      "Thanks for playing — this was just a concept. Try 'projects' or 'contact' for the real thing.",
    ],
    exits: {},
  },
};

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
