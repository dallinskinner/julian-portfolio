import { ABOUT_LINES, CONTACT_LINKS, NAME, NOW_LINES, PROJECTS, QUOTE, USES_LINES, slugify } from "./content";
import { escapeHtml, evaluateExpression } from "./utils";
import { toggleMatrix } from "./matrix";
import { runExplosion } from "./explosion";
import { getSpeedMultiplier, setSpeedMultiplier } from "./speed";
import { getVisitCount, resetLocalVisitFlag } from "./visitors";
import { runBsod } from "./bsod";
import { runOops } from "./oops";
import { banner } from "./banner";
import { availableThemes, isThemeName, setTheme } from "./theme";
import { renderAsciiText } from "./asciiFont";

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
  /** Longer explanation shown by 'man <command>'. Falls back to summary if omitted. */
  manual?: string[];
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

// sl -a: the classic "someone got dragged along" gag — two screaming
// stick figures trailing behind the train.
const TRAIN_ACCIDENT_TAIL = ["  \\o/ \\o/", "   |   |", "  / \\ / \\", "", "  ~   ~  "];
const TRAIN_ACCIDENT = TRAIN.map((line, i) => line + TRAIN_ACCIDENT_TAIL[i]);

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

// shark -a: a swimmer fleeing just ahead of the fin.
const SWIMMER_HEAD = ["  o", " /|\\", " / \\", "", ""];
const SHARK_CHASE = SWIMMER_HEAD.map((line, i) => line.padEnd(10) + SHARK_FIN[i]);

const OWL = [
  "   ,^..^,",
  "  ( O  O )",
  "   )  ~  (",
  "  (___||___)",
  "    ^    ^",
];

const FOX = ["   /\\_/\\", "  ( >w< )~", "   > ^ <  ~~~"];

const PENGUIN = ["   ,+++,", "  (o.o  )", "  (\")_(\")"];

const TURTLE = [
  "   __",
  "  /  \\____",
  " ( o  o    )--",
  "  \\________/",
  "   ^^  ^^",
];

const SPIDER = [" /\\oo/\\", "<  ||  >", " \\/  \\/"];

function scrollFrame(art: string[], offset: number): string {
  return art
    .map((line) => {
      if (offset >= 0) return " ".repeat(offset) + line;
      const cut = -offset;
      return cut >= line.length ? "" : line.slice(cut);
    })
    .join("\n");
}

async function runScroller(api: EffectAPI, art: string[], step = 3, delay = 45): Promise<void> {
  const width = Math.max(...art.map((l) => l.length));
  const start = 80;
  const end = -width;
  const el = api.printArt(scrollFrame(art, start));
  for (let offset = start; offset > end; offset -= step) {
    el.textContent = scrollFrame(art, offset);
    await api.sleep(delay);
  }
  el.remove();
}

/** Grows a thread of '|' lines from the top, then holds briefly. */
async function dropIn(api: EffectAPI, lines: number): Promise<void> {
  const el = api.printArt("|");
  for (let i = 1; i <= lines; i++) {
    await api.sleep(120);
    el.textContent = new Array(i).fill("|").join("\n");
  }
  await api.sleep(300);
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

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "I told my computer I needed a break, and it said no problem — it froze immediately.",
  "How many programmers does it take to change a light bulb? None — that's a hardware problem.",
  "Why do Java developers wear glasses? Because they can't C#.",
  "A byte walks into a bar looking sad. The bartender asks what's wrong. It says, \"parity error.\"",
  "I would tell you a UDP joke, but you might not get it.",
  "Why did the developer go broke? Because they used up all their cache.",
  "There's no place like 127.0.0.1.",
];

const COMPLIMENTS = [
  "You write clean commit messages. That's rarer than it should be.",
  "You're the kind of person who actually reads the docs.",
  "Your curiosity is contagious — thanks for poking around in here.",
  "You have great taste in portfolio websites.",
  "You'd definitely survive a code review from me.",
  "You ask good questions.",
  "You're clearly someone who finishes what they start.",
  "You make debugging look easy.",
  "Your rubber duck is lucky to have you.",
  "You're doing better than you think you are.",
];

