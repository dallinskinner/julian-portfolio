import { commandNames, runCommand, type EffectAPI } from "./commands";
import { escapeHtml } from "./utils";
import { fastSleep } from "./speed";
import { recordVisit } from "./visitors";
import { banner } from "./banner";
import { applyPersistedTheme } from "./theme";

const PROMPT = "visitor@julian-skinner:~$";
const BOOT_LINES = [
  "booting hackfolio-os v1.0.0 ...",
  "loading kernel modules ......... [ ok ]",
  "mounting /dev/portfolio ........ [ ok ]",
  "starting julian-term ........... [ ok ]",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Terminal {
  private root: HTMLElement;
  private output: HTMLElement;
  private inputLine: HTMLElement;
  private input: HTMLInputElement;
  private history: string[] = [];
  private historyIndex = 0;

  constructor(mount: HTMLElement) {
    mount.innerHTML = `
      <div id="terminal" role="group" aria-label="interactive terminal">
        <div id="win98-bar" aria-hidden="true">
          <span class="win98-bar-title">C:\\WINDOWS\\SYSTEM32\\JULIAN.EXE</span>
          <span class="win98-bar-buttons"><span>_</span><span>&#9633;</span><span>X</span></span>
        </div>
        <div id="output" role="log" aria-live="polite"></div>
        <div id="input-line" class="line" hidden>
          <span class="prompt">${escapeHtml(PROMPT)}</span>
          <input id="cmd-input" type="text" autocomplete="off" autocapitalize="off"
                 autocorrect="off" spellcheck="false" aria-label="terminal input" />
        </div>
      </div>
    `;

    this.root = mount.querySelector("#terminal") as HTMLElement;
    this.output = mount.querySelector("#output") as HTMLElement;
    this.inputLine = mount.querySelector("#input-line") as HTMLElement;
    this.input = mount.querySelector("#cmd-input") as HTMLInputElement;

    this.root.addEventListener("click", () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        this.input.focus();
      }
    });

    this.input.addEventListener("keydown", (e) => this.onKeyDown(e));

    applyPersistedTheme();
    void recordVisit();
    void this.boot();
  }

  private appendLine(html: string, className = ""): HTMLElement {
    const div = document.createElement("div");
    div.className = `line${className ? " " + className : ""}`;
    div.innerHTML = html;
    this.output.appendChild(div);
    return div;
  }

  private appendArt(text: string): HTMLElement {
    const wrapper = this.appendLine('<pre class="art"></pre>');
    const pre = wrapper.querySelector("pre") as HTMLElement;
    pre.textContent = text;
    return pre;
  }

  private buildEffectApi(): EffectAPI {
    return {
      print: (html, className) => {
        this.appendLine(html, className);
        this.scrollToBottom();
      },
      printArt: (text) => {
        const pre = this.appendArt(text);
        this.scrollToBottom();
        return pre;
      },
      clear: () => {
        this.output.innerHTML = "";
      },
      sleep: fastSleep,
    };
  }

  private scrollToBottom(): void {
    this.root.scrollTop = this.root.scrollHeight;
  }

  private async boot(): Promise<void> {
    for (const line of BOOT_LINES) {
      this.appendLine(escapeHtml(line), "dim");
      this.scrollToBottom();
      await sleep(150);
    }
    this.appendLine(`<pre class="banner">${escapeHtml(banner())}</pre>`);
    this.appendLine("&nbsp;");
    this.appendLine("type <span class=\"highlight\">help</span> to see what this thing can do.");
    this.appendLine("&nbsp;");
    this.inputLine.hidden = false;
    this.input.focus();
    this.scrollToBottom();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      void this.submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.navigateHistory(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.navigateHistory(1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      this.autocomplete();
    }
  }

  private navigateHistory(direction: 1 | -1): void {
    if (this.history.length === 0) return;
    this.historyIndex = Math.min(Math.max(this.historyIndex + direction, 0), this.history.length);
    this.input.value = this.history[this.historyIndex] ?? "";
    requestAnimationFrame(() => {
      this.input.selectionStart = this.input.selectionEnd = this.input.value.length;
    });
  }

  private autocomplete(): void {
    const value = this.input.value;
    if (!value || value.includes(" ")) return;
    const matches = commandNames().filter((name) => name.startsWith(value.toLowerCase()));
    if (matches.length === 1) {
      this.input.value = matches[0];
    } else if (matches.length > 1) {
      this.appendLine(`${escapeHtml(PROMPT)} ${escapeHtml(value)}`, "echo");
      this.appendLine(matches.join("  "));
      this.scrollToBottom();
    }
  }

  private async submit(): Promise<void> {
    const value = this.input.value;
    this.appendLine(`<span class="dim">${escapeHtml(PROMPT)}</span> ${escapeHtml(value)}`, "echo");

    const trimmed = value.trim();
    if (trimmed) {
      this.history.push(trimmed);
      this.historyIndex = this.history.length;
    }

    const result = runCommand(value, this.history);
    if (result.clear) {
      this.output.innerHTML = "";
    } else if (result.lines) {
      for (const line of result.lines) this.appendLine(line);
    }

    this.input.value = "";
    this.scrollToBottom();

    if (result.effect) {
      this.input.disabled = true;
      try {
        await result.effect(this.buildEffectApi());
      } finally {
        this.input.disabled = false;
        this.input.focus();
        this.scrollToBottom();
      }
    }
  }
}
