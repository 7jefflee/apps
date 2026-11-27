// 역사 퀘스트 앱 로직 테스트
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppScript } = require('./helpers');

const app = loadAppScript('history-quest');
const CARDS = app('CARDS');
const EVENTS = app('EVENTS');
const UNITS = app('UNITS');
const UNIT_INFO = app('UNIT_INFO');
const ALL_UNITS = app('ALL_UNITS');
const cardId = app('cardId');
const json = (v) => JSON.stringify(v); // vm 컨텍스트 배열 비교용

// 재현 가능한 난수
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('단원 구조: 대단원 6개, 모든 주제가 한 번씩 들어 있음', () => {
  assert.equal(app('BIGS').length, 6);
  assert.equal(json([...ALL_UNITS].sort()), json(Object.keys(UNITS).sort()));
  assert.equal(new Set(ALL_UNITS).size, ALL_UNITS.length);
  assert.equal(app('MID_KEYS').length, 18);
  assert.equal(app('unitLabel')('t29'), 'Ⅳ-1 · 주제 29 · 프랑스 혁명의 발발과 전파');
});

test('데이터: 카드·사건이 올바른 주제에 있고, 설명에 정답이 그대로 없음', () => {
  const ids = new Set();
  for (const c of CARDS) {
    assert.ok(UNIT_INFO[c[0]], `주제 없음: ${c}`);
    assert.ok(c[1] && c[2], `용어/설명 비어 있음: ${c}`);
    assert.ok(!c[2].includes(c[1]), `설명에 정답이 들어 있음: ${c[1]}`);
    const id = cardId(c);
    assert.ok(!ids.has(id), `중복 카드: ${id}`);
    ids.add(id);
  }
  for (const e of EVENTS) assert.ok(UNIT_INFO[e[0]] && Number.isFinite(e[1]) && e[3], `사건 오류: ${e}`);
  for (const u of ALL_UNITS) assert.ok(CARDS.filter((c) => c[0] === u).length >= 8, `${u} 카드가 너무 적음`);
  assert.ok(CARDS.length >= 600);
});

test('초성·조사', () => {
  assert.equal(app('chosung')('강화도 조약'), 'ㄱㅎㄷ ㅈㅇ');
  assert.equal(app('chosung')('3B 정책'), '3B ㅈㅊ');
  assert.equal(app('josa')('하영', '과', '와'), '하영과');
  assert.equal(app('josa')('나', '과', '와'), '나와');
});

test('퀴즈: 10문제, 보기 4개, 정답이 보기 안에 한 번만', () => {
  const makeQuiz = app('makeQuiz');
  for (let seed = 1; seed <= 30; seed++) {
    const units = seed % 2 ? ['t19', 't29', 'a4'] : ALL_UNITS;
    const qs = makeQuiz(units, {}, 10, seeded(seed));
    assert.equal(qs.length, 10);
    for (const q of qs) {
      assert.equal(q.options.length, 4, q.text);
      assert.equal(new Set(q.options).size, 4, '보기 중복');
      assert.equal(q.options.filter((o) => o === q.answer).length, 1);
    }
  }
});

test('퀴즈: 사건이 없는 주제만 골라도 동작', () => {
  const qs = app('makeQuiz')(['b2'], {}, 10, seeded(7));
  assert.ok(qs.length >= 8);
  for (const q of qs) assert.equal(new Set(q.options).size, 4);
});

test('퀴즈: 약한 카드가 먼저 출제됨', () => {
  const pool = CARDS.filter((c) => c[0] === 't40');
  const levels = {};
  for (const c of pool) levels[cardId(c)] = 3;
  const weak = pool[0];
  levels[cardId(weak)] = 0;
  const qs = app('makeQuiz')(['t40'], levels, 3, seeded(3));
  assert.ok(qs.some((q) => q.id === cardId(weak)) || qs.some((q) => q.type === 'first'));
});

