const MORSE: Record<string, string> = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---",
  k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-",
  u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....",
  "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "'": ".----.", "/": "-..-.",
};
const MORSE_REVERSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

/** Text -> morse, or morse -> text if the input looks like morse. */
export function morse(input: string): string {
  if (/^[.\-/\s]+$/.test(input)) {
    return input
      .trim()
      .split(/\s*\/\s*|\s{3,}/)
      .map((word) => word.split(/\s+/).map((c) => MORSE_REVERSE[c] ?? "?").join(""))
      .join(" ");
  }
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((word) => [...word].map((c) => MORSE[c] ?? "").filter(Boolean).join(" "))
    .join(" / ");
}

export function rot13(input: string): string {
  return input.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

export function base64Encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Returns null if the input isn't valid base64. */
export function base64Decode(input: string): string | null {
  try {
    const bin = atob(input);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function rollDice(spec: string): { rolls: number[]; total: number; notation: string } | null {
  const m = /^(\d{0,2})d(\d{1,4})$/i.exec(spec || "1d6");
  if (!m) return null;
  const count = Math.min(20, Math.max(1, parseInt(m[1] || "1", 10)));
  const sides = Math.min(1000, Math.max(2, parseInt(m[2], 10)));
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  return { rolls, total: rolls.reduce((a, b) => a + b, 0), notation: `${count}d${sides}` };
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Accepts #hex, rrggbb or any CSS color name. */
export function parseColor(input: string): Rgb | null {
  const trimmed = input.trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  if (!/^[a-z]+$/i.test(trimmed)) return null;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = trimmed;
  const out = ctx.fillStyle;
  if (out === "#010203" && trimmed.toLowerCase() !== "#010203") return null;
  const m = /^#([0-9a-f]{6})$/i.exec(out);
  if (!m) return null;
  return parseColor(m[1]);
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function rgbToHsl({ r, g, b }: Rgb): string {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

const PHASES = [
  ["New Moon", "\u{1F311}"], ["Waxing Crescent", "\u{1F312}"], ["First Quarter", "\u{1F313}"], ["Waxing Gibbous", "\u{1F314}"],
  ["Full Moon", "\u{1F315}"], ["Waning Gibbous", "\u{1F316}"], ["Last Quarter", "\u{1F317}"], ["Waning Crescent", "\u{1F318}"],
];

export function moonPhase(date = new Date()): { name: string; emoji: string; illumination: number; ageDays: number } {
  const synodic = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14); // a known new moon
  const age = (((date.getTime() - ref) / 86400000) % synodic + synodic) % synodic;
  const [name, emoji] = PHASES[Math.round((age / synodic) * 8) % 8];
  return { name, emoji, illumination: Math.round(((1 - Math.cos((2 * Math.PI * age) / synodic)) / 2) * 100), ageDays: age };
}

// --- stopwatch (in-memory) ---
let swStart: number | null = null;
let swElapsed = 0;
let swLaps: number[] = [];

export function stopwatch(action: string): string[] {
  const now = performance.now();
  const total = () => (swStart === null ? swElapsed : swElapsed + now - swStart);
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(2).padStart(5, "0")}`;
  switch (action) {
    case "start":
      if (swStart !== null) return ["already running."];
      swStart = now;
      return ["stopwatch started."];
    case "lap":
      if (swStart === null) return ["not running. try 'stopwatch start'."];
      swLaps.push(total());
      return [`lap ${swLaps.length}: ${fmt(total())}`];
    case "stop":
      if (swStart === null) return ["not running."];
      swElapsed = total();
      swStart = null;
      return [`stopped at ${fmt(swElapsed)}`];
    case "reset":
      swStart = null;
      swElapsed = 0;
      swLaps = [];
      return ["stopwatch reset."];
    default:
      return [swStart === null ? `stopped at ${fmt(swElapsed)} — usage: stopwatch start|lap|stop|reset` : `running: ${fmt(total())}`];
  }
}
