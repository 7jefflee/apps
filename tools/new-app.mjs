// 새 앱 폴더 만들기
// 사용: node tools/new-app.mjs <app-id> "<표시 이름>" ["<한 줄 설명>"]
// 예:   node tools/new-app.mjs gugudan "냥 구구단" "고양이와 함께하는 구구단 게임"
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [id, name, description = ''] = process.argv.slice(2);

if (!id || !name) {
  console.error('사용: node tools/new-app.mjs <app-id> "<표시 이름>" ["<설명>"]');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || ['tools', 'tests', 'node_modules'].includes(id)) {
  console.error('app-id는 영문 소문자·숫자·하이픈(kebab-case)만 가능합니다.');
  process.exit(1);
}
const dir = join(root, id);
if (existsSync(dir)) {
  console.error(`${id}/ 폴더가 이미 있습니다.`);
  process.exit(1);
}

cpSync(join(root, '_template'), dir, { recursive: true });

const fill = (s) => s.replaceAll('__APP_ID__', id).replaceAll('__APP_NAME__', name);
for (const f of ['index.html', 'manifest.json']) {
  const p = join(dir, f);
  writeFileSync(p, fill(readFileSync(p, 'utf8')));
}
const mPath = join(dir, 'manifest.json');
const manifest = JSON.parse(readFileSync(mPath, 'utf8'));
if (description) manifest.description = description;
writeFileSync(mPath, JSON.stringify(manifest, null, 2) + '\n');

const listPath = join(root, 'apps.json');
const list = JSON.parse(readFileSync(listPath, 'utf8'));
list.push({ id, name, description });
writeFileSync(listPath, JSON.stringify(list, null, 2) + '\n');

writeFileSync(
  join(root, 'tests', `${id}.test.js`),
  `// ${name} 앱 로직 테스트
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppScript } = require('./helpers');

const app = loadAppScript('${id}');

test('${id}: 시작 화면 로직 (앱을 만들면 실제 로직 테스트로 교체)', () => {
  assert.equal(app('nextCount')(1), 2);
});
`
);

execFileSync(process.execPath, [join(root, 'tools', 'make-icons.mjs'), id], { stdio: 'inherit' });
console.log(`완료: ${id}/ 생성, apps.json 등록, tests/${id}.test.js 생성`);
console.log(`주소: https://<owner>.github.io/<repo>/${id}/`);
