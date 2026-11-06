import { BOARD_W, BOARD_H, drawPage, type Doc } from "./canvasDoc";

const MAX_PAGES = 30;

/** Render each PDF page to a JPEG data URL (lazy-loads pdf.js). */
export async function importPdf(file: File): Promise<{ src: string; w: number; h: number }[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: { src: string; w: number; h: number }[] = [];
  const count = Math.min(pdf.numPages, MAX_PAGES);
  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1400 / base.width, 1000 / base.height, 2);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    out.push({ src: canvas.toDataURL("image/jpeg", 0.7), w: canvas.width, h: canvas.height });
  }
  return out;
}

function renderPage(doc: Doc, index: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = BOARD_W;
  c.height = BOARD_H;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  drawPage(ctx, doc.pages[index], null, () => {});
  return c;
}

/** Images may not be decoded yet for offscreen renders; wait for them. */
async function renderReady(doc: Doc, index: number): Promise<HTMLCanvasElement> {
  renderPage(doc, index); // kicks off image loads
  await new Promise((r) => setTimeout(r, 150));
  return renderPage(doc, index);
}

export type PdfMode = "slides" | "document";

export async function exportPdf(doc: Doc, mode: PdfMode): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf =
    mode === "slides"
      ? new jsPDF({ orientation: "landscape", unit: "px", format: [BOARD_W, BOARD_H], hotfixes: ["px_scaling"] })
      : new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  for (let i = 0; i < doc.pages.length; i++) {
    if (i > 0) pdf.addPage();
    const img = (await renderReady(doc, i)).toDataURL("image/jpeg", 0.9);
    if (mode === "slides") {
      pdf.addImage(img, "JPEG", 0, 0, BOARD_W, BOARD_H);
    } else {
      const pw = pdf.internal.pageSize.getWidth() - 72;
      pdf.addImage(img, "JPEG", 36, 36, pw, pw * (BOARD_H / BOARD_W));
    }
  }
  pdf.save(`${doc.name.replace(/[^\w-]+/g, "_") || "project"}-${mode}.pdf`);
}

export async function exportPng(doc: Doc, index: number): Promise<void> {
  const c = await renderReady(doc, index);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.name.replace(/[^\w-]+/g, "_") || "project"}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
