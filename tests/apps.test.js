// 모든 앱 폴더 공통 검사. 실행: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { root, inlineScripts, loadAppScript } = require('./helpers');

const list = JSON.parse(fs.readFileSync(path.join(root, 'apps.json'), 'utf8'));
const appDirs = fs.readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'manifest.json')))
  .map((d) => d.name)
  .filter((n) => n !== '_template');

test('apps.json과 앱 폴더가 일치', () => {
  const ids = list.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'apps.json에 중복 id');
  for (const a of list) {
    assert.ok(a.id && a.name, 'apps.json 항목에 id, name 필요');
    assert.ok(appDirs.includes(a.id), `apps.json의 ${a.id}/ 폴더가 없음`);
  }
  for (const d of appDirs) assert.ok(ids.includes(d), `${d}/ 가 apps.json에 없음 (tools/new-app.mjs로 만들 것)`);
});

for (const id of ['_template', ...appDirs]) {
  const read = (f) => fs.readFileSync(path.join(root, id, f), 'utf8');

  test(`${id}: 앱 구조`, () => {
    const html = read('index.html');
    const sw = read('sw.js');
    const manifest = JSON.parse(read('manifest.json'));

    assert.match(html, /<meta name="viewport"/);
    assert.match(html, /<link rel="manifest" href="\.\/manifest\.json">/);
    assert.match(html, /serviceWorker\.register\('\.\/sw\.js'\)/);
    assert.doesNotMatch(html, /<script[^>]+src="https?:/, '외부 CDN 스크립트 금지(오프라인에서 깨짐)');
    assert.doesNotMatch(html, /src="\/|href="\//, '절대경로(/...) 금지 — ./ 상대경로를 쓸 것');
    for (const code of inlineScripts(html)) new vm.Script(code); // 문법 검사

    if (id !== '_template') {
      assert.doesNotMatch(html + read('manifest.json'), /__APP_(ID|NAME)__/, '자리표시자가 남아 있음');
    }

    const appVer = loadAppScript(id)('APP_VERSION');
    const swVer = /const VERSION = '([^']+)'/.exec(sw)?.[1];
    assert.equal(appVer, swVer, 'index.html APP_VERSION과 sw.js VERSION을 같이 올려야 함');

    const assets = [.../const ASSETS = \[([\s\S]*?)\]/.exec(sw)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    for (const f of assets) {
      const p = f === './' ? 'index.html' : f.replace(/^\.\//, '');
      assert.ok(fs.existsSync(path.join(root, id, p)), `sw.js ASSETS의 ${f} 파일이 없음`);
    }

    for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) assert.ok(manifest[k], `manifest.${k} 필요`);
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.scope, './');
    for (const icon of manifest.icons) {
      const buf = fs.readFileSync(path.join(root, id, icon.src.replace(/^\.\//, '')));
      assert.equal(buf.subarray(1, 4).toString(), 'PNG', `${icon.src}은 PNG여야 함`);
      assert.equal(`${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`, icon.sizes, `${icon.src} 크기 불일치`);
    }
  });
}
