// A compact 4x5 block font for the 'ascii' command. Each glyph is stored as
// 5 rows of a 4-bit binary literal (bit 3 = leftmost column) rather than
// hand-drawn strings — the binary layout visually mirrors the pixel pattern
// in the source, which is much harder to typo than four-character strings.
const WIDTH = 4;
const HEIGHT = 5;

const FONT_BITS: Record<string, number[]> = {
  A: [0b0110, 0b1001, 0b1111, 0b1001, 0b1001],
  B: [0b1110, 0b1001, 0b1110, 0b1001, 0b1110],
  C: [0b0111, 0b1000, 0b1000, 0b1000, 0b0111],
  D: [0b1110, 0b1001, 0b1001, 0b1001, 0b1110],
  E: [0b1111, 0b1000, 0b1110, 0b1000, 0b1111],
  F: [0b1111, 0b1000, 0b1110, 0b1000, 0b1000],
  G: [0b0111, 0b1000, 0b1011, 0b1001, 0b0111],
  H: [0b1001, 0b1001, 0b1111, 0b1001, 0b1001],
  I: [0b0110, 0b0110, 0b0110, 0b0110, 0b0110],
  J: [0b0011, 0b0011, 0b0011, 0b1011, 0b0110],
  K: [0b1001, 0b1010, 0b1100, 0b1010, 0b1001],
  L: [0b1000, 0b1000, 0b1000, 0b1000, 0b1111],
  M: [0b1001, 0b1111, 0b1001, 0b1001, 0b1001],
  N: [0b1001, 0b1101, 0b1011, 0b1001, 0b1001],
  O: [0b0110, 0b1001, 0b1001, 0b1001, 0b0110],
  P: [0b1110, 0b1001, 0b1110, 0b1000, 0b1000],
  Q: [0b0110, 0b1001, 0b1001, 0b0110, 0b0001],
  R: [0b1110, 0b1001, 0b1110, 0b1010, 0b1001],
  S: [0b0111, 0b1000, 0b0110, 0b0001, 0b1110],
  T: [0b1111, 0b0110, 0b0110, 0b0110, 0b0110],
  U: [0b1001, 0b1001, 0b1001, 0b1001, 0b0110],
  V: [0b1001, 0b1001, 0b1001, 0b0110, 0b0110],
  W: [0b1001, 0b1001, 0b1011, 0b1111, 0b1001],
  X: [0b1001, 0b0110, 0b0110, 0b0110, 0b1001],
  Y: [0b1001, 0b0110, 0b0110, 0b0110, 0b0110],
  Z: [0b1111, 0b0010, 0b0100, 0b1000, 0b1111],
  "0": [0b0110, 0b1001, 0b1001, 0b1001, 0b0110],
  "1": [0b0100, 0b1100, 0b0100, 0b0100, 0b1110],
  "2": [0b0110, 0b1001, 0b0010, 0b0100, 0b1111],
  "3": [0b1110, 0b0001, 0b0110, 0b0001, 0b1110],
  "4": [0b0010, 0b0110, 0b1010, 0b1111, 0b0010],
  "5": [0b1111, 0b1000, 0b1110, 0b0001, 0b1110],
  "6": [0b0110, 0b1000, 0b1110, 0b1001, 0b0110],
  "7": [0b1111, 0b0001, 0b0010, 0b0100, 0b1000],
  "8": [0b0110, 0b1001, 0b0110, 0b1001, 0b0110],
  "9": [0b0110, 0b1001, 0b0111, 0b0001, 0b0110],
};

function bitsToGlyph(bits: number[]): string[] {
  return bits.map((row) => {
    let s = "";
    for (let i = WIDTH - 1; i >= 0; i--) s += row & (1 << i) ? "#" : " ";
    return s;
  });
}

const BLANK_GLYPH: string[] = new Array(HEIGHT).fill(" ".repeat(WIDTH));
const SPACE_GLYPH: string[] = new Array(HEIGHT).fill("  ");

/** Renders text as big blocky ASCII art. Supports A-Z, 0-9, and space only. */
export function renderAsciiText(text: string): string {
  const chars = Array.from(text.toUpperCase());
  const rows: string[] = new Array(HEIGHT).fill("");
  for (const ch of chars) {
    const bits = FONT_BITS[ch];
    const glyph = ch === " " ? SPACE_GLYPH : bits ? bitsToGlyph(bits) : BLANK_GLYPH;
    for (let r = 0; r < HEIGHT; r++) rows[r] += glyph[r] + " ";
  }
  return rows.join("\n");
}
