import { isPlaying, mountRadio, onChange, stop as stopRadio } from "./radio";

interface AppDef {
  id: string;
  title: string;
  glyph: string;
}
const APPS: AppDef[] = [
  { id: "radio", title: "Radio", glyph: "&#9835;" },
  { id: "terminal", title: "Terminal", glyph: "&gt;_" },
];

interface Win {
  app: AppDef;
  el: HTMLElement;
  minimized: boolean;
  cleanup: () => void;
}

let active: (() => void) | null = null;

export function openOs(): Promise<void> {
  active?.();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "os-overlay";
    overlay.innerHTML = `
      <div class="os-desktop"></div>
      <div class="os-start" hidden>
        <div class="os-start-title">Pinned</div>
        <div class="os-start-apps"></div>
        <div class="os-start-foot"><span>Julian Skinner</span><button data-os="shutdown">&#9211; Shut down</button></div>
      </div>
      <div class="os-taskbar">
        <div class="os-tb-left"></div>
        <div class="os-tb-center"><button class="os-tb-btn" data-os="start" aria-label="Start">&#8862;</button><span class="os-tb-apps"></span></div>
        <div class="os-tb-right"><span class="os-clock"></span></div>
      </div>`;
    document.body.appendChild(overlay);
    const q = <T extends HTMLElement>(s: string) => overlay.querySelector(s) as T;
    const desktop = q<HTMLElement>(".os-desktop");
    const start = q<HTMLElement>(".os-start");
    const tbApps = q<HTMLElement>(".os-tb-apps");
    const clock = q<HTMLElement>(".os-clock");
    const wins = new Map<string, Win>();
    let z = 1;

    const tickClock = () => {
      const d = new Date();
      clock.innerHTML = `${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}<br>${d.toLocaleDateString()}`;
    };
    tickClock();
    const clockTimer = window.setInterval(tickClock, 1000);

    const renderTaskbar = () => {
      tbApps.innerHTML = "";
      for (const app of APPS) {
        if (app.id === "terminal") continue;
        const w = wins.get(app.id);
        const b = document.createElement("button");
        b.className = "os-tb-btn" + (w ? " open" : "") + (w && !w.minimized ? " focus" : "");
        b.title = app.title;
        b.innerHTML = app.glyph;
        if (app.id === "radio" && isPlaying()) b.classList.add("playing");
        b.onclick = () => launch(app.id);
        tbApps.appendChild(b);
      }
    };
    const offRadio = onChange(renderTaskbar);

    const focus = (w: Win) => {
      w.el.style.zIndex = String(++z);
      w.minimized = false;
      w.el.hidden = false;
      renderTaskbar();
    };

    const launch = (id: string) => {
      start.hidden = true;
      if (id === "terminal") return finish();
      const existing = wins.get(id);
      if (existing) {
        if (existing.minimized || existing.el.style.zIndex !== String(z)) focus(existing);
        else {
          existing.minimized = true;
          existing.el.hidden = true;
          renderTaskbar();
        }
        return;
      }
      const app = APPS.find((a) => a.id === id) as AppDef;
      const el = document.createElement("div");
      el.className = "os-win";
      el.innerHTML = `<div class="os-win-bar"><span class="os-win-title"></span><span class="os-win-btns"><button data-w="min" aria-label="minimize">&#8211;</button><button data-w="close" aria-label="close">&#10005;</button></span></div><div class="os-win-body"></div>`;
      (el.querySelector(".os-win-title") as HTMLElement).innerHTML = `${app.glyph} ${app.title}`;
      const offset = wins.size * 28;
      el.style.left = `calc(50% - 280px + ${offset}px)`;
      el.style.top = `${70 + offset}px`;
      desktop.appendChild(el);
      const cleanup = id === "radio" ? mountRadio(el.querySelector(".os-win-body") as HTMLElement) : () => {};
      const w: Win = { app, el, minimized: false, cleanup };
      wins.set(id, w);
      el.addEventListener("pointerdown", () => focus(w));
      el.querySelector('[data-w="min"]')!.addEventListener("click", () => {
        w.minimized = true;
        el.hidden = true;
        renderTaskbar();
      });
      el.querySelector('[data-w="close"]')!.addEventListener("click", () => {
        w.cleanup();
        if (id === "radio") stopRadio();
        el.remove();
        wins.delete(id);
        renderTaskbar();
      });
      const bar = el.querySelector(".os-win-bar") as HTMLElement;
      bar.addEventListener("pointerdown", (e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - r.left;
        const dy = e.clientY - r.top;
        bar.setPointerCapture(e.pointerId);
        const move = (ev: PointerEvent) => {
          el.style.left = `${Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - dx))}px`;
          el.style.top = `${Math.max(0, Math.min(window.innerHeight - 100, ev.clientY - dy))}px`;
        };
        const up = () => {
          bar.removeEventListener("pointermove", move);
          bar.removeEventListener("pointerup", up);
        };
        bar.addEventListener("pointermove", move);
        bar.addEventListener("pointerup", up);
      });
      focus(w);
    };

    // desktop shortcuts + start menu entries
    for (const app of APPS) {
      const sc = document.createElement("button");
      sc.className = "os-icon";
      sc.innerHTML = `<span>${app.glyph}</span>${app.title}`;
      sc.ondblclick = () => launch(app.id);
      sc.onclick = (e) => {
        if (e.detail === 1 && window.matchMedia("(pointer: coarse)").matches) launch(app.id);
      };
      desktop.appendChild(sc);
      const item = document.createElement("button");
      item.className = "os-start-app";
      item.innerHTML = `<span>${app.glyph}</span>${app.title}`;
      item.onclick = () => launch(app.id);
      q(".os-start-apps").appendChild(item);
    }

    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = (e.target as HTMLElement).closest("[data-os]")?.getAttribute("data-os");
      if (act === "start") start.hidden = !start.hidden;
      else if (act === "shutdown") finish();
      else if (!(e.target as HTMLElement).closest(".os-start")) start.hidden = true;
    });
    overlay.addEventListener("pointerdown", (e) => e.stopPropagation());

    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        if (!start.hidden) start.hidden = true;
        else finish();
      }
    };
    document.addEventListener("keydown", onKey, true);

    function finish() {
      if (!active) return;
      active = null;
      document.removeEventListener("keydown", onKey, true);
      clearInterval(clockTimer);
      offRadio();
      for (const w of wins.values()) w.cleanup();
      stopRadio();
      overlay.remove();
      resolve();
    }
    active = finish;
    renderTaskbar();
  });
}
