/**
 * 打包后推理冒烟测试
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.OUT_DIR || '/tmp/xiangqi-screenshots-prod';
const CHROME =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => {
  const t = m.text();
  logs.push(t);
  if (/TFJS|DouZero|推理|决策|失败|Error|error/.test(t)) console.log('C:', t);
});
page.on('pageerror', (e) => console.error('E:', e));

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.getByText('斗地主', { exact: true }).first().click();
await page.waitForTimeout(500);
await page.getByText('困难', { exact: true }).first().click();

// 等加载
for (let i = 0; i < 120; i++) {
  if (logs.some((l) => l.includes('模型加载完成') || l.includes('状态: ready'))) break;
  await page.waitForTimeout(500);
}
await page.screenshot({ path: path.join(OUT, 'prod-loaded.png'), timeout: 60000 });

// 等进入 playing 并出现 DouZero 决策（最多 90s，含叫分）
let decided = false;
for (let i = 0; i < 180; i++) {
  if (logs.some((l) => l.includes('使用 DouZero AI 决策') || l.includes('AI 推理成功'))) {
    decided = true;
    break;
  }
  if (logs.some((l) => l.includes('推理失败') || l.includes('DouZero AI 推理失败'))) {
    break;
  }
  await page.waitForTimeout(500);
}

await page.screenshot({ path: path.join(OUT, 'prod-play.png'), timeout: 60000 });

const result = {
  decided,
  hasDouZero: logs.some((l) => l.includes('TensorFlow.js 模型加载成功')),
  sample: logs.filter((l) => /DouZero|TFJS|推理|决策|失败/.test(l)).slice(-30),
};
fs.writeFileSync(path.join(OUT, 'infer-result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.hasDouZero && decided ? 0 : 2);