const MOTIVATIONS = [
  "The bug you're stuck on right now will make sense in about ten minutes.",
  "Ship it. You can refactor later.",
  "Every expert was once a beginner who didn't give up.",
  "Small progress is still progress.",
  "You don't have to be great to start, but you have to start to be great.",
  "The code you wrote a year ago was bad. That means you're improving.",
  "Take a break. The problem will still be there, but your brain will work better.",
  "Done is better than perfect.",
  "You've solved harder problems than this before.",
  "Nobody who ships software has it all figured out. Keep going.",
];

const RIDDLES: { q: string; a: string }[] = [
  { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps." },
  { q: "I speak without a mouth and hear without ears. What am I?", a: "An echo." },
  { q: "What has keys but no locks, space but no room, and you can enter but not go in?", a: "A keyboard." },
  { q: "What gets wetter as it dries?", a: "A towel." },
  { q: "I'm tall when I'm young and short when I'm old. What am I?", a: "A candle." },
  { q: "What has to be broken before you can use it?", a: "An egg." },
];

const TRIVIA_FACTS = [
  "The first computer bug was an actual moth found in a Harvard Mark II relay in 1947.",
  "The QWERTY keyboard layout was designed to slow typists down, not speed them up.",
  "The first website ever published is still online: info.cern.ch.",
  "A single Google search uses about as much energy as running a 60W lightbulb for a few seconds.",
  "The term 'debugging' predates computers — it was used in engineering long before software existed.",
  "The first domain name ever registered was symbolics.com, in 1985.",
  "More lines of code have been written for JavaScript-based web pages than almost any other purpose in modern computing.",
  "The average smartphone today has vastly more computing power than the computers used for the Apollo moon landings.",
  "The @ symbol was chosen for email addresses in 1971 simply because it was an unused key on the keyboard.",
  "Most of the world's undersea internet cables are about as thick as a garden hose.",
];

const CAT_FACTS = [
  "Cats spend around 70% of their lives asleep.",
  "A group of cats is called a clowder.",
  "Cats can't taste sweetness — they lack the taste receptor for it.",
  "A cat's whiskers are roughly as wide as its body, helping it judge gaps.",
  "Cats have a third eyelid called a haw.",
  "A cat's purr typically occurs at a frequency that can promote healing.",
  "Most cats have no eyelashes.",
  "Cats can rotate their ears roughly 180 degrees.",
];

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do",
  "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim",
  "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "aliquip",
  "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
];

const RATE_COMMENTS = [
  "not bad at all.",
  "surprisingly solid.",
  "could use some work.",
  "chef's kiss.",
  "honestly kind of iconic.",
  "eh, it's fine.",
  "underrated, in my opinion.",
  "10/10 would rate again.",
];

const EIGHT_BALL_ANSWERS = [
  "It is certain.",
  "Without a doubt.",
  "You may rely on it.",
  "Yes, definitely.",
  "It is decidedly so.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
];

