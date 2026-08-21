import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("C:\\Users\\haida\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright"));
}

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4322";
const outputDir = new URL("../qa-screenshots/", import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_BROWSER_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
});
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function inspectPage(page, label) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  expect((await page.locator("body").innerText()).trim().length > 500, `${label}: page content is unexpectedly short`);
  expect((await page.locator(".vite-error-overlay, [data-nextjs-dialog]").count()) === 0, `${label}: framework error overlay found`);
  expect((await page.locator(".secondary-nav").innerText()).includes("Source register") === false, `${label}: Source register remains in side navigation`);
  expect((await page.locator(".secondary-nav").innerText()).includes("Methodology") === false, `${label}: Methodology remains in side navigation`);
  expect((await page.locator('img[src="/assets/noa-phoenix-editorial-idle.webp"]').count()) > 0, `${label}: Noa phoenix is missing`);
  expect(await page.locator('img[src="/assets/noa-phoenix-editorial-idle.webp"]').first().evaluate((img) => img.complete && img.naturalWidth > 0), `${label}: Noa idle image failed to load`);
  expect(await page.locator('img[src="/assets/noa-phoenix-editorial-listening.webp"]').evaluate((img) => img.complete && img.naturalWidth > 0), `${label}: Noa listening image failed to load`);
  expect((await page.locator(".graph-node").count()) === 34, `${label}: expected 34 knowledge-graph records`);
  expect((await page.title()).includes("Noa Energy Atlas"), `${label}: public application name is wrong`);
  expect((await page.locator('link[rel="icon"][href="/icons/icon-32.png"]').count()) === 1, `${label}: Noa browser-tab icon is missing`);
  expect((await page.locator('link[rel="apple-touch-icon"][href="/icons/icon-180.png"]').count()) === 1, `${label}: Apple touch icon is missing`);
  expect((await page.locator('.brand-noa img[src="/icons/icon-192.png"]').count()) >= 1, `${label}: Noa is not displayed beside the product name`);
  expect((await page.locator('.graph-ledger-link[href="/relationships/"]').count()) === 1, `${label}: accessible relationship ledger entry point is missing`);
  expect((await page.locator(".relationship-alternative").count()) === 0, `${label}: clipped duplicate relationship ledger remains in the tab order`);
  await page.locator(".graph-ledger-link").focus();
  await page.keyboard.press("Tab");
  const graphFocusState = await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id, className: document.activeElement?.getAttribute("class"), visible: Boolean(document.activeElement?.getClientRects().length), inDuplicate: Boolean(document.activeElement?.closest(".relationship-alternative")) }));
  expect(graphFocusState.tag !== "BODY" && graphFocusState.visible && !graphFocusState.inDuplicate, `${label}: focus did not move from the ledger link to the next visible control (${JSON.stringify(graphFocusState)})`);
  expect(await page.locator("#graph-inspector").evaluate((element) => element.inert === true), `${label}: closed legal dossier remains in the tab order`);
  expect(await page.locator("#noa-panel").evaluate((element) => element.inert === true), `${label}: closed Noa panel remains in the tab order`);
  await page.screenshot({ path: fileURLToPath(new URL(`../qa-screenshots/${label}-graph.png`, import.meta.url)), fullPage: false });

  const initialView = await page.locator("#knowledge-graph").getAttribute("viewBox");
  await page.locator('[data-graph-action="zoom-in"]').click();
  await page.waitForTimeout(500);
  const zoomedView = await page.locator("#knowledge-graph").getAttribute("viewBox");
  expect(zoomedView !== initialView, `${label}: zoom-in button did not change the map view`);
  await page.locator('[data-graph-action="reset"]').click();
  await page.waitForTimeout(500);
  expect((await page.locator("#knowledge-graph").getAttribute("viewBox")) === "0 0 1800 1100", `${label}: map reset did not restore the full view`);
  await page.locator(".graph-node").first().click();
  await page.waitForTimeout(500);
  expect((await page.locator("#graph-inspector").getAttribute("data-open")) === "true", `${label}: graph node did not open the legal dossier`);
  expect(await page.locator("#graph-inspector").isVisible(), `${label}: legal dossier opened in state but is not visible`);
  expect(await page.locator("#graph-inspector").evaluate((element) => element.inert === false), `${label}: open legal dossier is still inert`);
  expect((await page.locator("#inspector-engineering").innerText()).length > 20, `${label}: engineering lens is empty`);
  expect((await page.locator("#inspector-economics").innerText()).length > 20, `${label}: economics lens is empty`);
  expect((await page.locator("#inspector-open").getAttribute("href"))?.startsWith("/instruments/") === true, `${label}: full legal record link is broken`);
  await page.waitForTimeout(900);
  await page.locator(".inspector-close").click();
  expect(await page.locator("#graph-inspector").evaluate((element) => element.inert === true), `${label}: closed legal dossier did not become inert`);
  expect((await page.evaluate(() => document.activeElement?.classList.contains("graph-node"))) === true, `${label}: dossier close did not restore focus to its graph node`);
  const movableNode = page.locator(".graph-node").first();
  const movableId = await movableNode.getAttribute("data-node");
  const connectedEdge = page.locator(`.edge-group[data-from="${movableId}"], .edge-group[data-to="${movableId}"]`).first();
  const edgeBeforeMove = await connectedEdge.locator(".graph-edge").getAttribute("d");
  const nodeBox = await movableNode.boundingBox();
  if (nodeBox) {
    await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 65, nodeBox.y + nodeBox.height / 2 + 30, { steps: 6 });
    await page.mouse.up();
  }
  expect(Boolean(await movableNode.getAttribute("transform")), `${label}: graph bubble could not be moved`);
  expect((await connectedEdge.locator(".graph-edge").getAttribute("d")) !== edgeBeforeMove, `${label}: neuron link did not follow the moved bubble`);
  expect((await page.locator("#graph-inspector").getAttribute("data-open")) !== "true", `${label}: dragging a bubble accidentally opened its dossier`);
  await page.locator('[data-graph-filter="Petroleum"]').click();
  expect(Number(await page.locator("#visible-node-count").innerText()) > 0 && Number(await page.locator("#visible-node-count").innerText()) < 34, `${label}: category filter did not narrow the map`);
  await page.locator("[data-graph-clear]").click();
  expect((await page.locator("#visible-node-count").innerText()) === "34", `${label}: clear-map control did not restore all records`);
  await page.locator(".noa-launcher").click();
  expect((await page.locator(".noa-panel").getAttribute("data-open")) === "true", `${label}: Noa panel did not open`);
  expect(await page.locator("#noa-panel").evaluate((element) => element.inert === false), `${label}: open Noa panel is still inert`);
  await page.waitForTimeout(350);
  await page.screenshot({ path: fileURLToPath(new URL(`../qa-screenshots/${label}-noa.png`, import.meta.url)), fullPage: false });
  await page.locator("#noa-close").click();
  expect(await page.locator("#noa-panel").evaluate((element) => element.inert === true), `${label}: closed Noa panel did not become inert`);
  expect((await page.evaluate(() => document.activeElement?.classList.contains("noa-launcher"))) === true, `${label}: Noa close did not restore launcher focus`);

  const themeButton = page.locator(".view-switcher .theme-toggle");
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await themeButton.click();
  const toggledTheme = await page.locator("html").getAttribute("data-theme");
  expect(toggledTheme !== initialTheme, `${label}: theme control did not change theme`);
  await page.reload({ waitUntil: "networkidle" });
  expect((await page.locator("html").getAttribute("data-theme")) === toggledTheme, `${label}: theme preference did not persist after reload`);

  await page.locator(".view-switcher .language-toggle").click();
  expect((await page.locator("html").getAttribute("lang")) === "ar", `${label}: language control did not set Arabic`);
  expect((await page.locator("html").getAttribute("dir")) === "rtl", `${label}: Arabic did not set RTL direction`);
  expect((await page.locator(".view-switcher .language-toggle .locale-label").innerText()).trim() === "EN", `${label}: language control label did not switch to EN`);

  await page.goto(`${baseUrl}/updates/`, { waitUntil: "networkidle" });
  expect((await page.locator(".briefing-avatar img").count()) === 1, `${label}: Noa briefing avatar is missing`);
  expect((await page.locator("html").getAttribute("lang")) === "ar", `${label}: Arabic preference did not persist between routes`);
  expect(/August|July|June|May|April|March|February|January|Aug|Jul|Jun/.test(await page.locator(".briefing-meta, .briefing-card-top").allInnerTexts().then((items) => items.join(" "))) === false, `${label}: Arabic briefing still contains English month names`);
  await page.screenshot({ path: fileURLToPath(new URL(`../qa-screenshots/${label}.png`, import.meta.url)), fullPage: true });
  await page.goto(`${baseUrl}/relationships/`, { waitUntil: "networkidle" });
  expect((await page.locator(".relationship-table tbody tr").count()) === 38, `${label}: relationship ledger is incomplete`);
  expect((await page.locator('.relationship-table td[data-label][data-label-ar]').count()) === 152, `${label}: relationship ledger cells lack responsive bilingual labels`);
  await page.screenshot({ path: fileURLToPath(new URL(`../qa-screenshots/${label}-relationships.png`, import.meta.url)), fullPage: true });
  expect(errors.length === 0, `${label}: browser errors: ${errors.join(" | ")}`);

  const manifest = await page.evaluate(async () => await (await fetch("/manifest.webmanifest")).json());
  expect(manifest.short_name === "Noa Energy Atlas", `${label}: PWA short name is wrong`);
  expect(manifest.icons.some((icon) => icon.src === "/icons/icon-512-maskable.png" && icon.purpose === "maskable"), `${label}: maskable PWA icon is missing`);
  for (const icon of manifest.icons) expect(await page.evaluate(async (src) => (await fetch(src)).ok, icon.src), `${label}: PWA icon failed to load: ${icon.src}`);

  const widthState = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widthState.scroll <= widthState.client + 1, `${label}: horizontal overflow (${widthState.scroll}px > ${widthState.client}px)`);
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await inspectPage(desktop, "desktop-updates-arabic-dark");

