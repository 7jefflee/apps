// <앱>/icon.svg → <앱>/icon-192.png, <앱>/icon-512.png
// 사용: node tools/make-icons.mjs <app-id>
// Playwright(클라우드 환경에 기본 설치)가 있으면 SVG를 그대로 렌더링하고,
// 없으면 SVG의 첫 두 fill 색으로 "배경 + 원" 아이콘을 만든다.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const appId = process.argv[2];
if (!appId) { console.error('사용: node tools/make-icons.mjs <app-id>'); process.exit(1); }
const root = join(dirname(fileURLToPath(import.meta.url)), '..', appId);
const svg = readFileSync(join(root, 'icon.svg'), 'utf8');
const SIZES = [192, 512];

async function withPlaywright() {
  let chromium;
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    return false;
  }
  const browser = await chromium.launch();
  try {
    for (const size of SIZES) {
      const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
      const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
      await page.setContent(`<html><body style="margin:0">${sized}</body></html>`);
      await page.screenshot({ path: join(root, `icon-${size}.png`), clip: { x: 0, y: 0, width: size, height: size } });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return true;
}

function hex(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(c || '');
  const v = m ? parseInt(m[1], 16) : 0x888888;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function fallbackPng(size, bg, fg) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const r = size * 0.3, cx = size / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cx);
      const a = Math.min(1, Math.max(0, r - d + 0.5)); // 가장자리 안티앨리어싱
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(bg[i] * (1 - a) + fg[i] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8bit RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (await withPlaywright()) {
  console.log('Playwright로 icon.svg를 렌더링했습니다.');
} else {
  const fills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]);
  const bg = hex(fills[0]), fg = hex(fills[1] || '#ffffff');
  for (const size of SIZES) writeFileSync(join(root, `icon-${size}.png`), fallbackPng(size, bg, fg));
  console.log('Playwright가 없어 단순 아이콘(배경+원)을 만들었습니다.');
}
