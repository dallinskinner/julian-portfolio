import "./style.css";
import { Terminal } from "./terminal";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) new Terminal(app);