const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
await mobile.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
expect((await mobile.locator("#knowledge-graph").getAttribute("preserveAspectRatio")) === "xMidYMid meet", "mobile: graph does not use fit-all framing");
expect(await mobile.locator(".mobile-language-toggle, .mobile-lang").isVisible(), "mobile: language control is not visible");
expect(await mobile.locator(".mobile-theme").isVisible(), "mobile: theme control is not visible");
await mobile.locator(".mobile-lang").click();
expect((await mobile.locator("html").getAttribute("lang")) === "ar", "mobile: language control did not set Arabic");
const mobileThemeBefore = await mobile.locator("html").getAttribute("data-theme");
await mobile.locator(".mobile-theme").click();
expect((await mobile.locator("html").getAttribute("data-theme")) !== mobileThemeBefore, "mobile: theme control did not change theme");
await mobile.locator(".nav-toggle").click();
expect((await mobile.locator(".nav-toggle").getAttribute("aria-expanded")) === "true", "mobile: navigation did not open");
await mobile.locator(".sidebar-scrim").click({ force: true });
expect((await mobile.locator(".nav-toggle").getAttribute("aria-expanded")) === "false", "mobile: navigation did not close");
await mobile.locator('[data-graph-action="zoom-out"]').click();
await mobile.waitForTimeout(500);
const zoomedOutWidth = Number((await mobile.locator("#knowledge-graph").getAttribute("viewBox")).split(" ")[2]);
expect(zoomedOutWidth > 1800, `mobile: extended zoom-out did not exceed the home view (${zoomedOutWidth})`);
await mobile.locator('[data-graph-action="reset"]').click();
await mobile.waitForTimeout(500);
await mobile.locator(".graph-node").first().click();
expect((await mobile.locator("#graph-inspector").getAttribute("data-open")) === "true", "mobile: selected law did not open its dossier");
await mobile.screenshot({ path: fileURLToPath(new URL("../qa-screenshots/mobile-home-arabic-dossier.png", import.meta.url)), fullPage: true });
await mobile.locator(".inspector-close").click();

