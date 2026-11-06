import { BOARD_W, BOARD_H, applyOp, drawPage, hitTest, newDoc, uid, type Doc, type Op, type Shape, type ShapeType } from "./canvasDoc";
import { Session, type Msg } from "./collab";
import { CursorLayer } from "./cursors";
import { exportPdf, exportPng, importPdf } from "./pdf";

type Tool = "select" | "rect" | "ellipse" | "text" | "pen" | "sticky";
const TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "select" },
  { id: "rect", label: "rect" },
  { id: "ellipse", label: "ellipse" },
  { id: "text", label: "text" },
  { id: "pen", label: "pen" },
  { id: "sticky", label: "sticky" },
];
const SWATCHES = ["#1d1d1b", "#e5484d", "#f5a524", "#30a46c", "#0091ff", "#8e4ec6"];
const NAMES = ["Kubai", "Mara", "Juno", "Pixel", "Sage", "Orbit", "Nova", "Echo"];
const CURSOR_COLORS = ["#f24e9c", "#0091ff", "#30a46c", "#f5a524", "#8e4ec6", "#e5484d"];

export interface CanvasOptions {
  name?: string;
  joinId?: string;
}

let active: (() => void) | null = null;
export function closeCanvas(): void {
  active?.();
}

export function inviteLink(peerId: string): string {
  return `${location.origin}${location.pathname}#/join/${peerId}`;
}

