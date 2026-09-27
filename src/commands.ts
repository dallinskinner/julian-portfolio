import { ABOUT_LINES, CONTACT_LINKS, NAME, PROJECTS, slugify } from "./content";
import { escapeHtml } from "./utils";
import { toggleMatrix } from "./matrix";
import { runExplosion } from "./explosion";
import { getSpeedMultiplier, setSpeedMultiplier } from "./speed";
import { getVisitCount, resetLocalVisitFlag } from "./visitors";
import { runBsod } from "./bsod";
import { runOops } from "./oops";

export type CommandOutput = string[];

export interface EffectAPI {
  /** Append a line of trusted HTML. */
  print: (html: string, className?: string) => void;
  /** Append a <pre> block of plain (auto-escaped) text and return it so it can be updated in place. */
  printArt: (text: string) => HTMLElement;
  clear: () => void;
  sleep: (ms: number) => Promise<void>;
}

export interface CommandResult {
  lines?: CommandOutput;
  clear?: boolean;
  /** For commands that animate output over time instead of replying instantly. */
  effect?: (api: EffectAPI) => Promise<void>;
}

export type CommandHandler = (args: string[], history: string[]) => CommandResult;

interface CommandSpec {
  summary: string;
  hidden?: boolean;
  run: CommandHandler;
}

function renderAbout(): CommandOutput {
  return ABOUT_LINES.map((line) => (line ? escapeHtml(line) : "&nbsp;"));
}

function renderProjects(): CommandOutput {
  const out: CommandOutput = [];
  PROJECTS.forEach((p, i) => {
    out.push(`<span class="accent">[${i + 1}]</span> <span class="highlight">${escapeHtml(p.name)}</span>`);
    out.push(`    ${escapeHtml(p.description)}`);
    if (p.tech.length) {
      out.push(`    <span class="dim">tech:</span> ${escapeHtml(p.tech.join(", "))}`);
    }
    if (p.link) {
      out.push(
        `    <span class="dim">link:</span> <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.link)}</a>`
      );
    }
    if (i < PROJECTS.length - 1) out.push("&nbsp;");
  });
  return out;
}

function renderProjectDetail(slug: string): CommandOutput | null {
  const p = PROJECTS.find((proj) => slugify(proj.name) === slug);
  if (!p) return null;
  return [
    `<span class="highlight">${escapeHtml(p.name)}</span>`,
    escapeHtml(p.description),
    ...(p.tech.length ? [`<span class="dim">tech:</span> ${escapeHtml(p.tech.join(", "))}`] : []),
    ...(p.link
      ? [`<span class="dim">link:</span> <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.link)}</a>`]
      : []),
  ];
}

function renderContact(): CommandOutput {
  return CONTACT_LINKS.map(
    (c) => `<span class="dim">${escapeHtml(c.label)}:</span> <a href="${escapeHtml(c.href)}">${escapeHtml(c.value)}</a>`
  );
}

function bombArt(n: number): string {
  return [
    "        |",
    "       ( )",
    "    .-'''-.",
    "   /       \\",
    `  |    ${n}    |`,
    "   \\       /",
    "    '-----'",
  ].join("\n");
}

function brewFrame(percent: number): string {
  const width = 12;
  const filled = Math.round((percent / 100) * width);
  const bar = "#".repeat(filled) + "-".repeat(width - filled);
  return [
    "    ( (",
    "     ) )",
    "   ________",
    "  /  brew  \\",
    "  \\________/",
    "",
    `  [${bar}] ${percent}%`,
  ].join("\n");
}

const TRAIN = [
  "      ____                 ",
  "    _/o  \\_____A_____      ",
  "   |  ___    __    __ \\___ ",
  "   |_/   \\__/  \\__/  \\___| ",
  "  ___oo____oo____oo____oo__",
];

const OTTER = [
  "    ___",
  " __/o o\\_____",
  "(  =(_)=  )   )",
  " \\____|____)_/",
  "    ~   ~   ~",
];

