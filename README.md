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

All editable content (name, about text, projects, contact links, blog posts,
the roadmap, the `now`/`quote`/`uses` command text) lives in `src/content.ts`
— edit that file and nothing else needs to change. A few of these are
placeholder text marked `// TODO`, ready for you to personalize.

Projects can also carry a longer `details` write-up and an optional
`screenshot` (a path under `public/`), shown by `cat <project>.txt`.

## Commands available in the terminal

`help`, `man <command>`, `about` (`whoami`), `now`, `projects`, `blog [slug]`,
`contact`, `uses`, `visitors`, `ls`, `cat <file>`, `clear`, `history`, `date`,
`countdown <date>`, `age <year>`, `echo <text>`, `calc <expression>`,
`binary <n>`, `hex <n>`, `password [length]`, `lorem [words]`, `neofetch`,
`stats`, `worldclock`, `coffee`, `meow`, `joke`, `compliment`, `motivate`,
`riddle`, `lucky`, `trivia`, `catfact`, `rate <thing>`, `quote`, `banner`,
`theme <green|amber|blue>`, `matrix` (try `matrix <text>` to rain your own
text), `hack`, `achievements`, `roadmap` (what's shipped and what's next —
includes a deliberately blurred teaser image for what's coming; swap
`public/teaser-coming-soon.png` for a new one whenever you want to tease
something else).

There are also ~40 hidden easter-egg commands not listed in `help` — try
`help-hidden` in the terminal to see them all, or `achievements` to track
how many you've found. A few highlights: `slowcomputer` (full Windows 98
theme + boot sound), `bsod`, `crash`, `oops` (plays a short video clip),
`dialup`, `ping`, a pile of ASCII animals that scroll by (`sl`, `otter`,
`beaver`, `capybara`, `snake`, `shark`, `owl`, `fox`, `penguin`, `turtle`,
`spider` — try `otter matrix` and `sl -a`/`shark -a` too), real mini-games
(`guess`, `rps`, `8ball`, `timer`), text toys (`cowsay`, `ascii`, `leet`,
`reverse`, `hacktext`), and `decaf` (run it again at normal speed to slow
everything down instead).

`visitors` and the automatic visit count on page load use the free,
anonymous [abacus](https://github.com/JasonCameron/abacus) hit-counter API
(`src/visitors.ts`) — no account or backend of our own needed. It fails
silently if that service is ever unreachable.

To add a new command, add an entry to the `COMMANDS` map in `src/commands.ts`.

## Deploy

- **Vercel**: import the repo, no config needed (Vite is auto-detected).
- **Netlify**: import the repo — `netlify.toml` already sets the build command
  and publish directory.
