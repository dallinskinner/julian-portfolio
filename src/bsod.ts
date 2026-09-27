import { getSpeedMultiplier } from "./speed";

const MESSAGE = `Windows
A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +
00010E36. The current application will be terminated.

*  Press any key to terminate the current application.
*  Press CTRL+ALT+DEL again to restart your computer. You will
   lose any unsaved information in all applications.

Press any key to continue _`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runBsod(duration = 4000): Promise<void> {
  const overlay = document.createElement("div");
  overlay.id = "bsod-overlay";
  overlay.textContent = MESSAGE;
  document.body.appendChild(overlay);

  await sleep(duration / getSpeedMultiplier());

  overlay.remove();
}
