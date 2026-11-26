// 역사 퀘스트 앱 로직 테스트
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppScript } = require('./helpers');

const app = loadAppScript('history-quest');
const CARDS = app('CARDS');
const EVENTS = app('EVENTS');
const TOPICS = app('TOPICS');
const GROUPS = app('GROUPS');
const cardId = app('cardId');

// 재현 가능한 난수
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('데이터: 모든 카드·사건이 범위 안의 주제이고 용어가 겹치지 않음', () => {
  const ids = new Set();
  for (const c of CARDS) {
    assert.ok(TOPICS[c[0]], `주제 없음: ${c}`);
    assert.ok(c[1] && c[2], `용어/설명 비어 있음: ${c}`);
    assert.ok(!c[2].includes(c[1]), `설명에 정답이 그대로 들어 있음: ${c[1]}`);
    const id = cardId(c);
    assert.ok(!ids.has(id), `중복 카드: ${id}`);
    ids.add(id);
  }
  for (const e of EVENTS) assert.ok(TOPICS[e[0]] && Number.isFinite(e[1]) && e[3], `사건 오류: ${e}`);
  for (const t of Object.keys(TOPICS)) {
    assert.ok(CARDS.filter((c) => c[0] === Number(t)).length >= 8, `주제 ${t} 카드가 너무 적음`);
  }
  const grouped = GROUPS.flatMap((g) => g[1]).sort((a, b) => a - b);
  assert.equal(JSON.stringify(grouped), JSON.stringify(Object.keys(TOPICS).map(Number).sort((a, b) => a - b)));
});

test('초성 힌트', () => {
  assert.equal(app('chosung')('강화도 조약'), 'ㄱㅎㄷ ㅈㅇ');
  assert.equal(app('chosung')('3B 정책'), '3B ㅈㅊ');
});

test('퀴즈: 10문제, 보기 4개, 정답이 보기 안에 한 번만', () => {
  const makeQuiz = app('makeQuiz');
  for (let seed = 1; seed <= 30; seed++) {
    const qs = makeQuiz([19, 29, 37], {}, 10, seeded(seed));
    assert.equal(qs.length, 10);
    for (const q of qs) {
      assert.equal(q.options.length, 4, q.text);
      assert.equal(new Set(q.options).size, 4, '보기 중복');
      assert.equal(q.options.filter((o) => o === q.answer).length, 1);
    }
  }
});

test('퀴즈: 한 주제만 골라도 보기 4개가 채워짐', () => {
  const qs = app('makeQuiz')([22], {}, 10, seeded(7));
  assert.ok(qs.length >= 8);
  for (const q of qs) assert.equal(new Set(q.options).size, 4);
});

test('퀴즈: 약한 카드가 먼저 출제됨', () => {
  const pool = CARDS.filter((c) => c[0] === 40);
  const levels = {};
  for (const c of pool) levels[cardId(c)] = 3;
  const weak = pool[0];
  levels[cardId(weak)] = 0;
  const qs = app('makeQuiz')([40], levels, 3, seeded(3));
  assert.ok(qs.some((q) => q.id === cardId(weak)) || qs.some((q) => q.type === 'first'));
});

test('연표: 연도가 겹치지 않는 사건 4개, 가장 먼저 일어난 일 문제', () => {
  const pickEvents = app('pickEvents');
  for (let seed = 1; seed <= 30; seed++) {
    const evs = pickEvents(EVENTS.filter((e) => [29, 30, 31].includes(e[0])), 4, seeded(seed));
    assert.equal(evs.length, 4);
    assert.equal(new Set(evs.map((e) => Math.floor(e[1]))).size, 4);
  }
  const q = app('makeQuestion')(CARDS[0], CARDS, EVENTS, 'first', seeded(9));
  const min = EVENTS.filter((e) => q.options.includes(e[3])).reduce((a, b) => (b[1] < a[1] ? b : a));
  assert.equal(q.answer, min[3]);
  assert.ok(app('isSorted')(EVENTS.slice().sort((a, b) => a[1] - b[1])));
});

test('숙련도·덱·점수', () => {
  const bump = app('bumpLevel');
  let lv = bump({}, 'a', true);
  lv = bump(lv, 'a', true); lv = bump(lv, 'a', true); lv = bump(lv, 'a', true);
  assert.equal(lv.a, 3);
  assert.equal(bump(lv, 'a', false).a, 0);
  assert.equal(app('masteryOf')(CARDS.slice(0, 2), { [cardId(CARDS[0])]: 2 }), 50);
  assert.equal(JSON.stringify(app('requeue')(['a', 'b', 'c', 'd', 'e'], 0, 3)), JSON.stringify(['b', 'c', 'd', 'a', 'e']));
  assert.equal(JSON.stringify(app('requeue')(['a', 'b'], 1, 3)), JSON.stringify(['a', 'b']));
  assert.equal(app('starsFor')(9, 10), 3);
  assert.equal(app('starsFor')(3, 10), 0);
  assert.equal(app('scoreFor')(0), 10);
  assert.equal(app('scoreFor')(10), 20);
});

test('저장 데이터 복구', () => {
  const load = app('loadState');
  const d = load('깨진 값');
  assert.equal(d.sel.length, Object.keys(TOPICS).length);
  const id = cardId(CARDS[0]);
  const s = load(JSON.stringify({ lv: { [id]: 9, 'x|없음': 1 }, wrong: [id, 'x'], sel: [19, 99], best: 50 }));
  assert.equal(s.lv[id], 3);
  assert.equal(s.lv['x|없음'], undefined);
  assert.equal(JSON.stringify(s.wrong), JSON.stringify([id]));
  assert.equal(JSON.stringify(s.sel), JSON.stringify([19]));
  assert.equal(s.best, 50);
});
