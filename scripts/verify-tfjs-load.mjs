/**
 * 浏览器验证：斗地主人机 TensorFlow.js 模型加载
 * 用法: node scripts/verify-tfjs-load.mjs
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5176';
const OUT = process.env.OUT_DIR || '/tmp/xiangqi-screenshots';
const CHROME =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

fs.mkdirSync(OUT, { recursive: true });

const logs = [];
const errors = [];

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.on('console', (msg) => {
  const text = msg.text();
  logs.push(`[${msg.type()}] ${text}`);
  console.log('CONSOLE:', text);
});
page.on('pageerror', (err) => {
  errors.push(String(err));
  console.error('PAGEERROR:', err);
});

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.screenshot({ path: path.join(OUT, '01-home.png'), fullPage: true });

// 主菜单点「斗地主」
const dd = page.getByText('斗地主', { exact: true });
await dd.first().click({ timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, '02-doudizhu-menu.png'), fullPage: true });

// 人机对战：点「困难」或「普通」或「开始」
const hard = page.getByText('困难', { exact: true });
if (await hard.count()) {
  await hard.first().click();
} else {
  const quick = page.getByText('快速开始', { exact: true });
  await quick.first().click();
}

await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, '03-loading.png'), fullPage: false, timeout: 60000 });

// 等待 TFJS 成功或失败（最多 120s）
const deadline = Date.now() + 120000;
let loaded = false;
let failed = false;
while (Date.now() < deadline) {
  const joined = logs.join('\n');
  if (
    joined.includes('TensorFlow.js 模型加载成功') ||
    joined.includes('所有 TensorFlow.js 模型加载完成') ||
    joined.includes('[ModelLoadingIndicator] ✓ TensorFlow.js 模型加载成功')
  ) {
    loaded = true;
    break;
  }
  if (
    joined.includes('TensorFlow.js 模型加载失败') ||
    joined.includes('[ModelLoadingIndicator] TensorFlow.js 模型加载失败')
  ) {
    failed = true;
    break;
  }
  // UI 上出现 DouZero 状态
  const readyBadge = page.getByText('DouZero', { exact: true });
  if (await readyBadge.count()) {
    loaded = true;
    break;
  }
  await page.waitForTimeout(500);
}

// 额外等待 AI 推理日志（最多 30s）
const inferDeadline = Date.now() + 30000;
let inferred = false;
let inferError = false;
while (Date.now() < inferDeadline) {
  const joined = logs.join('\n');
  if (joined.includes('AI 推理成功')) {
    inferred = true;
    break;
  }
  if (joined.includes('推理失败') || joined.includes('predict')) {
    // 仅标记，不立刻失败
  }
  const pageErrors = errors.join('\n');
  if (pageErrors.includes('Error')) {
    inferError = true;
  }
  await page.waitForTimeout(500);
}

await page.screenshot({ path: path.join(OUT, '05-ai-turn.png'), fullPage: false, timeout: 60000 });

const hasDouZeroBadge = (await page.getByText('DouZero', { exact: true }).count()) > 0;

const result = {
  loaded,
  failed,
  inferred,
  hasDouZeroBadge,
  errors,
  keyLogs: logs.filter(
    (l) =>
      l.includes('TFJS') ||
      l.includes('TensorFlow') ||
      l.includes('ModelLoading') ||
      l.includes('DouZero') ||
      l.includes('推理') ||
      l.includes('error') ||
      l.includes('Error')
  ),
};

fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(result, null, 2));
console.log('\n=== RESULT ===');
console.log(JSON.stringify(result, null, 2));

await browser.close();
process.exit(loaded && !failed && hasDouZeroBadge ? 0 : 1);
