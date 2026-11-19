// Saca las capturas (escritorio y celular) de los diseños de muestra de tree service para la landing /website-tree.
// Uso: con el servidor de desarrollo corriendo (npm run dev), `node scripts/capture-tree-examples.mjs [http://localhost:5173]`.
// Salida: public/website-tree/ejemplo-N-desktop.jpg y ejemplo-N-mobile.jpg
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT = new URL("../public/website-tree/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const n of [1, 2, 3, 4, 5, 6]) {
  for (const [kind, viewport, scale, height] of [
    ["desktop", { width: 1366, height: 860 }, 1, 860],
    ["mobile", { width: 390, height: 844 }, 2, 844],
  ]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, isMobile: kind === "mobile", hasTouch: kind === "mobile" });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/websites/tree-ejemplo-${n}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}ejemplo-${n}-${kind}.jpg`, type: "jpeg", quality: 84, clip: { x: 0, y: 0, width: viewport.width, height } });
    await ctx.close();
    console.log("ok", n, kind);
  }
}
await browser.close();
