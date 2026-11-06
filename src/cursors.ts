import { BOARD_W, BOARD_H } from "./canvasDoc";

interface RemoteCursor {
  el: HTMLElement;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  start: number;
  x: number;
  y: number;
  page: string;
}

const DURATION = 110;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Minimum-jerk interpolation: 10t^3 - 15t^4 + 6t^5. */
function minJerk(t: number): number {
  return t * t * t * (10 + t * (-15 + 6 * t));
}

const ARROW = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 2 L2 15 L6 11.5 L9 16 L11 15 L8 10.5 L13.5 10 Z" fill="currentColor" stroke="#fff" stroke-width="1"/></svg>`;

/** Pointer-transparent overlay of other people's named cursors, in board coordinates. */
export class CursorLayer {
  private layer: HTMLElement;
  private cursors = new Map<string, RemoteCursor>();
  private raf = 0;
  private currentPage = "";

  constructor(parent: HTMLElement) {
    this.layer = document.createElement("div");
    this.layer.className = "cv-cursors";
    parent.appendChild(this.layer);
    const loop = (now: number) => {
      this.tick(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  setPage(id: string): void {
    this.currentPage = id;
    for (const c of this.cursors.values()) c.el.hidden = c.page !== id;
  }

  update(id: string, name: string, color: string, x: number, y: number, page: string, down: boolean, sel: boolean, hover: boolean): void {
    let c = this.cursors.get(id);
    if (!c) {
      const el = document.createElement("div");
      el.className = "cv-cursor";
      el.style.color = color;
      el.innerHTML = `${ARROW}<span class="cv-cursor-name"></span>`;
      (el.querySelector(".cv-cursor-name") as HTMLElement).textContent = name;
      (el.querySelector(".cv-cursor-name") as HTMLElement).style.background = color;
      this.layer.appendChild(el);
      c = { el, fromX: x, fromY: y, toX: x, toY: y, start: 0, x, y, page };
      this.cursors.set(id, c);
    }
    c.page = page;
    c.el.hidden = page !== this.currentPage;
    c.fromX = c.x;
    c.fromY = c.y;
    c.toX = x;
    c.toY = y;
    c.start = performance.now();
    c.el.toggleAttribute("data-cursor-press", down);
    c.el.toggleAttribute("data-cursor-selected", sel);
    c.el.toggleAttribute("data-cursor-hover", hover);
  }

  remove(id: string): void {
    this.cursors.get(id)?.el.remove();
    this.cursors.delete(id);
  }

  private tick(now: number): void {
    const w = this.layer.clientWidth;
    const scale = w / BOARD_W;
    for (const c of this.cursors.values()) {
      const t = reduced() ? 1 : Math.min(1, (now - c.start) / DURATION);
      const e = minJerk(t);
      c.x = c.fromX + (c.toX - c.fromX) * e;
      c.y = c.fromY + (c.toY - c.fromY) * e;
      c.el.style.transform = `translate(${c.x * scale}px, ${c.y * scale}px)`;
    }
    this.layer.style.height = `${BOARD_H * scale}px`;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.layer.remove();
    this.cursors.clear();
  }
}
