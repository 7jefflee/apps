// 안녕 샘플 앱 로직 테스트
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppScript } = require('./helpers');

const app = loadAppScript('hello');

test('hello: 시작 화면 로직 (앱을 만들면 실제 로직 테스트로 교체)', () => {
  assert.equal(app('nextCount')(1), 2);
});
