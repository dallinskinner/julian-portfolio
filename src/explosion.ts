import { getSpeedMultiplier } from "./speed";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: "0" | "1";
  size: number;
}

const COLOR = "#33ff33";

export function runExplosion(duration = 1400): Promise<void> {
  return new Promise((resolve) => {
    const speed = getSpeedMultiplier();
    const scaledDuration = duration / speed;

    const canvas = document.createElement("canvas");
    canvas.id = "explosion-canvas";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = Math.round((canvas.width * canvas.height) / 9000);

    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const particleSpeed = (3 + Math.random() * 14) * speed;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * particleSpeed,
        vy: Math.sin(angle) * particleSpeed,
        char: Math.random() < 0.5 ? "0" : "1",
        size: 12 + Math.random() * 14,
      };
    });

    const start = performance.now();
    let rafId = 0;

    function frame(now: number): void {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = Math.min(elapsed / scaledDuration, 1);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = COLOR;
      ctx.shadowColor = COLOR;
      ctx.shadowBlur = 6;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy = p.vy * 0.99 + 0.12;
        ctx.font = `${p.size}px monospace`;
        ctx.fillText(p.char, p.x, p.y);
      }

      if (elapsed < scaledDuration) {
        rafId = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resize);
        canvas.remove();
        resolve();
      }
    }

    rafId = requestAnimationFrame(frame);
  });
}
