import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chrome) throw new Error("未找到 Chrome/Edge，请通过 CHROME_PATH 指定浏览器路径。");
const output = process.env.VISUAL_OUTPUT || path.resolve("test-results/visual");
const baseUrl = process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173";
fs.mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const report = [];

async function inspect(page, name) {
  await page.waitForLoadState("networkidle");
  const result = await page.evaluate(() => {
    const images = [...document.images].map((img) => ({ alt: img.alt, width: img.naturalWidth, height: img.naturalHeight }));
    const overflow = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && rect.width > 0 && el.scrollWidth > el.clientWidth + 2;
      })
      .slice(0, 8)
      .map((el) => ({ tag: el.tagName, className: el.className, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    return { bodyScrollWidth: document.body.scrollWidth, viewport: innerWidth, images, overflow };
  });
  const file = path.join(output, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.push({ name, ...result, screenshotBytes: fs.statSync(file).size });
}

async function finishQuiz(page) {
  await page.getByLabel("怎么称呼你").fill("小珀");
  await page.getByRole("button", { name: /开始分析/ }).click();
  await page.getByRole("button", { name: /暗沉倦态/ }).click();
  await page.getByRole("button", { name: /继续/ }).click();
  await page.getByRole("button", { name: /状态稳定/ }).click();
  await page.getByRole("button", { name: /继续/ }).click();
  await page.getByRole("button", { name: /经常熬夜/ }).click();
  await page.getByRole("button", { name: /继续/ }).click();
  await page.getByRole("button", { name: /生成我的方案/ }).click();
  await page.getByText("YOUR SKIN SIGNAL").waitFor({ timeout: 10000 });
}

for (const target of [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
]) {
  const page = await browser.newPage({ viewport: target.viewport, deviceScaleFactor: 1 });
  await page.goto(baseUrl);
  await inspect(page, `${target.name}-intro`);
  await finishQuiz(page);
  await inspect(page, `${target.name}-result`);
  if (target.name === "desktop") {
    await page.getByRole("button", { name: /保存方案/ }).click();
    await page.getByRole("button", { name: /领取 7 日体验装/ }).click();
    await page.getByRole("button", { name: "有帮助" }).click();
    await page.getByRole("button", { name: "运营洞察" }).click();
    await page.getByText("196 份反馈").waitFor();
    await inspect(page, "desktop-insights");
  }
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));

const failures = report.filter((item) => item.bodyScrollWidth > item.viewport + 2 || item.images.some((image) => image.width === 0) || item.screenshotBytes < 10000);
if (failures.length) {
  console.error("Visual checks failed:", failures.map((item) => item.name).join(", "));
  process.exit(1);
}
