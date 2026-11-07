import { PLAYLIST } from "./content";

const audio = new Audio();
audio.preload = "none";
let index = 0;
let failed = false;
const listeners = new Set<() => void>();

try {
  const saved = localStorage.getItem("radio-station");
  const i = PLAYLIST.findIndex((t) => t.id === saved);
  if (i >= 0) index = i;
  const vol = parseFloat(localStorage.getItem("radio-volume") ?? "");
  audio.volume = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : 0.7;
} catch {
  audio.volume = 0.7;
}

const notify = () => listeners.forEach((fn) => fn());
audio.addEventListener("play", notify);
audio.addEventListener("pause", notify);
audio.addEventListener("ended", () => next());
audio.addEventListener("error", () => {
  failed = true;
  notify();
});

export function isPlaying(): boolean {
  return !audio.paused;
}
export function onChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function load(i: number): void {
  index = (i + PLAYLIST.length) % PLAYLIST.length;
  failed = false;
  audio.src = PLAYLIST[index].src;
  try {
    localStorage.setItem("radio-station", PLAYLIST[index].id);
  } catch {
    // not persisted
  }
  const t = PLAYLIST[index];
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: "Hackfolio Radio" });
  }
  notify();
}

export function play(i = index): void {
  if (!audio.src || i !== index) load(i);
  audio.play().catch(() => {
    failed = true;
    notify();
  });
}
export function toggle(): void {
  if (audio.paused) play();
  else audio.pause();
}
export function next(): void {
  play(index + 1);
}
export function prev(): void {
  play(index - 1);
}
export function stop(): void {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  notify();
}

if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => play());
  navigator.mediaSession.setActionHandler("pause", () => audio.pause());
  navigator.mediaSession.setActionHandler("nexttrack", () => next());
  navigator.mediaSession.setActionHandler("previoustrack", () => prev());
}

const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

/** Builds the Radio app UI into `body`. Returns a cleanup function. */
export function mountRadio(body: HTMLElement): () => void {
  body.classList.add("radio-app");
  body.innerHTML = `
    <aside class="radio-list" aria-label="stations"></aside>
    <section class="radio-main">
      <div class="radio-label">NOW PLAYING</div>
      <div class="radio-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <h2 class="radio-title"></h2>
      <div class="radio-artist"></div>
      <div class="radio-msg" role="status"></div>
      <div class="radio-seek"><span class="t-cur">0:00</span><input type="range" min="0" max="1000" value="0" aria-label="seek" /><span class="t-dur">0:00</span></div>
      <div class="radio-ctrl">
        <button data-r="prev" aria-label="previous">&#9198;</button>
        <button data-r="toggle" class="big" aria-label="play or pause">&#9654;</button>
        <button data-r="next" aria-label="next">&#9197;</button>
      </div>
      <label class="radio-vol">vol <input type="range" min="0" max="100" aria-label="volume" /></label>
    </section>`;
  const q = <T extends HTMLElement>(s: string) => body.querySelector(s) as T;
  const list = q<HTMLElement>(".radio-list");
  const seek = q<HTMLInputElement>(".radio-seek input");
  const vol = q<HTMLInputElement>(".radio-vol input");
  vol.value = String(Math.round(audio.volume * 100));

  PLAYLIST.forEach((t, i) => {
    const b = document.createElement("button");
    b.className = "radio-station";
    b.innerHTML = `<span class="rs-n"></span><span class="rs-t"></span><span class="rs-a"></span>`;
    (b.querySelector(".rs-n") as HTMLElement).textContent = String(i + 1);
    (b.querySelector(".rs-t") as HTMLElement).textContent = t.title;
    (b.querySelector(".rs-a") as HTMLElement).textContent = t.artist;
    b.onclick = () => play(i);
    list.appendChild(b);
  });

  const render = () => {
    const t = PLAYLIST[index];
    q(".radio-title").textContent = t.title;
    q(".radio-artist").textContent = t.artist;
    q(".radio-msg").textContent = failed ? `Couldn't load "${t.src}" — add the mp3 to public/ to enable this station.` : "";
    q(".radio-main").classList.toggle("playing", isPlaying());
    q('[data-r="toggle"]').innerHTML = isPlaying() ? "&#10074;&#10074;" : "&#9654;";
    list.querySelectorAll(".radio-station").forEach((el, i) => el.classList.toggle("on", i === index));
  };
  const tick = () => {
    q(".t-cur").textContent = fmt(audio.currentTime);
    q(".t-dur").textContent = fmt(audio.duration);
    if (audio.duration) seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
  };
  audio.addEventListener("timeupdate", tick);
  const off = onChange(render);

  body.addEventListener("click", (e) => {
    const r = (e.target as HTMLElement).closest("[data-r]")?.getAttribute("data-r");
    if (r === "toggle") toggle();
    else if (r === "next") next();
    else if (r === "prev") prev();
  });
  seek.addEventListener("input", () => {
    if (audio.duration) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
  });
  vol.addEventListener("input", () => {
    audio.volume = Number(vol.value) / 100;
    try {
      localStorage.setItem("radio-volume", String(audio.volume));
    } catch {
      // not persisted
    }
  });
  render();
  tick();
  return () => {
    audio.removeEventListener("timeupdate", tick);
    off();
  };
}