const beforePinch = (await mobile.locator("#knowledge-graph").getAttribute("viewBox")).split(" ").map(Number);
const session = await mobile.context().newCDPSession(mobile);
await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 110, y: 350, id: 1 }, { x: 265, y: 350, id: 2 }] });
await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 65, y: 350, id: 1 }, { x: 310, y: 350, id: 2 }] });
await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await mobile.waitForTimeout(100);
const afterPinch = (await mobile.locator("#knowledge-graph").getAttribute("viewBox")).split(" ").map(Number);
expect(afterPinch[2] < beforePinch[2], `mobile: pinch-out did not zoom the graph (${beforePinch[2]} → ${afterPinch[2]})`);
const mobileWidth = await mobile.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
expect(mobileWidth.scroll <= mobileWidth.client + 1, `mobile: horizontal overflow (${mobileWidth.scroll}px > ${mobileWidth.client}px)`);
await mobile.screenshot({ path: fileURLToPath(new URL("../qa-screenshots/mobile-home-arabic.png", import.meta.url)), fullPage: true });
await mobile.goto(`${baseUrl}/updates/`, { waitUntil: "networkidle" });
const mobileFilterSizes = await mobile.locator(".briefing-filter").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
expect(mobileFilterSizes.every((height) => height >= 40), `mobile: one or more update filters are too small (${JSON.stringify(mobileFilterSizes)})`);
await mobile.screenshot({ path: fileURLToPath(new URL("../qa-screenshots/mobile-updates-arabic.png", import.meta.url)), fullPage: true });
await mobile.goto(`${baseUrl}/relationships/`, { waitUntil: "networkidle" });
expect((await mobile.locator('.relationship-table td[data-label][data-label-ar]').count()) === 152, "mobile: relationship ledger cells are not bilingually labelled");
await mobile.screenshot({ path: fileURLToPath(new URL("../qa-screenshots/mobile-relationships-arabic.png", import.meta.url)), fullPage: true });
await mobile.goto(`${baseUrl}/instruments/`, { waitUntil: "networkidle" });
const statusSizes = await mobile.locator(".status-pill").evaluateAll((items) => items.slice(0, 8).map((item) => ({ width: item.getBoundingClientRect().width, height: item.getBoundingClientRect().height })));
expect(statusSizes.every(({ height }) => height <= 40), `mobile: one or more status badges are oversized (${JSON.stringify(statusSizes)})`);
expect(statusSizes.every(({ width }) => width < 210), `mobile: one or more status badges are too wide (${JSON.stringify(statusSizes)})`);
await mobile.screenshot({ path: fileURLToPath(new URL("../qa-screenshots/mobile-instrument-statuses.png", import.meta.url)), fullPage: true });

const landscape = await browser.newPage({ viewport: { width: 812, height: 375 }, reducedMotion: "reduce" });
await landscape.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
const landscapeWidth = await landscape.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
expect(landscapeWidth.scroll <= landscapeWidth.client + 1, `landscape: horizontal overflow (${landscapeWidth.scroll}px > ${landscapeWidth.client}px)`);
expect(await landscape.locator("#knowledge-graph").isVisible(), "landscape: knowledge graph is not visible");

await browser.close();

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "PASS",
  checks: [
    "content and overlays",
    "side-menu removals",
    "Noa image loading and public naming",
    "Noa brand lockup and browser-tab icon",
    "34-node graph, filters, inspector and engineering/economic lenses",
    "zoom, reset and mobile two-finger pinch",
    "fit-all mobile framing and extended zoom-out",
    "draggable bubbles with live-following neuron links",
    "Noa panel and mobile navigation",
    "PWA manifest, Apple touch icon and maskable icon",
    "desktop theme toggle and persistence",
    "desktop Arabic and RTL persistence",
    "updates briefing mascot",
    "mobile language and theme controls",
    "compact semantic instrument-status badges",
    "desktop, mobile and reduced-motion landscape overflow",
    "browser console errors"
  ]
}, null, 2));
