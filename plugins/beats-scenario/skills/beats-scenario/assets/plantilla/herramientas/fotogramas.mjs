// Captura animaciones a mitad: navega a un beat, avanza y fotografía tras unos ms.
// Uso: node --experimental-websocket herramientas/fotogramas.mjs /tmp/perfil-chrome carpeta_salida 3.2:600 4.1:900
// Cada 3.2:600 significa: ir al beat 3.2, avanzar uno y fotografiar a los 600 ms. Sale 3.2-600.png.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
const pres = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "index.html")).href;
const out = process.argv[3];
mkdirSync(out, { recursive: true });
const chrome = spawn("google-chrome", ["--headless=new", "--remote-debugging-port=9334", "--window-size=1920,1080",
  "--user-data-dir=" + process.argv[2], "about:blank"], { stdio: "ignore" });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
await esperar(1500);
let id = 0; const pend = new Map();
async function conectar(u) {
  const ws = new WebSocket(u); await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  return (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
}
const pag = (await (await fetch("http://127.0.0.1:9334/json")).json()).find((t) => t.type === "page");
const enviar = await conectar(pag.webSocketDebuggerUrl);
await enviar("Page.enable");
await enviar("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
const foto = async (n) => { const r = await enviar("Page.captureScreenshot", { format: "png" }); writeFileSync(`${out}/${n}.png`, Buffer.from(r.result.data, "base64")); };
const der = async () => { await enviar("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 }); await enviar("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 }); };
for (const arg of process.argv.slice(4)) {
  const [desde, ms] = arg.split(":"), n = desde + "-" + ms;
  await enviar("Page.navigate", { url: pres + "#" + desde }); await esperar(1200);
  await der(); await esperar(Number(ms)); await foto(n);
}
chrome.kill(); process.exit(0);