const BEAVER = [
  "    ___",
  " __/o o\\_____",
  "(  =(_)=  ) )",
  " \\__ || __)_[=======]",
  "    ~    ~    ~~~~~~~",
];

const CAPYBARA = [
  "    ___",
  " __/     \\_______",
  "(  o     o        )",
  " \\________________/",
  "   ^^    ^^    ^^",
];

const SNAKE = [
  "  ,~~^~~,~~^~~,",
  " ( o             )==>",
  "  `~~,~~^~~,~~^~'",
];

const SHARK_FIN = [
  "        /\\",
  "       /  \\",
  "      /    \\",
  " ____/      \\________",
  "~~~~~~~~~~~~~~~~~~~~~~",
];

const OWL = [
  "   ,^..^,",
  "  ( O  O )",
  "   )  ~  (",
  "  (___||___)",
  "    ^    ^",
];

function scrollFrame(art: string[], offset: number): string {
  return art
    .map((line) => {
      if (offset >= 0) return " ".repeat(offset) + line;
      const cut = -offset;
      return cut >= line.length ? "" : line.slice(cut);
    })
    .join("\n");
}

async function runScroller(api: EffectAPI, art: string[]): Promise<void> {
  const width = Math.max(...art.map((l) => l.length));
  const start = 80;
  const end = -width;
  const el = api.printArt(scrollFrame(art, start));
  for (let offset = start; offset > end; offset -= 3) {
    el.textContent = scrollFrame(art, offset);
    await api.sleep(45);
  }
  el.remove();
}

let coffeeCount = 0;

const FILES = ["about.txt", "contact.txt", "projects/"];

const FORTUNES = [
  "There are only two hard things in computer science: cache invalidation and naming things.",
  "It works on my machine.",
  "99 little bugs in the code, 99 little bugs. take one down, patch it around, 127 little bugs in the code.",
  "Weeks of coding can save you hours of planning.",
  "There is no cloud. it's just someone else's computer.",
  "A SQL query walks into a bar, walks up to two tables and asks: 'can I join you?'",
  "To understand recursion, you must first understand recursion.",
  "I would love to change the world, but they won't give me the source code.",
];

// Commands excluded from the 'achievements' checklist — meta/utility, not
// really "secrets" to hunt for.
const ACHIEVEMENT_EXEMPT = new Set(["help-hidden", "achievements"]);
const discoveredSecrets = new Set<string>();

