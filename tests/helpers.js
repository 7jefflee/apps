const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function inlineScripts(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

// <앱>/index.html의 스크립트를 DOM 없이 실행해서 순수 함수·상수를 꺼낸다.
// 사용: const app = loadAppScript('gugudan'); app('nextCount')(1)
// (DOM 코드는 `if (typeof document !== 'undefined') main();` 으로 감싸 두어야 한다)
function loadAppScript(appId) {
  const html = fs.readFileSync(path.join(root, appId, 'index.html'), 'utf8');
  const ctx = vm.createContext({ console });
  for (const code of inlineScripts(html)) vm.runInContext(code, ctx);
  return (name) => vm.runInContext(name, ctx);
}

module.exports = { root, inlineScripts, loadAppScript };
