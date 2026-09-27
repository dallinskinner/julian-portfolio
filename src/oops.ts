import { getSpeedMultiplier } from "./speed";

export function runOops(): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "oops-overlay";

    const video = document.createElement("video");
    video.src = "/oops.mp4";
    video.autoplay = true;
    video.playsInline = true;
    video.playbackRate = getSpeedMultiplier();

    overlay.appendChild(video);
    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.remove();
      resolve();
    };

    video.addEventListener("ended", cleanup, { once: true });
    video.play().catch(cleanup);
  });
}
