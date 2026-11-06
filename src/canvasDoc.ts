export const BOARD_W = 1600;
export const BOARD_H = 1000;

export type ShapeType = "rect" | "ellipse" | "text" | "pen" | "sticky" | "image";

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  text?: string;
  points?: number[];
  src?: string; // data URL for imported PDF pages
}

export interface Page {
  id: string;
  shapes: Shape[];
}

export interface Doc {
  name: string;
  pages: Page[];
}

export type Op =
  | { k: "add"; p: string; shape: Shape }
  | { k: "set"; p: string; id: string; patch: Partial<Shape> }
  | { k: "del"; p: string; id: string }
  | { k: "page"; page: Page }
  | { k: "name"; name: string };

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function newDoc(name: string): Doc {
  return { name, pages: [{ id: uid(), shapes: [] }] };
}

export function applyOp(doc: Doc, op: Op): void {
  if (op.k === "name") {
    doc.name = op.name;
    return;
  }
  if (op.k === "page") {
    if (!doc.pages.some((pg) => pg.id === op.page.id)) doc.pages.push(op.page);
    return;
  }
  const page = doc.pages.find((pg) => pg.id === op.p);
  if (!page) return;
  if (op.k === "add") {
    if (!page.shapes.some((s) => s.id === op.shape.id)) page.shapes.push(op.shape);
  } else if (op.k === "set") {
    const s = page.shapes.find((x) => x.id === op.id);
    if (s) Object.assign(s, op.patch);
  } else if (op.k === "del") {
    page.shapes = page.shapes.filter((x) => x.id !== op.id);
  }
}

const imageCache = new Map<string, HTMLImageElement>();

function getImage(shape: Shape, onLoad: () => void): HTMLImageElement | null {
  if (!shape.src) return null;
  let img = imageCache.get(shape.id);
  if (!img) {
    img = new Image();
    img.onload = onLoad;
    img.src = shape.src;
    imageCache.set(shape.id, img);
  }
  return img.complete ? img : null;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxW) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export function drawPage(
  ctx: CanvasRenderingContext2D,
  page: Page,
  selectedId: string | null,
  onImageLoad: () => void,
): void {
  ctx.fillStyle = "#f6f6f2";
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  for (const s of page.shapes) {
    ctx.save();
    ctx.fillStyle = s.color;
    ctx.strokeStyle = s.color;
    if (s.type === "image") {
      const img = getImage(s, onImageLoad);
      if (img) ctx.drawImage(img, s.x, s.y, s.w, s.h);
    } else if (s.type === "rect") {
      ctx.fillRect(s.x, s.y, s.w, s.h);
    } else if (s.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), Math.abs(s.h / 2), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.type === "pen" && s.points && s.points.length >= 2) {
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0], s.points[1]);
      for (let i = 2; i < s.points.length; i += 2) ctx.lineTo(s.points[i], s.points[i + 1]);
      ctx.stroke();
    } else if (s.type === "text") {
      ctx.font = "32px 'Courier New', monospace";
      ctx.textBaseline = "top";
      wrapText(ctx, s.text ?? "", 600).forEach((l, i) => ctx.fillText(l, s.x, s.y + i * 40));
    } else if (s.type === "sticky") {
      ctx.fillStyle = "#ffe98a";
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#222";
      ctx.font = "24px 'Courier New', monospace";
      ctx.textBaseline = "top";
      wrapText(ctx, s.text ?? "", s.w - 24).forEach((l, i) => ctx.fillText(l, s.x + 12, s.y + 12 + i * 30));
    }
    ctx.restore();
    if (s.id === selectedId) {
      const b = bounds(s);
      ctx.save();
      ctx.strokeStyle = "#1a8cff";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
      ctx.restore();
    }
  }
}

export function bounds(s: Shape): { x: number; y: number; w: number; h: number } {
  if (s.type === "pen" && s.points && s.points.length >= 2) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < s.points.length; i += 2) {
      minX = Math.min(minX, s.points[i]);
      maxX = Math.max(maxX, s.points[i]);
      minY = Math.min(minY, s.points[i + 1]);
      maxY = Math.max(maxY, s.points[i + 1]);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  if (s.type === "text") return { x: s.x, y: s.y, w: 600, h: 40 * ((s.text ?? "").split("\n").length || 1) };
  const x = Math.min(s.x, s.x + s.w);
  const y = Math.min(s.y, s.y + s.h);
  return { x, y, w: Math.abs(s.w), h: Math.abs(s.h) };
}

export function hitTest(page: Page, x: number, y: number): Shape | null {
  for (let i = page.shapes.length - 1; i >= 0; i--) {
    const b = bounds(page.shapes[i]);
    if (x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6) return page.shapes[i];
  }
  return null;
}
