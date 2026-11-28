// 면접 스테이지 앱 로직 테스트
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppScript } = require('./helpers');

const app = loadAppScript('daeil-interview');
const QUESTIONS = app('QUESTIONS');
const json = (v) => JSON.stringify(v);

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('질문 은행: 유형별 질문과 키워드·뼈대가 채워져 있음', () => {
  const ids = new Set();
  const types = app('TYPES');
  for (const q of QUESTIONS) {
    assert.ok(!ids.has(q.id), `중복 id ${q.id}`); ids.add(q.id);
    assert.ok(types[q.type], q.id);
    assert.ok(q.q && q.core && q.ev, q.id);
    assert.ok(q.keys.length >= 2 && q.keys.length <= 4, `${q.id} 키워드 2~4개`);
    assert.ok(Array.isArray(q.tails));
  }
  for (const t of ['self', 'motive', 'char']) assert.ok(QUESTIONS.filter((q) => q.type === t).length >= 5, t);
  assert.equal(app('PRINCIPLES').length, 8);
  assert.equal(app('FIVE').length, 5);
});

test('모의면접: 6문항, 중복 없음, 유형 배분', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const m = app('pickMock')(seeded(seed));
    assert.equal(m.length, 6);
    assert.equal(new Set(m.map((x) => x.q.id)).size, 6);
    const c = (t) => m.filter((x) => x.q.type === t).length;
    assert.ok(c('self') >= 2 && c('motive') >= 2 && c('char') >= 1);
    for (const x of m) if (x.tail) assert.ok(x.q.tails.includes(x.tail));
  }
});

test('답변 길이·시간 표시', () => {
  const z = app('timeZone');
  assert.equal(z(10), 'short'); assert.equal(z(25), 'good'); assert.equal(z(40), 'good'); assert.equal(z(41), 'long');
  assert.equal(app('fmtTime')(75), '1:15');
  assert.equal(app('fmtTime')(360), '6:00');
});

test('D-day·연속 연습일', () => {
  const today = new Date(2026, 10, 28);
  assert.equal(app('ddays')('2026-12-05', today), 7);
  assert.equal(app('ddays')('2026-11-28', today), 0);
  assert.equal(app('ddays')('', today), null);
  assert.equal(app('ddayLabel')(7), 'D-7');
  assert.equal(app('ddayLabel')(0), 'D-DAY 🔥');
  const st = app('streak');
  assert.equal(st(['2026-11-26', '2026-11-27', '2026-11-28'], today), 3);
  assert.equal(st(['2026-11-26', '2026-11-27'], today), 2); // 어제까지 이어짐
  assert.equal(st(['2026-11-25'], today), 0);
});

test('보상·포카·비밀번호', () => {
  assert.equal(json(app('addStars')({ stars: 8, tickets: 0 }, 5)), json({ stars: 3, tickets: 1 }));
  assert.equal(app('starsForCheck')(4), 2);
  assert.equal(app('starsForCheck')(1), 1);
  const draw = app('drawPhotocard');
  const owned = [];
  const rnd = seeded(3);
  for (let i = 0; i < 30; i++) { const k = draw(owned, 'ng', rnd); assert.ok(k && !owned.includes(k)); owned.push(k); }
  assert.equal(draw(owned, 'ng', rnd), null);
  assert.equal(app('checkPin')('5258'), true);
  assert.equal(app('checkPin')('0000'), false);
  assert.equal(app('PHOTO_DB'), 'history-quest'); // 역사 퀘스트와 사진 공유
  assert.match(app('photocardSVG')('ng-2', false, 'blob:x'), /<image href="blob:x"/);
});

test('저장 데이터 복구', () => {
  const load = app('loadState');
  const d = load('깨진 값');
  assert.equal(d.bias, null); assert.equal(d.voice, true);
  const s = load(JSON.stringify({ bias: 'jh', stars: 3, tickets: 1, owned: ['jh-1', 'zz-0'], done: { s1: 2, zz: 1 },
    memo: { m1: '독일어로 넓히기' }, days: ['2026-11-27', 'x'], mocks: 2, date: '2026-12-05', voice: false }));
  assert.equal(s.bias, 'jh');
  assert.equal(json(s.owned), json(['jh-1']));
  assert.equal(json(s.done), json({ s1: 2 }));
  assert.equal(s.memo.m1, '독일어로 넓히기');
  assert.equal(json(s.days), json(['2026-11-27']));
  assert.equal(s.date, '2026-12-05');
  assert.equal(s.voice, false);
});
