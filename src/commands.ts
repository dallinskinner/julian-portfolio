import { ABOUT_LINES, CONTACT_LINKS, NAME, PROJECTS, slugify } from "./content";
import { escapeHtml } from "./utils";
import { toggleMatrix } from "./matrix";
import { runExplosion } from "./explosion";
import { getSpeedMultiplier, setSpeedMultiplier } from "./speed";

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

function trainFrame(offset: number): string {
  return TRAIN.map((line) => {
    if (offset >= 0) return " ".repeat(offset) + line;
    const cut = -offset;
    return cut >= line.length ? "" : line.slice(cut);
  }).join("\n");
}

let coffeeCount = 0;

const FILES = ["about.txt", "contact.txt", "projects/"];

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
        `<span class="dim">Speed:</span> ${getSpeedMultiplier()}x${getSpeedMultiplier() > 1 ? " (ULTRA FAST MODE)" : ""}`,
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
    summary: "toggle the matrix",
    run: () => {
      const running = toggleMatrix();
      return { lines: [running ? "wake up, neo..." : "back to reality."] };
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
      effect: async (api) => {
        const width = Math.max(...TRAIN.map((l) => l.length));
        const start = 80;
        const end = -width;
        const art = api.printArt(trainFrame(start));
        for (let offset = start; offset > end; offset -= 3) {
          art.textContent = trainFrame(offset);
          await api.sleep(45);
        }
        art.remove();
      },
    }),
  },
  decaf: {
    summary: "switch to decaf",
    hidden: true,
    run: () => {
      const wasUltra = getSpeedMultiplier() > 1;
      setSpeedMultiplier(1);
      return {
        lines: [
          "brewing a cup of decaf...",
          "&nbsp;",
          wasUltra
            ? "ahh, much better. back to normal speed."
            : "already decaf. speed is normal.",
        ],
      };
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
  const [cmd, ...args] = trimmed.split(/\s+/);
  const spec = COMMANDS[cmd.toLowerCase()];
  if (!spec) {
    return {
      lines: [`command not found: ${escapeHtml(cmd)} <span class="dim">(type 'help' for a list of commands)</span>`],
    };
  }
  return spec.run(args, history);
}

export function commandNames(): string[] {
  return Object.keys(COMMANDS);
}
