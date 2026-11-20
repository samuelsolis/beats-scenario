// Recorre la presentación entera (adelante y atrás), prueba la ventana del presentador y lista:
//   - errores de consola,
//   - beats sin nota,
//   - lo que se sale del escenario o de su panel (lo que en pantalla se ve cortado).
// Uso: node --experimental-websocket herramientas/recorrer.mjs /tmp/perfil-chrome
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
const pres = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "index.html")).href;
const chrome = spawn("google-chrome", ["--headless=new", "--remote-debugging-port=9333", "--window-size=1920,1080",
  "--user-data-dir=" + process.argv[2], "about:blank"], { stdio: "ignore" });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
await esperar(1500);
let id = 0; const pend = new Map(); const errores = [];
async function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errores.push(m.params.args.map(a => a.value || a.description).join(" "));
  });
  const enviar = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  return { ws, enviar };
}
const lista = await (await fetch("http://127.0.0.1:9333/json")).json();
const pag = lista.find((t) => t.type === "page");
const { enviar } = await conectar(pag.webSocketDebuggerUrl);
await enviar("Runtime.enable");
await enviar("Page.enable");
await enviar("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
const evaluar = async (expr) => (await enviar("Runtime.evaluate", { expression: expr, returnByValue: true })).result.result.value;
const tecla = async (key, code, kc) => {
  await enviar("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: kc });
  await enviar("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: kc });
};
const DERECHA = ["ArrowRight", "ArrowRight", 39], IZQUIERDA = ["ArrowLeft", "ArrowLeft", 37];

// Qué se sale en el beat actual. Los SVG se miran enteros, no por dentro.
const SALIDAS = `(() => {
  const esc = document.getElementById("escenario").getBoundingClientRect();
  const fuera = (r, c) => r.right > c.right + 1 || r.bottom > c.bottom + 1 || r.left < c.left - 1 || r.top < c.top - 1;
  const nombre = (n) => n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (typeof n.className === "string" && n.className ? "." + n.className.split(" ")[0] : "");
  // Solo la pieza más externa: si una tabla se sale, sus filas no se repiten en la lista.
  const res = [], marcados = new Set();
  document.querySelectorAll(".escena.activa *").forEach((n) => {
    if (n.closest(".oculto") || n.closest(".nota") || n.closest("[data-sale]") || (n.closest("svg") && n.tagName.toLowerCase() !== "svg")) return;
    if (marcados.has(n.parentElement)) { marcados.add(n); return; }
    const r = n.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const panel = n.parentElement && n.parentElement.closest(".panel");
    if (fuera(r, esc)) res.push(nombre(n) + " se sale del escenario");
    else if (panel && fuera(r, panel.getBoundingClientRect())) res.push(nombre(n) + " se sale de su panel");
    else return;
    marcados.add(n);
  });
  return res.slice(0, 6);
})()`;

const res = { beatsTotales: 0, sinNota: [], salidas: {} };
// hacia delante, sin transiciones, mirando cada beat
await enviar("Page.navigate", { url: pres + "?captura=1#1.1" }); await esperar(1200);
let ultimo = "";
for (let i = 0; i < 1000; i++) {
  const h = await evaluar("location.hash");
  if (h === ultimo) break;
  ultimo = h; res.beatsTotales++;
  await esperar(30);
  const s = await evaluar(SALIDAS);
  if (s.length) res.salidas[h] = s;
  const conNota = await evaluar(`(() => { const [, b] = location.hash.slice(1).split("."); return !!document.querySelector('.escena.activa .nota[data-beat="' + b + '"]'); })()`);
  if (!conNota) res.sinNota.push(h);
  await tecla(...DERECHA); await esperar(30);
}
res.ultimoHash = ultimo;
// hacia atrás hasta el principio
for (let i = 0; i < 1000; i++) { await tecla(...IZQUIERDA); await esperar(30); if (await evaluar("location.hash") === "#1.1") break; }
res.vueltaAtras = await evaluar("location.hash");
// presentador
await enviar("Page.navigate", { url: pres + "#1.1" }); await esperar(1200);
await tecla("p", "KeyP", 80); await esperar(2500);
const lista2 = await (await fetch("http://127.0.0.1:9333/json")).json();
const p2 = lista2.find((t) => t.type === "page" && t.url.includes("presentador.html"));
if (p2) {
  const c2 = await conectar(p2.webSocketDebuggerUrl);
  const ev2 = async (e) => (await c2.enviar("Runtime.evaluate", { expression: e, returnByValue: true })).result.result.value;
  res.presentadorPosicion = await ev2("document.getElementById('posicion').textContent");
  await c2.enviar("Runtime.evaluate", { expression: "document.getElementById('b-siguiente').click()" });
  await esperar(800);
  res.principalTrasBotonPresentador = await evaluar("location.hash");
} else res.presentador = "no se abrió";
res.errores = errores;
console.log(JSON.stringify(res, null, 2));
chrome.kill();
process.exit(0);
