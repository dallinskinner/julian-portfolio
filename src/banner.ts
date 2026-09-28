import { NAME } from "./content";

export function banner(): string {
  const label = ` ${NAME} `;
  const width = Math.max(label.length + 2, 20);
  const top = "┌" + "─".repeat(width) + "┐";
  const bottom = "└" + "─".repeat(width) + "┘";
  const pad = width - label.length;
  const left = Math.floor(pad / 2);
  const right = pad - left;
  const mid = "│" + " ".repeat(left) + label + " ".repeat(right) + "│";
  return [top, mid, bottom].join("\n");
}
