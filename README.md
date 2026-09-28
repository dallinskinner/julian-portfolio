# julian skinner — terminal portfolio

A single-page portfolio styled as an interactive terminal. No backend — everything
is a static site built with Vite + TypeScript.

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # outputs to dist/
npm run preview # preview the production build locally
```

## Edit content

All editable content (name, about text, projects, contact links, the `now`/
`quote`/`uses` command text) lives in `src/content.ts` — edit that file and
nothing else needs to change. A few of these are placeholder text marked
`// TODO`, ready for you to personalize.

## Commands available in the terminal

`help`, `man <command>`, `about` (`whoami`), `now`, `projects`, `contact`,
`uses`, `visitors`, `ls`, `cat <file>`, `clear`, `history`, `date`,
`echo <text>`, `calc <expression>`, `neofetch`, `coffee`, `meow`, `joke`,
`quote`, `banner`, `theme <green|amber|blue>`,
`matrix` (try `matrix <text>` to rain your own text), `hack`.

There are also ~20 hidden easter-egg commands not listed in `help` — try
`help-hidden` in the terminal to see them all, or `achievements` to track
how many you've found. A few highlights: `slowcomputer` (full Windows 98
theme + boot sound), `bsod`, `oops` (plays a short video clip), `dialup`,
`sl`/`otter`/`beaver`/`capybara`/`snake`/`shark`/`owl` (ASCII animals scroll
by — try `otter matrix` too), and `decaf` (run it again at normal speed to
slow everything down instead).

`visitors` and the automatic visit count on page load use the free,
anonymous [abacus](https://github.com/JasonCameron/abacus) hit-counter API
(`src/visitors.ts`) — no account or backend of our own needed. It fails
silently if that service is ever unreachable.

To add a new command, add an entry to the `COMMANDS` map in `src/commands.ts`.

## Deploy

- **Vercel**: import the repo, no config needed (Vite is auto-detected).
- **Netlify**: import the repo — `netlify.toml` already sets the build command
  and publish directory.