const LEET_MAP: Record<string, string> = { a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", b: "8", g: "9", l: "1" };

const COW = [
  "        \\   ^__^",
  "         \\  (oo)\\_______",
  "            (__)\\       )\\/\\",
  "                ||----w |",
  "                ||     ||",
];

function cowsayBubble(text: string): string[] {
  const top = " " + "_".repeat(text.length + 2);
  const bottom = " " + "-".repeat(text.length + 2);
  return [top, `< ${text} >`, bottom];
}

const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#$%&";
function randomScrambleChar(): string {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

let secretNumber: number | null = null;
let guessAttempts = 0;

// Commands excluded from the 'achievements' checklist — meta/utility, not
// really "secrets" to hunt for.
const ACHIEVEMENT_EXEMPT = new Set(["help-hidden", "achievements"]);
const discoveredSecrets = new Set<string>();

function getAchievementProgress(): { found: number; total: number } {
  const trackable = Object.entries(COMMANDS).filter(([name, spec]) => spec.hidden && !ACHIEVEMENT_EXEMPT.has(name));
  const found = trackable.filter(([name]) => discoveredSecrets.has(name));
  return { found: found.length, total: trackable.length };
}

export const COMMANDS: Record<string, CommandSpec> = {
  help: {
    summary: "list available commands",
    manual: ["Lists every public command with a one-line summary.", "For more detail on a specific command, try 'man <command>'."],
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
  man: {
    summary: "man <command> — read more about a command",
    manual: ["Shows a longer explanation of a command than 'help' does.", "Example: man matrix"],
    run: (args) => {
      const name = args[0]?.toLowerCase();
      if (!name) return { lines: ["usage: man &lt;command&gt;"] };
      const spec = COMMANDS[name];
      if (!spec) return { lines: [`No manual entry for ${escapeHtml(name)}.`] };
      return { lines: (spec.manual ?? [spec.summary]).map((line) => escapeHtml(line)) };
    },
  },
  about: {
    summary: "about me",
    manual: ["A short bio.", "See also: 'now' for what I'm currently up to, and 'uses' for my setup."],
    run: () => ({ lines: renderAbout() }),
  },
  now: {
    summary: "what I'm up to right now",
    manual: ["A quick note on what I'm currently focused on — updated occasionally."],
    run: () => ({ lines: NOW_LINES.map((line) => (line ? escapeHtml(line) : "&nbsp;")) }),
  },
  whoami: {
    summary: "alias for 'about'",
    hidden: true,
    run: () => ({ lines: renderAbout() }),
  },
  projects: {
    summary: "list my projects",
    manual: ["Lists my projects with a short description, tech used, and a link.", "Try 'cat <name>.txt' for one project's detail, or 'ls projects' to list just the names."],
    run: () => ({ lines: renderProjects() }),
  },
  contact: {
    summary: "how to reach me",
    manual: ["Ways to get in touch."],
    run: () => ({ lines: renderContact() }),
  },
  uses: {
    summary: "what I use day to day",
    manual: ["The tools, editor, and setup I use — the classic personal-site '/uses' page, but a command."],
    run: () => ({ lines: USES_LINES.map((line) => escapeHtml(line)) }),
  },
  visitors: {
    summary: "how many people have visited this site",
    manual: ["Shows the total visit count, tracked with a free anonymous counter service — no account or backend of my own needed."],
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
    manual: ["Lists the 'files' on this pretend filesystem.", "Try 'ls projects' to list project files specifically."],
    run: (args) => {
      if (args[0] === "projects") {
        return { lines: PROJECTS.map((p) => `${slugify(p.name)}.txt`) };
      }
      return { lines: [FILES.join("  ")] };
    },
  },
  cat: {
    summary: "cat <file> — print a file's contents",
    manual: ["Prints a 'file' from the pretend filesystem shown by 'ls'.", "Example: cat about.txt"],
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
    manual: ["Clears everything printed so far. Doesn't affect command history."],
    run: () => ({ clear: true }),
  },
  history: {
    summary: "show command history",
    manual: ["Lists every command you've run this session, in order."],
    run: (_args, history) => ({
      lines: history.length
        ? history.map((h, i) => `  ${String(i + 1).padStart(3)}  ${escapeHtml(h)}`)
        : ["(empty)"],
    }),
  },
  date: {
    summary: "show the current date/time",
    manual: ["Shows your browser's current local date and time."],
    run: () => ({ lines: [escapeHtml(new Date().toString())] }),
  },
  countdown: {
    summary: "countdown <date> — days until (or since) a date",
    manual: ["Reports how many days remain until a given date, or how long ago it was.", "Example: countdown 2026-12-25"],
    run: (args) => {
      const input = args.join(" ");
      const target = new Date(input);
      if (!input || Number.isNaN(target.getTime())) return { lines: ["usage: countdown &lt;date&gt;"] };
      const days = Math.round((target.getTime() - Date.now()) / 86_400_000);
      if (days === 0) return { lines: ["that's today!"] };
      return { lines: [days > 0 ? `${days} day${days === 1 ? "" : "s"} to go.` : `that was ${-days} day${-days === 1 ? "" : "s"} ago.`] };
    },
  },
  age: {
    summary: "age <year> — how many years since a year",
    manual: ["Reports how many years have passed since a given year.", "Example: age 2000"],
    run: (args) => {
      const year = parseInt(args[0], 10);
      const currentYear = new Date().getFullYear();
      if (!args[0] || !Number.isInteger(year) || year > currentYear) return { lines: ["usage: age &lt;year&gt;"] };
      const years = currentYear - year;
      return { lines: [years === 0 ? "that's this year." : `${years} year${years === 1 ? "" : "s"}.`] };
    },
  },
  echo: {
    summary: "echo <text>",
    manual: ["Prints back whatever text you give it."],
    run: (args) => ({ lines: [escapeHtml(args.join(" "))] }),
  },
  calc: {
    summary: "calc <expression> — basic arithmetic",
    manual: [
      "Evaluates a math expression: + - * / ^ and parentheses.",
      "Example: calc (2 + 3) * 4",
      "Doesn't use eval() — a small parser built just for this, on purpose.",
    ],
    run: (args) => {
      const expr = args.join(" ");
      if (!expr) return { lines: ["usage: calc &lt;expression&gt;"] };
      try {
        const result = evaluateExpression(expr);
        return { lines: [escapeHtml(`${expr} = ${result}`)] };
      } catch (err) {
        return { lines: [`calc: ${escapeHtml(err instanceof Error ? err.message : "invalid expression")}`] };
      }
    },
  },
  binary: {
    summary: "binary <n> — decimal to binary",
    manual: ["Converts a decimal number to binary.", "Example: binary 42"],
    run: (args) => {
      const n = Number(args[0]);
      if (args[0] === undefined || !Number.isInteger(n)) return { lines: ["usage: binary &lt;n&gt;"] };
      return { lines: [escapeHtml(`${n} = ${n < 0 ? "-" : ""}0b${Math.abs(n).toString(2)}`)] };
    },
  },
  hex: {
    summary: "hex <n> — decimal to hexadecimal",
    manual: ["Converts a decimal number to hexadecimal.", "Example: hex 255"],
    run: (args) => {
      const n = Number(args[0]);
      if (args[0] === undefined || !Number.isInteger(n)) return { lines: ["usage: hex &lt;n&gt;"] };
      return { lines: [escapeHtml(`${n} = ${n < 0 ? "-" : ""}0x${Math.abs(n).toString(16)}`)] };
    },
  },
  password: {
    summary: "password [length] — generate a random password",
    manual: ["Generates a random password from letters, digits, and symbols.", "Default length 12; clamped between 4 and 64."],
    run: (args) => {
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*-_=+";
      const requested = parseInt(args[0], 10);
      const length = Math.min(64, Math.max(4, Number.isFinite(requested) ? requested : 12));
      let out = "";
      for (let i = 0; i < length; i++) out += charset[Math.floor(Math.random() * charset.length)];
      return { lines: [escapeHtml(out)] };
    },
  },
  lorem: {
    summary: "lorem [words] — placeholder text",
    manual: ["Generates lorem ipsum placeholder text.", "Default 20 words; clamped up to 200."],
    run: (args) => {
      const requested = parseInt(args[0], 10);
      const count = Math.min(200, Math.max(1, Number.isFinite(requested) ? requested : 20));
      const words: string[] = [];
      for (let i = 0; i < count; i++) words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
      const text = words.join(" ");
      return { lines: [escapeHtml(text.charAt(0).toUpperCase() + text.slice(1) + ".")] };
    },
  },
  neofetch: {
    summary: "show system info",
    manual: ["A fake system-info readout, styled after the real neofetch tool.", "Shows the current speed multiplier — see 'coffee' and its hidden friends."],
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
  stats: {
    summary: "a little site dashboard",
    manual: ["Combines the visitor count, your achievements progress, and this session's uptime."],
    run: () => ({
      effect: async (api) => {
        api.print("gathering stats...");
        const count = await getVisitCount();
        const { found, total } = getAchievementProgress();
        api.print(
          `<span class="dim">Visits:</span> ${count === null ? "unavailable" : `<span class="highlight">${count}</span>`}`
        );
        api.print(`<span class="dim">Secrets found:</span> <span class="highlight">${found}</span> / ${total}`);
        api.print(`<span class="dim">Session uptime:</span> ${Math.max(1, Math.round(performance.now() / 1000))}s`);
      },
    }),
  },
  worldclock: {
    summary: "the time around the world",
    manual: ["Shows the current time in a few different timezones."],
    run: () => {
      const zones: [string, string][] = [
        ["New York", "America/New_York"],
        ["London", "Europe/London"],
        ["Tokyo", "Asia/Tokyo"],
        ["Sydney", "Australia/Sydney"],
      ];
      return {
        lines: zones.map(([label, tz]) => {
          const time = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(new Date());
          return `<span class="dim">${escapeHtml(label)}:</span> ${escapeHtml(time)}`;
        }),
      };
    },
  },
  coffee: {
    summary: "brew some coffee",
    manual: ["Brews a virtual cup of coffee, with a little progress bar.", "Do it 10 times in one session and see what happens."],
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
    manual: ["Just a cat. Says meow."],
    run: () => ({
      lines: [" /\\_/\\", "( o.o )  meow", " > ^ <"],
    }),
  },
  joke: {
    summary: "tell me a joke",
    manual: ["A random, clean programmer joke."],
    run: () => ({ lines: [escapeHtml(JOKES[Math.floor(Math.random() * JOKES.length)])] }),
  },
  compliment: {
    summary: "get a compliment",
    manual: ["A random nice compliment, because why not."],
    run: () => ({ lines: [escapeHtml(COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)])] }),
  },
  motivate: {
    summary: "a little encouragement",
    manual: ["A random bit of encouragement for whatever you're working on."],
    run: () => ({ lines: [escapeHtml(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)])] }),
  },
  riddle: {
    summary: "a short riddle",
    manual: ["Asks a riddle and reveals the answer after a short pause."],
    run: () => {
      const { q, a } = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      return {
        effect: async (api) => {
          api.print(escapeHtml(q));
          await api.sleep(2500);
          api.print(`<span class="dim">answer:</span> ${escapeHtml(a)}`);
        },
      };
    },
  },
  lucky: {
    summary: "your lucky number today",
    manual: ["A 'lucky number of the day' — stable all day, changes tomorrow."],
    run: () => {
      const today = new Date().toISOString().slice(0, 10);
      let seed = 0;
      for (const ch of today) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      const number = (seed % 100) + 1;
      return { lines: [`Today's lucky number is <span class="highlight">${number}</span>.`] };
    },
  },
  trivia: {
    summary: "a random fun fact",
    manual: ["A random piece of trivia, mostly about computing history."],
    run: () => ({ lines: [escapeHtml(TRIVIA_FACTS[Math.floor(Math.random() * TRIVIA_FACTS.length)])] }),
  },
  catfact: {
    summary: "a random cat fact",
    manual: ["Exactly what it says."],
    run: () => ({ lines: [escapeHtml(CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)])] }),
  },
  rate: {
    summary: "rate <thing> — rate anything out of 10",
    manual: ["Gives whatever you type a completely unscientific rating out of 10."],
    run: (args) => {
      const thing = args.join(" ");
      if (!thing) return { lines: ["usage: rate &lt;thing&gt;"] };
      const score = Math.floor(Math.random() * 11);
      const comment = RATE_COMMENTS[Math.floor(Math.random() * RATE_COMMENTS.length)];
      return { lines: [`${escapeHtml(thing)}: <span class="highlight">${score}/10</span> — ${escapeHtml(comment)}`] };
    },
  },
  quote: {
    summary: "a favorite quote",
    manual: ["A quote I like."],
    run: () => ({ lines: [escapeHtml(QUOTE)] }),
  },
  banner: {
    summary: "reprint the name banner",
    manual: ["Reprints the ASCII banner shown when the terminal boots."],
    run: () => ({ lines: [`<pre class="banner">${escapeHtml(banner())}</pre>`] }),
  },
  theme: {
    summary: "theme <green|amber|blue> — switch color scheme",
    manual: [
      "Switches the terminal's phosphor color.",
      `Available: ${availableThemes().join(", ")}`,
      "Your choice is remembered for next time (stored only in your browser).",
    ],
    run: (args) => {
      const name = args[0]?.toLowerCase();
      if (!name) return { lines: [`usage: theme &lt;${availableThemes().join("|")}&gt;`] };
      if (!isThemeName(name)) {
        return { lines: [`unknown theme: ${escapeHtml(name)} <span class="dim">(try ${availableThemes().join(", ")})</span>`] };
      }
      setTheme(name);
      return { lines: [`theme set to ${name}.`] };
    },
  },
  matrix: {
    summary: "toggle the matrix (try 'matrix <text>')",
    manual: ["Toggles the falling-code background effect.", "Give it text to rain your own characters instead: matrix <text>"],
    run: (args) => {
      const text = args.join(" ");
      const running = toggleMatrix(text);
      if (!running) return { lines: ["back to reality."] };
      return { lines: [text ? `entering the ${escapeHtml(text)} matrix...` : "wake up, neo..."] };
    },
  },
  hack: {
    summary: "do not run this",
    manual: ["Exactly what it sounds like. Purely for fun — nothing on this site is actually at risk."],
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
    summary: "you meant 'ls', right? (try 'sl -a')",
    hidden: true,
    run: (args) => {
      if (args[0] === "-a") {
        return {
          effect: async (api) => {
            api.print("uh oh, someone's holding on...");
            await api.sleep(500);
            await runScroller(api, TRAIN_ACCIDENT);
          },
        };
      }
      return { effect: (api) => runScroller(api, TRAIN) };
    },
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
    summary: "dun dun... (try 'shark -a')",
    hidden: true,
    run: (args) => ({
      effect: async (api) => {
        api.print("dun dun...");
        await api.sleep(700);
        api.print("dun dun...");
        await api.sleep(500);
        api.print("dun dun dun dun");
        await api.sleep(300);
        if (args[0] === "-a") {
          api.print('<span class="highlight">SWIM!</span>');
          await runScroller(api, SHARK_CHASE);
        } else {
          await runScroller(api, SHARK_FIN);
        }
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
  fox: {
    summary: "a fox dashes by",
    hidden: true,
    run: () => ({
      effect: (api) => runScroller(api, FOX, 6, 30),
    }),
  },
  penguin: {
    summary: "a penguin waddles by",
    hidden: true,
    run: () => ({
      effect: (api) => runScroller(api, PENGUIN),
    }),
  },
  turtle: {
    summary: "a turtle crosses by",
    hidden: true,
    run: () => ({
      effect: (api) => runScroller(api, TURTLE, 2, 60),
    }),
  },
  spider: {
    summary: "a spider creeps by",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        await dropIn(api, 4);
        await runScroller(api, SPIDER);
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
  crash: {
    summary: "everything crashes (linux edition)",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        const lines = [
          "[   12.345678] Kernel panic - not syncing: Fatal exception",
          "[   12.345680] CPU: 0 PID: 1337 Comm: julian-term Not tainted",
          "[   12.345682] Call Trace:",
          "[   12.345684]  panic+0x1p1/0x2p0",
          "[   12.345686]  do_exit+0x0/0x0",
          "[   12.345688] ---[ end Kernel panic - not syncing: Fatal exception ]---",
        ];
        for (const line of lines) {
          api.print(escapeHtml(line), "dim");
          await api.sleep(250);
        }
        api.print("&nbsp;");
        api.print("just kidding, everything's fine.");
      },
    }),
  },
  format: {
    summary: "format C:",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        api.print('<span class="highlight">WARNING: this will erase all data on C:\\</span>');
        await api.sleep(600);
        api.print("Proceed? (y/n)");
        await api.sleep(800);
        api.print("...");
        await api.sleep(500);
        api.print("just kidding. your data (and this portfolio) is safe.");
      },
    }),
  },
  ping: {
    summary: "ping [host]",
    hidden: true,
    run: (args) => ({
      effect: async (api) => {
        const host = args[0] || "julianskinner.vercel.app";
        api.print(`PING ${escapeHtml(host)} (203.0.113.1): 56 data bytes`);
        for (let seq = 0; seq < 4; seq++) {
          await api.sleep(350);
          const time = (8 + Math.random() * 20).toFixed(1);
          api.print(`64 bytes from 203.0.113.1: icmp_seq=${seq} ttl=57 time=${time} ms`);
        }
        await api.sleep(300);
        api.print("&nbsp;");
        api.print(`--- ${escapeHtml(host)} ping statistics ---`);
        api.print("4 packets transmitted, 4 packets received, 0% packet loss");
      },
    }),
  },
  ddos: {
    summary: "attack this website",
    hidden: true,
    run: () => ({
      effect: async (api) => {
        api.print("initiating DDoS attack...");
        await api.sleep(600);
        api.print("target: a static site on Vercel's global CDN.");
        await api.sleep(700);
        api.print("yeah, that's not gonna work.");
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
    manual: [
      "Shows how many hidden easter-egg commands you've found this session.",
      "There are dozens hiding in this terminal — try things a real shell would have,",
      "typo common commands, or just poke around. Found names show up here; the rest",
      "stay as '???' until you find them.",
    ],
    run: () => {
      const trackable = Object.entries(COMMANDS).filter(([name, spec]) => spec.hidden && !ACHIEVEMENT_EXEMPT.has(name));
      const { found, total } = getAchievementProgress();
      return {
        lines: [
          `Secrets found: <span class="highlight">${found}</span> / ${total}`,
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
  "8ball": {
    summary: "8ball <question> — ask the magic 8-ball",
    hidden: true,
    run: (args) => {
      if (!args.length) return { lines: ["usage: 8ball &lt;question&gt;"] };
      return { lines: [escapeHtml(EIGHT_BALL_ANSWERS[Math.floor(Math.random() * EIGHT_BALL_ANSWERS.length)])] };
    },
  },
  guess: {
    summary: "guess [number] — guess my number",
    hidden: true,
    run: (args) => {
      if (secretNumber === null) {
        secretNumber = 1 + Math.floor(Math.random() * 100);
        guessAttempts = 0;
      }
      if (!args[0]) {
        return {
          lines: [
            `I'm thinking of a number between 1 and 100. (attempt ${guessAttempts + 1})`,
            "Guess with: guess &lt;number&gt;",
          ],
        };
      }
      const n = Number(args[0]);
      if (!Number.isInteger(n)) return { lines: ["usage: guess &lt;number&gt;"] };
      guessAttempts++;
      if (n === secretNumber) {
        const attempts = guessAttempts;
        secretNumber = null;
        guessAttempts = 0;
        return { lines: [`correct! it was ${n}. you got it in ${attempts} guess${attempts === 1 ? "" : "es"}.`] };
      }
      return { lines: [n < secretNumber ? "higher!" : "lower!"] };
    },
  },
  rps: {
    summary: "rps <rock|paper|scissors>",
    hidden: true,
    run: (args) => {
      const options = ["rock", "paper", "scissors"];
      const choice = args[0]?.toLowerCase();
      if (!choice || !options.includes(choice)) return { lines: ["usage: rps &lt;rock|paper|scissors&gt;"] };
      const computer = options[Math.floor(Math.random() * options.length)];
      let result: string;
      if (choice === computer) {
        result = "tie!";
      } else if (
        (choice === "rock" && computer === "scissors") ||
        (choice === "paper" && computer === "rock") ||
        (choice === "scissors" && computer === "paper")
      ) {
        result = "you win!";
      } else {
        result = "you lose!";
      }
      return { lines: [`you: ${choice}  |  me: ${computer}`, result] };
    },
  },
  timer: {
    summary: "timer <seconds> — countdown",
    hidden: true,
    run: (args) => {
      const secs = Math.min(60, Math.max(1, parseInt(args[0], 10) || 10));
      return {
        effect: async (api) => {
          const el = api.printArt(String(secs));
          for (let s = secs - 1; s >= 0; s--) {
            await api.sleep(1000);
            el.textContent = String(s);
          }
          api.print("time's up!");
        },
      };
    },
  },
  reverse: {
    summary: "reverse <text>",
    hidden: true,
    run: (args) => {
      const text = args.join(" ");
      if (!text) return { lines: ["usage: reverse &lt;text&gt;"] };
      return { lines: [escapeHtml(Array.from(text).reverse().join(""))] };
    },
  },
  leet: {
    summary: "leet <text>",
    hidden: true,
    run: (args) => {
      const text = args.join(" ");
      if (!text) return { lines: ["usage: leet &lt;text&gt;"] };
      const out = Array.from(text.toLowerCase())
        .map((c) => LEET_MAP[c] ?? c)
        .join("");
      return { lines: [escapeHtml(out)] };
    },
  },
  cowsay: {
    summary: "cowsay <text>",
    hidden: true,
    run: (args) => {
      const text = args.join(" ") || "moo";
      return { lines: [...cowsayBubble(text), ...COW].map((line) => escapeHtml(line)) };
    },
  },
  ascii: {
    summary: "ascii <text> — big blocky text",
    hidden: true,
    run: (args) => {
      const text = args.join(" ");
      if (!text) return { lines: ["usage: ascii &lt;text&gt; (letters, numbers, spaces only)"] };
      return { lines: [`<pre class="art">${escapeHtml(renderAsciiText(text))}</pre>`] };
    },
  },
  hacktext: {
    summary: "hacktext <text> — decode animation",
    hidden: true,
    run: (args) => {
      const text = args.join(" ");
      if (!text) return { lines: ["usage: hacktext &lt;text&gt;"] };
      return {
        effect: async (api) => {
          const chars = Array.from(text);
          const revealed = new Array(chars.length).fill(false);
          const el = api.printArt(chars.map(() => randomScrambleChar()).join(""));
          const order = chars.map((_, i) => i);
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
          for (const idx of order) {
            for (let frame = 0; frame < 3; frame++) {
              el.textContent = chars.map((c, i) => (revealed[i] ? c : randomScrambleChar())).join("");
              await api.sleep(25);
            }
            revealed[idx] = true;
          }
          el.textContent = text;
        },
      };
    },
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
