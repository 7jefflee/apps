// 실행: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.json'));

function inlineScripts() {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

// index.html의 스크립트를 DOM 없이 실행해서 순수 함수·상수를 꺼낸다.
// 사용: const app = loadAppScript(); app('nextCount')(1)
function loadAppScript() {
  const ctx = vm.createContext({ console });
  for (const code of inlineScripts()) vm.runInContext(code, ctx);
  return (name) => vm.runInContext(name, ctx);
}

function pngSize(file) {
  const buf = fs.readFileSync(path.join(root, file));
  assert.equal(buf.subarray(1, 4).toString(), 'PNG', `${file}은 PNG여야 함`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test('index.html 기본 요소', () => {
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.json">/);
  assert.match(html, /serviceWorker\.register\('\.\/sw\.js'\)/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/, '외부 CDN 스크립트 금지(오프라인에서 깨짐)');
});

test('인라인 스크립트 문법 오류 없음', () => {
  for (const code of inlineScripts()) new vm.Script(code);
});

test('APP_VERSION과 sw.js VERSION이 같다', () => {
  const app = loadAppScript()('APP_VERSION');
  const swVer = /const VERSION = '([^']+)'/.exec(sw)?.[1];
  assert.ok(swVer, 'sw.js에 VERSION 필요');
  assert.equal(app, swVer, 'index.html APP_VERSION과 sw.js VERSION을 같이 올려야 함');
});

test('sw.js ASSETS 파일이 모두 존재', () => {
  const list = /const ASSETS = \[([\s\S]*?)\]/.exec(sw)[1];
  const files = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const f of files) {
    const p = f === './' ? 'index.html' : f.replace(/^\.\//, '');
    assert.ok(fs.existsSync(path.join(root, p)), `ASSETS의 ${f} 파일이 없음`);
  }
});

test('manifest 필수 항목과 아이콘', () => {
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) assert.ok(manifest[k], `manifest.${k} 필요`);
  for (const icon of manifest.icons) {
    const [w, h] = pngSize(icon.src.replace(/^\.\//, ''));
    assert.equal(`${w}x${h}`, icon.sizes, `${icon.src} 크기 불일치`);
  }
});

// ── 앱 로직 테스트 (앱을 만들면 여기에 추가/교체) ──
test('앱 로직: nextCount / loadState', () => {
  const app = loadAppScript();
  assert.equal(app('nextCount')(1), 2);
  assert.equal(app('nextCount')(undefined), 1);
  assert.deepEqual({ ...app('loadState')('{"count":5}') }, { count: 5 });
  assert.deepEqual({ ...app('loadState')('깨진값') }, { count: 0 });
});
