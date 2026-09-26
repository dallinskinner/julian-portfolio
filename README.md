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

`help`, `about` (`whoami`), `projects`, `contact`, `ls`, `cat <file>`, `clear`,
`history`, `date`, `echo <text>`, `neofetch`, `coffee`, `matrix`, `hack`, plus
a couple of hidden easter eggs (try `sudo`, or typo `ls` as `sl`).

To add a new command, add an entry to the `COMMANDS` map in `src/commands.ts`.

## Deploy

- **Vercel**: import the repo, no config needed (Vite is auto-detected).
- **Netlify**: import the repo — `netlify.toml` already sets the build command
  and publish directory.