export async function openCanvas(opts: CanvasOptions): Promise<void> {
  closeCanvas();
  const chosen = opts.joinId ? await ask("Your display name?", pick(NAMES)) : null;
  const myName = (chosen && chosen.trim().slice(0, 24)) || pick(NAMES);
  return new Promise((resolve) => {
    const myColor = pick(CURSOR_COLORS);
    let doc: Doc = newDoc(opts.name || "untitled");
    let pageIdx = 0;
    let tool: Tool = "select";
    let color = SWATCHES[0];
    let selected: string | null = null;
    let drag: { shape: Shape; ox: number; oy: number; mode: "move" | "draw" } | null = null;
    let hostLost = false;
    let myPeerId = "";

    const overlay = document.createElement("div");
    overlay.id = "cv-overlay";
    overlay.innerHTML = `
      <div class="cv-bar">
        <input class="cv-name" aria-label="project name" maxlength="40" />
        <span class="cv-tools"></span>
        <span class="cv-swatches"></span>
        <button data-act="invite" class="cv-btn">invite</button>
        <button data-act="import" class="cv-btn">import pdf</button>
        <select class="cv-btn" data-act="export" aria-label="export">
          <option value="">export…</option><option value="png">png</option>
          <option value="slides">pdf slides</option><option value="document">pdf document</option>
        </select>
        <button data-act="exit" class="cv-btn">exit (esc)</button>
        <input type="file" accept="application/pdf" hidden />
      </div>
      <div class="cv-pages"></div>
      <div class="cv-stage"><div class="cv-board"><canvas width="${BOARD_W}" height="${BOARD_H}"></canvas></div></div>
      <div class="cv-status" role="status">connecting…</div>`;
    document.body.appendChild(overlay);

    const q = <T extends HTMLElement>(s: string) => overlay.querySelector(s) as T;
    const canvas = q<HTMLCanvasElement>("canvas");
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const board = q<HTMLElement>(".cv-board");
    const stage = q<HTMLElement>(".cv-stage");
    const status = q<HTMLElement>(".cv-status");
    const nameInput = q<HTMLInputElement>(".cv-name");
    const fileInput = q<HTMLInputElement>('input[type="file"]');
    const cursors = new CursorLayer(board);
    nameInput.value = doc.name;

    const setStatus = (t: string) => (status.textContent = t);
    const page = () => doc.pages[Math.min(pageIdx, doc.pages.length - 1)];

    const fit = () => {
      const s = Math.min(stage.clientWidth / BOARD_W, stage.clientHeight / BOARD_H);
      board.style.width = `${BOARD_W * s}px`;
      board.style.height = `${BOARD_H * s}px`;
    };
    const redraw = () => drawPage(ctx, page(), selected, redraw);

    const buildPages = () => {
      const el = q<HTMLElement>(".cv-pages");
      el.innerHTML = "";
      doc.pages.forEach((_pg, i) => {
        const b = document.createElement("button");
        b.className = "cv-btn" + (i === pageIdx ? " on" : "");
        b.textContent = String(i + 1);
        b.onclick = () => gotoPage(i);
        el.appendChild(b);
      });
      const add = document.createElement("button");
      add.className = "cv-btn";
      add.textContent = "+ page";
      add.onclick = () => local({ k: "page", page: { id: uid(), shapes: [] } });
      el.appendChild(add);
    };
    const gotoPage = (i: number) => {
      pageIdx = i;
      selected = null;
      cursors.setPage(page().id);
      buildPages();
      redraw();
    };

    const toolsEl = q<HTMLElement>(".cv-tools");
    const buildTools = () => {
      toolsEl.innerHTML = "";
      for (const t of TOOLS) {
        const b = document.createElement("button");
        b.className = "cv-btn" + (t.id === tool ? " on" : "");
        b.textContent = t.label;
        b.onclick = () => {
          tool = t.id;
          buildTools();
        };
        toolsEl.appendChild(b);
      }
    };
    const swEl = q<HTMLElement>(".cv-swatches");
    const buildSwatches = () => {
      swEl.innerHTML = "";
      for (const c of SWATCHES) {
        const b = document.createElement("button");
        b.className = "cv-sw" + (c === color ? " on" : "");
        b.style.background = c;
        b.setAttribute("aria-label", `color ${c}`);
        b.onclick = () => {
          color = c;
          if (selected) local({ k: "set", p: page().id, id: selected, patch: { color } });
          buildSwatches();
        };
        swEl.appendChild(b);
      }
    };

    // ---- networking ----
    const session = new Session({
      onMsg: (m: Msg) => onMsg(m),
      onPeerJoin: (id) => {
        session.sendTo(id, { t: "snap", doc });
        setStatus(`${session.peerCount() + 1} people here`);
      },
      onPeerLeave: (id) => {
        cursors.remove(id);
        setStatus(`${session.peerCount() + 1} people here`);
      },
      onHostLost: () => {
        hostLost = true;
        setStatus("host left — the project is now read-only (esc to exit)");
      },
    });

    const apply = (op: Op) => {
      applyOp(doc, op);
      if (op.k === "name") nameInput.value = doc.name;
      if (op.k === "page") buildPages();
      redraw();
    };
    const local = (op: Op) => {
      if (hostLost) return;
      apply(op);
      session.send({ t: "op", op });
    };
    function onMsg(m: Msg) {
      if (m.t === "snap") {
        doc = m.doc;
        pageIdx = 0;
        nameInput.value = doc.name;
        buildPages();
        cursors.setPage(page().id);
        redraw();
        setStatus("connected");
      } else if (m.t === "op") {
        apply(m.op);
      } else if (m.t === "cur") {
        const pg = doc.pages.find((p) => p.id === m.page);
        const hover = !!pg && !!hitTest(pg, m.x, m.y);
        cursors.update(m.id, m.name, m.color, m.x, m.y, m.page, m.down, m.sel, hover);
      } else if (m.t === "bye") {
        cursors.remove(m.id);
      }
    }

    // ---- pointer handling ----
    const pt = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * BOARD_W, y: ((e.clientY - r.top) / r.height) * BOARD_H };
    };
    let lastCur = 0;
    const sendCursor = (x: number, y: number, down: boolean, force = false) => {
      const now = performance.now();
      if (!force && now - lastCur < 33) return;
      lastCur = now;
      session.send({ t: "cur", id: myPeerId, name: myName, color: myColor, x, y, page: page().id, down, sel: !!selected });
    };
    const askText = (initial = "") => ask("Text:", initial);

    canvas.addEventListener("pointerdown", async (e) => {
      if (hostLost) return;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = pt(e);
      sendCursor(x, y, true, true);
      if (tool === "select") {
        const hit = hitTest(page(), x, y);
        selected = hit?.id ?? null;
        if (hit) drag = { shape: hit, ox: x - hit.x, oy: y - hit.y, mode: "move" };
        redraw();
        return;
      }
      if (tool === "text" || tool === "sticky") {
        const text = await askText();
        if (text) {
          const s: Shape = tool === "text"
            ? { id: uid(), type: "text", x, y, w: 0, h: 0, color, text }
            : { id: uid(), type: "sticky", x, y, w: 220, h: 170, color, text };
          local({ k: "add", p: page().id, shape: s });
          selected = s.id;
        }
        return;
      }
      const type: ShapeType = tool;
      const s: Shape = { id: uid(), type, x, y, w: 0, h: 0, color, points: type === "pen" ? [x, y] : undefined };
      applyOp(doc, { k: "add", p: page().id, shape: s }); // local preview; broadcast on release
      drag = { shape: s, ox: x, oy: y, mode: "draw" };
    });
    canvas.addEventListener("pointermove", (e) => {
      const { x, y } = pt(e);
      sendCursor(x, y, !!drag);
      if (!drag) return;
      const s = drag.shape;
      if (drag.mode === "move") {
        const nx = x - drag.ox;
        const ny = y - drag.oy;
        if (s.points) for (let i = 0; i < s.points.length; i += 2) {
          s.points[i] += nx - s.x;
          s.points[i + 1] += ny - s.y;
        }
        s.x = nx;
        s.y = ny;
      } else if (s.type === "pen") {
        s.points?.push(x, y);
      } else {
        s.w = x - drag.ox;
        s.h = y - drag.oy;
      }
      redraw();
    });
    const release = (e: PointerEvent) => {
      if (!drag) return;
      const { x, y } = pt(e);
      const s = drag.shape;
      if (drag.mode === "draw") {
        const tiny = s.type !== "pen" && Math.abs(s.w) < 4 && Math.abs(s.h) < 4;
        applyOp(doc, { k: "del", p: page().id, id: s.id });
        if (!tiny) {
          local({ k: "add", p: page().id, shape: s });
          selected = s.id;
        }
      } else {
        local({ k: "set", p: page().id, id: s.id, patch: { x: s.x, y: s.y, ...(s.points ? { points: s.points } : {}) } });
      }
      drag = null;
      sendCursor(x, y, false, true);
      redraw();
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("dblclick", async (e) => {
      const { x, y } = pt(e as unknown as PointerEvent);
      const hit = hitTest(page(), x, y);
      if (hit && (hit.type === "text" || hit.type === "sticky")) {
        const t = await askText(hit.text);
        if (t !== null) local({ k: "set", p: page().id, id: hit.id, patch: { text: t } });
      }
    });

    // ---- toolbar ----
    let linkTimer = 0;
    overlay.addEventListener("click", async (e) => {
      const act = (e.target as HTMLElement).closest("[data-act]")?.getAttribute("data-act");
      if (act === "exit") finish();
      else if (act === "import") fileInput.click();
      else if (act === "invite") {
        const link = inviteLink(session.isHost ? session.id : opts.joinId ?? "");
        try {
          await navigator.clipboard.writeText(link);
          setStatus("invite link copied!");
        } catch {
          await ask("Copy your invite link:", link);
        }
        clearTimeout(linkTimer);
        linkTimer = window.setTimeout(() => setStatus(`${session.peerCount() + 1} people here`), 2500);
      }
    });
    overlay.addEventListener("pointerdown", (e) => e.stopPropagation());
    overlay.addEventListener("click", (e) => e.stopPropagation());
    q<HTMLSelectElement>('[data-act="export"]').addEventListener("change", async (e) => {
      const sel = e.target as HTMLSelectElement;
      const v = sel.value;
      sel.value = "";
      if (!v) return;
      setStatus("exporting…");
      try {
        if (v === "png") await exportPng(doc, pageIdx);
        else await exportPdf(doc, v as "slides" | "document");
        setStatus("exported");
      } catch {
        setStatus("export failed");
      }
    });
    nameInput.addEventListener("change", () => local({ k: "name", name: nameInput.value.trim() || "untitled" }));
    fileInput.addEventListener("change", async () => {
      const f = fileInput.files?.[0];
      fileInput.value = "";
      if (!f || hostLost) return;
      setStatus("importing pdf…");
      try {
        const pages = await importPdf(f);
        for (const p of pages) {
          const scale = Math.min(BOARD_W / p.w, BOARD_H / p.h);
          const w = p.w * scale, h = p.h * scale;
          const shape: Shape = { id: uid(), type: "image", x: (BOARD_W - w) / 2, y: (BOARD_H - h) / 2, w, h, color: "#000", src: p.src };
          const id = uid();
          local({ k: "page", page: { id, shapes: [shape] } });
        }
        if (pages.length) gotoPage(doc.pages.length - pages.length);
        setStatus(`imported ${pages.length} page${pages.length === 1 ? "" : "s"}`);
      } catch {
        setStatus("couldn't read that PDF");
      }
    });

    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") finish();
      else if ((e.key === "Delete" || e.key === "Backspace") && selected && !(e.target instanceof HTMLInputElement)) {
        local({ k: "del", p: page().id, id: selected });
        selected = null;
        redraw();
      }
    };
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", fit);

    function finish() {
      if (!active) return;
      active = null;
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", fit);
      session.send({ t: "bye", id: myPeerId });
      session.close();
      cursors.destroy();
      overlay.remove();
      if (location.hash.startsWith("#/join/")) history.replaceState(null, "", location.pathname + location.search);
      resolve();
    }
    active = finish;

    buildTools();
    buildSwatches();
    buildPages();
    fit();
    redraw();

    void (async () => {
      try {
        if (opts.joinId) {
          await session.join(opts.joinId);
          myPeerId = session.id;
          setStatus("joined — waiting for project…");
        } else {
          const id = await session.host();
          myPeerId = id;
          setStatus(`hosting — click "invite" to share (project lives while this tab is open)`);
        }
      } catch (err) {
        setStatus(`connection failed: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    })();
  });
}

function ask(message: string, initial = ""): Promise<string | null> {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "cv-modal";
    wrap.innerHTML = `<form class="cv-dialog"><label></label><input type="text" /><div><button type="submit" class="cv-btn on">ok</button> <button type="button" class="cv-btn">cancel</button></div></form>`;
    (wrap.querySelector("label") as HTMLElement).textContent = message;
    const input = wrap.querySelector("input") as HTMLInputElement;
    input.value = initial;
    const done = (v: string | null) => {
      wrap.remove();
      resolve(v);
    };
    wrap.querySelector("form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      done(input.value);
    });
    wrap.querySelector("button[type=button]")!.addEventListener("click", () => done(null));
    wrap.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") done(null);
    });
    wrap.addEventListener("pointerdown", (e) => e.stopPropagation());
    document.body.appendChild(wrap);
    input.focus();
    input.select();
  });
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
