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

All editable content (name, about text, projects, contact links) lives in
`src/content.ts` — edit that file and nothing else needs to change.

## Commands available in the terminal

`help`, `about` (`whoami`), `projects`, `contact`, `visitors`, `ls`,
`cat <file>`, `clear`, `history`, `date`, `echo <text>`, `neofetch`, `coffee`,
`matrix` (try `matrix <text>` to rain your own text), `meow`, `hack`, plus a
couple of hidden easter eggs (try `sudo`, `decaf` — run it again at normal
speed and it slows everything down instead — `resetvisitors`,
`slowcomputer` (plays a boot sound and swaps in the classic wallpaper), or
typo `ls` as `sl`).

`visitors` and the automatic visit count on page load use the free,
anonymous [abacus](https://github.com/JasonCameron/abacus) hit-counter API
(`src/visitors.ts`) — no account or backend of our own needed. It fails
silently if that service is ever unreachable.

To add a new command, add an entry to the `COMMANDS` map in `src/commands.ts`.

## Deploy

- **Vercel**: import the repo, no config needed (Vite is auto-detected).
- **Netlify**: import the repo — `netlify.toml` already sets the build command
  and publish directory.