export const COMMANDS: Record<string, CommandSpec> = {
  help: {
    summary: "list available commands",
    run: () => ({
      lines: [
        "Available commands:",
        "&nbsp;",
        ...Object.entries(COMMANDS)
          .filter(([, spec]) => !spec.hidden)
          .map(([name, spec]) => `  <span class="highlight">${name.padEnd(10)}</span> ${escapeHtml(spec.summary)}`),
      ],
    }),
  },
  "help-hidden": {
    summary: "list the hidden commands",
    hidden: true,
    run: () => ({
      lines: [
        "Hidden commands:",
        "&nbsp;",
        ...Object.entries(COMMANDS)
          .filter(([name, spec]) => spec.hidden && name !== "help-hidden")
          .map(([name, spec]) => `  <span class="highlight">${name.padEnd(14)}</span> ${escapeHtml(spec.summary)}`),
      ],
    }),
  },
  about: {
    summary: "about me",
    run: () => ({ lines: renderAbout() }),
  },
  whoami: {
    summary: "alias for 'about'",
    hidden: true,
    run: () => ({ lines: renderAbout() }),
  },
  projects: {
    summary: "list my projects",
    run: () => ({ lines: renderProjects() }),
  },
  contact: {
    summary: "how to reach me",
    run: () => ({ lines: renderContact() }),
  },
  visitors: {
    summary: "how many people have visited this site",
    run: () => ({
      effect: async (api) => {
        api.print("checking the counter...");
        const count = await getVisitCount();
        if (count === null) {
          api.print("couldn't reach the counter. try again later.");
        } else {
          api.print(`<span class="highlight">${count}</span> visit${count === 1 ? "" : "s"} so far.`);
        }
      },
    }),
  },
  resetvisitors: {
    summary: "reset the visitor counter",
    hidden: true,
    run: () => {
      resetLocalVisitFlag();
      return {
        lines: [
          "cleared your local visit flag — your next reload will count as a new visit.",
          "&nbsp;",
          "(this can't reset the global count everyone else sees: a static site with",
          "no backend has nowhere safe to keep the secret key that would allow that.)",
        ],
      };
    },
  },
  ls: {
    summary: "list files",
    run: (args) => {
      if (args[0] === "projects") {
        return { lines: PROJECTS.map((p) => `${slugify(p.name)}.txt`) };
      }
      return { lines: [FILES.join("  ")] };
    },
  },
  cat: {
    summary: "cat <file> — print a file's contents",
    run: (args) => {
      const file = args[0];
      if (!file) return { lines: ["usage: cat &lt;file&gt;"] };
      if (file === "about.txt") return { lines: renderAbout() };
      if (file === "contact.txt") return { lines: renderContact() };
      const projectMatch = file.match(/^projects\/([\w-]+)\.txt$/) || file.match(/^([\w-]+)\.txt$/);
      if (projectMatch) {
        const detail = renderProjectDetail(projectMatch[1]);
        if (detail) return { lines: detail };
      }
      return { lines: [`cat: ${escapeHtml(file)}: No such file or directory`] };
    },
  },
  clear: {
    summary: "clear the terminal",
    run: () => ({ clear: true }),
  },
  history: {
    summary: "show command history",
    run: (_args, history) => ({
      lines: history.length
        ? history.map((h, i) => `  ${String(i + 1).padStart(3)}  ${escapeHtml(h)}`)
        : ["(empty)"],
    }),
  },
  date: {
    summary: "show the current date/time",
    run: () => ({ lines: [escapeHtml(new Date().toString())] }),
  },
  echo: {
    summary: "echo <text>",
    run: (args) => ({ lines: [escapeHtml(args.join(" "))] }),
  },
  neofetch: {
    summary: "show system info",
    run: () => ({
      lines: [
        `<span class="highlight">visitor</span>@<span class="highlight">${escapeHtml(slugify(NAME))}</span>`,
        "-----------------",
        `<span class="dim">OS:</span> JulianOS (portfolio edition)`,
        `<span class="dim">Host:</span> ${location.hostname || "localhost"}`,
        `<span class="dim">Shell:</span> hackfolio-sh`,
        `<span class="dim">Terminal:</span> julian-term`,
        `<span class="dim">Uptime:</span> ${Math.max(1, Math.round(performance.now() / 1000))}s`,
        `<span class="dim">Speed:</span> ${getSpeedMultiplier()}x${
          getSpeedMultiplier() > 1 ? " (ULTRA FAST MODE)" : getSpeedMultiplier() < 1 ? " (SLUGGISH)" : ""
        }`,
      ],
    }),
  },
  coffee: {
    summary: "brew some coffee",
    run: () => {
      coffeeCount++;
      const hitUltra = coffeeCount === 10;
      return {
        effect: async (api) => {
          api.print('<span class="highlight">firing up the espresso machine...</span>');
          await api.sleep(400);
          const brew = api.printArt(brewFrame(0));
          for (let pct = 10; pct <= 100; pct += 10) {
            await api.sleep(150);
            brew.textContent = brewFrame(pct);
          }
          await api.sleep(200);
          brew.remove();
          api.printArt(["    ( (", "     ) )", "  ........", "  |      |]", "  \\      /", "   `----'"].join("\n"));
          api.print("&nbsp;");
          api.print("here's your coffee.");

          if (hitUltra) {
            await api.sleep(400);
            setSpeedMultiplier(6);
            api.print("&nbsp;");
            api.print('<span class="highlight">that\'s 10 cups. caffeine overload.</span>');
            api.print('<span class="highlight">ENTERING ULTRA FAST MODE.</span>');
          }
        },
      };
    },
  },
  meow: {
    summary: "where did my cat go?",
    run: () => ({
      lines: [" /\\_/\\", "( o.o )  meow", " > ^ <"],
    }),
  },
  matrix: {
    summary: "toggle the matrix (try 'matrix <text>')",
    run: (args) => {
      const text = args.join(" ");
      const running = toggleMatrix(text);
      if (!running) return { lines: ["back to reality."] };
      return { lines: [text ? `entering the ${escapeHtml(text)} matrix...` : "wake up, neo..."] };
    },
  },
  hack: {
    summary: "do not run this",
    run: () => ({
      effect: async (api) => {
        api.print('<span class="highlight">initiating hack sequence...</span>');
        await api.sleep(600);
        const bomb = api.printArt(bombArt(5));
        for (let n = 4; n >= 1; n--) {
          await api.sleep(1000);
          bomb.textContent = bombArt(n);
        }
        await api.sleep(1000);
        bomb.remove();
        await runExplosion();
        api.print('<span class="highlight">BOOM.</span>');
        api.print("system integrity: fine — this was just a portfolio.");
      },
    }),
  },
  sl: {
    summary: "you meant 'ls', right?",
    hidden: true,
    run: () => ({
      effect: (api) => runScroller(api, TRAIN),
    }),
  },
  otter: {
    summary: "an otter runs by",
    hidden: true,
    run: (args) => {
      if (args[0]?.toLowerCase() === "matrix") {
        const running = toggleMatrix("🦦");
        return { lines: [running ? "otters in the matrix..." : "back to reality."] };
      }
      return { effect: (api) => runScroller(api, OTTER) };
    },
  },
  beaver: {
    summary: "a beaver runs by",
    hidden: true,
    run: (args) => {
      if (args[0]?.toLowerCase() === "matrix") {
        const running = toggleMatrix("🦫");
        return { lines: [running ? "beavers in the matrix..." : "back to reality."] };
      }
      return { effect: (api) => runScroller(api, BEAVER) };
    },
  },
  capybara: {
    summary: "a capybara strolls by",
    hidden: true,
    run: () => ({
      effect: (api) => runScroller(api, CAPYBARA),
    }),
  },
  snake: {
    summary: "a snake slithers by",
    hidden: true,
    run: () => ({
      effect: (api) => runScroller(api, SNAKE),
    }),
  },
  shark: {
    summary: "dun dun...",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        api.print("dun dun...");
        await api.sleep(700);
        api.print("dun dun...");
        await api.sleep(500);
        api.print("dun dun dun dun");
        await api.sleep(300);
        await runScroller(api, SHARK_FIN);
      },
    }),
  },
  owl: {
    summary: "an owl flies by",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        api.print("<span class=\"dim\">it's quiet tonight...</span>");
        await api.sleep(500);
        await runScroller(api, OWL);
      },
    }),
  },
  bsod: {
    summary: "everything crashes",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        await runBsod();
        api.print("...aaand we're back. that was fun.");
      },
    }),
  },
  oops: {
    summary: "oops",
    hidden: true,
    run: () => ({
      effect: () => runOops(),
    }),
  },
  dialup: {
    summary: "connecting to the internet",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        new Audio("/dialup.mp3").play().catch(() => {
          // autoplay blocked; not worth surfacing to the visitor.
        });
        const steps = ["dialing...", "connecting...", "handshaking...", "negotiating...", "connected at 56.6 kbps."];
        for (const step of steps) {
          api.print(step);
          await api.sleep(900);
        }
      },
    }),
  },
  virus: {
    summary: "uh oh",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        api.print('<span class="highlight">[!] VIRUS DETECTED [!]</span>');
        await api.sleep(500);
        api.print("scanning system files...");
        await api.sleep(700);
        api.print("infected files: 1,337");
        await api.sleep(700);
        api.print("&nbsp;");
        api.print("relax — it's just a joke. no viruses here, promise.");
      },
    }),
  },
  credits: {
    summary: "roll the credits",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        const lines = [
          "",
          "JULIAN SKINNER — PORTFOLIO",
          "",
          "built with:",
          "  Vite",
          "  TypeScript",
          "",
          "directed & developed by:",
          "  Julian Skinner",
          "",
          "thanks for visiting.",
        ];
        for (const line of lines) {
          api.print(line ? escapeHtml(line) : "&nbsp;");
          await api.sleep(350);
        }
      },
    }),
  },
  achievements: {
    summary: "track down all the secrets",
    hidden: true,
    run: () => {
      const trackable = Object.entries(COMMANDS).filter(
        ([name, spec]) => spec.hidden && !ACHIEVEMENT_EXEMPT.has(name)
      );
      const found = trackable.filter(([name]) => discoveredSecrets.has(name));
      return {
        lines: [
          `Secrets found: <span class="highlight">${found.length}</span> / ${trackable.length}`,
          "&nbsp;",
          ...trackable.map(([name]) =>
            discoveredSecrets.has(name)
              ? `  [x] <span class="highlight">${escapeHtml(name)}</span>`
              : "  [ ] ???"
          ),
        ],
      };
    },
  },
  rickroll: {
    summary: "you know what this is",
    hidden: true,
    run: () => ({
      lines: ["never gonna give you up", "never gonna let you down", "&nbsp;", "...you know the rest."],
    }),
  },
  fortune: {
    summary: "a fortune, programmer-style",
    hidden: true,
    run: () => ({ lines: [escapeHtml(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])] }),
  },
  flip: {
    summary: "heads or tails",
    hidden: true,
    run: () => ({ lines: [Math.random() < 0.5 ? "heads." : "tails."] }),
  },
  decaf: {
    summary: "switch to decaf",
    hidden: true,
    run: () => {
      const current = getSpeedMultiplier();
      let message: string;
      if (current > 1) {
        setSpeedMultiplier(1);
        message = "ahh, much better. back to normal speed.";
      } else if (current < 1) {
        setSpeedMultiplier(1);
        message = "ok, that's enough decaf. back to normal speed.";
      } else {
        setSpeedMultiplier(0.3);
        message = "that's a lot of decaf... everything feels sluggish now.";
      }
      return { lines: ["brewing a cup of decaf...", "&nbsp;", message] };
    },
  },
  slowcomputer: {
    summary: "everything is slow",
    hidden: true,
    run: () => {
      const activating = !document.body.classList.contains("win98");
      document.body.classList.toggle("win98", activating);
      if (activating) {
        setSpeedMultiplier(0.15);
        new Audio("/win98-boot.mp3").play().catch(() => {
          // autoplay blocked; not worth surfacing to the visitor.
        });
        return {
          lines: [
            "initializing legacy hardware emulation...",
            "&nbsp;",
            "Welcome to Windows 98.",
          ],
        };
      }
      setSpeedMultiplier(1);
      return { lines: ["exiting legacy mode. back to normal."] };
    },
  },
  sudo: {
    summary: "try it and see",
    hidden: true,
    run: () => ({ lines: ["nice try. you don't have root on this machine."] }),
  },
  exit: {
    summary: "close the terminal",
    hidden: true,
    run: () => ({ lines: ["this isn't a real shell — there's nowhere to go."] }),
  },
};

export function runCommand(input: string, history: string[]): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) return {};
  const [rawCmd, ...args] = trimmed.split(/\s+/);
  const cmd = rawCmd.toLowerCase();
  const spec = COMMANDS[cmd];
  if (!spec) {
    return {
      lines: [`command not found: ${escapeHtml(rawCmd)} <span class="dim">(type 'help' for a list of commands)</span>`],
    };
  }
  if (spec.hidden && !ACHIEVEMENT_EXEMPT.has(cmd)) {
    discoveredSecrets.add(cmd);
  }
  return spec.run(args, history);
}

export function commandNames(): string[] {
  return Object.keys(COMMANDS);
}
