import { getSpeedMultiplier } from "./speed";

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let columns: number[] = [];
let rafId = 0;
let resizeHandler: (() => void) | null = null;

const DEFAULT_GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789";
const FONT_SIZE = 16;

// Array.from splits by Unicode code point, not UTF-16 code unit — required
// for glyph sets that include emoji (which are surrogate pairs).
let glyphChars = Array.from(DEFAULT_GLYPHS);

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const count = Math.floor(canvas.width / FONT_SIZE);
  columns = new Array(count).fill(0).map(() => Math.floor(Math.random() * -50));
}

function draw() {
  if (!canvas || !ctx) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#33ff33";
  ctx.font = `${FONT_SIZE}px monospace`;

  for (let i = 0; i < columns.length; i++) {
    const glyph = glyphChars[Math.floor(Math.random() * glyphChars.length)];
    const x = i * FONT_SIZE;
    const y = columns[i] * FONT_SIZE;
    ctx.fillText(glyph, x, y);

    if (y > canvas.height && Math.random() > 0.975) {
      columns[i] = 0;
    } else {
      columns[i] += getSpeedMultiplier();
    }
  }

  rafId = requestAnimationFrame(draw);
}

export function isMatrixRunning(): boolean {
  return canvas !== null;
}

export function startMatrix(customText?: string): void {
  if (canvas) return;
  const trimmed = customText?.replace(/\s+/g, "") ?? "";
  glyphChars = Array.from(trimmed || DEFAULT_GLYPHS);
  const terminal = document.getElementById("terminal") ?? document.body;
  canvas = document.createElement("canvas");
  canvas.id = "matrix-canvas";
  terminal.prepend(canvas);
  ctx = canvas.getContext("2d");
  resize();
  resizeHandler = resize;
  window.addEventListener("resize", resizeHandler);
  rafId = requestAnimationFrame(draw);
}

export function stopMatrix(): void {
  if (!canvas) return;
  cancelAnimationFrame(rafId);
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
  canvas.remove();
  canvas = null;
  ctx = null;
  columns = [];
}

export function toggleMatrix(customText?: string): boolean {
  if (isMatrixRunning()) {
    stopMatrix();
    return false;
  }
  startMatrix(customText);
  return true;
}