test('연표: 연도가 겹치지 않는 사건 4개, 가장 먼저 일어난 일 문제', () => {
  const pickEvents = app('pickEvents');
  for (let seed = 1; seed <= 30; seed++) {
    const evs = pickEvents(EVENTS.filter((e) => ['t29', 't30', 'a6'].includes(e[0])), 4, seeded(seed));
    assert.equal(evs.length, 4);
    assert.equal(new Set(evs.map((e) => Math.floor(e[1]))).size, 4);
  }
  const q = app('makeQuestion')(CARDS[0], EVENTS, 'first', seeded(9));
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
  assert.equal(json(app('requeue')(['a', 'b', 'c', 'd', 'e'], 0, 3)), json(['b', 'c', 'd', 'a', 'e']));
  assert.equal(json(app('requeue')(['a', 'b'], 1, 3)), json(['a', 'b']));
  assert.equal(app('starsFor')(9, 10), 3);
  assert.equal(app('starsFor')(3, 10), 0);
  assert.equal(app('scoreFor')(10), 20);
});

test('보상: 별 10개 = 뽑기권 1장, 중단원 클리어', () => {
  const addStars = app('addStars');
  assert.equal(json(addStars({ stars: 8, tickets: 0 }, 5)), json({ stars: 3, tickets: 1 }));
  assert.equal(json(addStars({ stars: 0, tickets: 2 }, 25)), json({ stars: 5, tickets: 4 }));
  const lv = {};
  for (const c of app('cardsFor')(app('midUnits')('Ⅰ-1'))) lv[cardId(c)] = 2;
  assert.equal(json(app('newlyCleared')(lv, [])), json(['Ⅰ-1']));
  assert.equal(json(app('newlyCleared')(lv, ['Ⅰ-1'])), json([]));
});

test('포카 뽑기: 중복 없이 30장, 다 모으면 null', () => {
  const draw = app('drawPhotocard');
  const all = app('ALL_PHOTOCARDS');
  assert.equal(all.length, 30);
  const owned = [];
  const rnd = seeded(5);
  for (let i = 0; i < 30; i++) {
    const k = draw(owned, 'cy', rnd);
    assert.ok(k && !owned.includes(k));
    owned.push(k);
  }
  assert.equal(draw(owned, 'cy', rnd), null);
  // 최애 카드가 먼저 많이 나옴
  const first10 = [];
  const r2 = seeded(11);
  for (let i = 0; i < 10; i++) first10.push(draw(first10, 'hy', r2));
  assert.ok(first10.filter((k) => k.startsWith('hy-')).length >= 3);
  assert.match(app('photocardSVG')('jh-5', false), /백지헌/);
  assert.doesNotMatch(app('photocardSVG')('jh-5', true), /백지헌/);
});

test('저장 데이터 복구·v1.0 기록 이전', () => {
  const load = app('loadState');
  const d = load('깨진 값');
  assert.equal(d.sel.length, ALL_UNITS.length);
  assert.equal(d.bias, null);
  const old = CARDS.find((c) => c[0] === 't19');
  const s = load(JSON.stringify({
    lv: { [`19|${old[1]}`]: 9, 'x|없음': 1 }, wrong: [`19|${old[1]}`, 'x'], sel: [19, 99], best: 50,
    bias: 'ng', stars: 4, tickets: 2, owned: ['ng-0', 'zz-1'], cleared: ['Ⅲ-2', 'X'],
  }));
  assert.equal(s.lv[cardId(old)], 3);
  assert.equal(s.lv['x|없음'], undefined);
  assert.equal(json(s.wrong), json([cardId(old)]));
  assert.equal(json(s.sel), json(['t19']));
  assert.equal(s.best, 50);
  assert.equal(s.bias, 'ng');
  assert.equal(json(s.owned), json(['ng-0']));
  assert.equal(json(s.cleared), json(['Ⅲ-2']));
});

test('내 사진 포카: 사진이 있으면 사진으로, 안 뽑은 카드는 사진을 숨김', () => {
  const svg = app('photocardSVG');
  const withPhoto = svg('hy-1', false, 'blob:https://x/abc');
  assert.match(withPhoto, /<image href="blob:https:\/\/x\/abc"/);
  assert.match(withPhoto, /송하영/);
  assert.equal((withPhoto.match(/<\/svg>/g) || []).length, 1);
  const locked = svg('hy-1', true, 'blob:https://x/abc');
  assert.doesNotMatch(locked, /<image/);
  assert.match(locked, /사진 대기 중/);
  assert.doesNotMatch(svg('hy-1', false, 'javascript:alert(1)'), /<image/);
});

test('관리자 비밀번호', () => {
  const check = app('checkPin');
  assert.equal(check('5258'), true);
  assert.equal(check('1234'), false);
  assert.equal(check(''), false);
});
