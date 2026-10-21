import test from 'node:test';
import assert from 'node:assert/strict';
import { assignFares, quoteBooking, earlyBirdEndsAt } from '../public/axp/pricing.js';

// The prices in the approved proposal (20 Oct 2026).
const settings = {
  normalPrice: 2999,
  alcoholPrice: 3999,
  normalGroupPrice: 2599,
  alcoholGroupPrice: 3499,
  earlyNormalPrice: 2699,
  earlyAlcoholPrice: 3599,
  earlyNormalGroupPrice: 2450,
  earlyAlcoholGroupPrice: 3250,
  depositPerPerson: 500,
  earlyBirdEnabled: true,
  earlyBirdEndDate: '2026-10-27',
  earlyBirdEndTime: '23:59',
  chargesConfirmed: true,
  extraPerPerson: 0,
  extraPerBooking: 0,
};

const silver = (gender) => ({ pass: 'normal', gender });
const gold = (gender) => ({ pass: 'alcohol', gender });
const rupees = (paise) => paise / 100;

// Each row of the proposal's worked examples: early bird, regular, and the
// pre-booking split (deposit now + balance later).
const examples = [
  ['1 Silver', [silver('woman')], 2699, 2999, 500, 2499],
  ['1 Gold', [gold('man')], 3599, 3999, 500, 3499],
  ['Silver couple', [silver('woman'), silver('man')], 4900, 5198, 1000, 4198],
  ['Gold couple', [gold('woman'), gold('man')], 6500, 6998, 1000, 5998],
  ['2 friends, same gender, both Gold', [gold('woman'), gold('woman')], 7198, 7998, 1000, 6998],
  ['3 on Gold: a couple + 1', [gold('woman'), gold('man'), gold('man')], 10099, 10997, 1500, 9497],
  ['Group of 4, all Silver', [silver('man'), silver('man'), silver('man'), silver('man')], 9800, 10396, 2000, 8396],
  ['Group of 4, all Gold', [gold('woman'), gold('woman'), gold('woman'), gold('woman')], 13000, 13996, 2000, 11996],
  ['Group of 4 Gold + 1 Silver', [gold('man'), gold('man'), gold('woman'), gold('man'), silver('woman')], 15699, 16995, 2500, 14495],
  ['Group of 6, all Gold', Array.from({ length: 6 }, () => gold('man')), 19500, 20994, 3000, 17994],
  ['Group of 10, all Gold', Array.from({ length: 10 }, () => gold('nonbinary')), 32500, 34990, 5000, 29990],
];

for (const [name, people, early, regular, deposit, balance] of examples) {
  test(`worked example: ${name}`, () => {
    assert.equal(rupees(quoteBooking(people, settings, { earlyBird: true }).totalPaise), early);
    assert.equal(rupees(quoteBooking(people, settings, { earlyBird: false }).totalPaise), regular);
    const pre = quoteBooking(people, settings, { plan: 'prebook', earlyBird: true });
    assert.equal(pre.priceList, 'regular', 'a pre-booking never gets early-bird prices');
    assert.equal(rupees(pre.payNowPaise), deposit);
    assert.equal(rupees(pre.balancePaise), balance);
    assert.equal(rupees(pre.totalPaise), regular);
  });
}

test('a couple needs two different genders on the same pass', () => {
  assert.deepEqual(assignFares([gold('woman'), silver('man')]), ['single', 'single']);
  assert.deepEqual(assignFares([gold('woman'), gold('nonbinary')]), ['couple', 'couple']);
  assert.deepEqual(assignFares([gold('woman'), gold('man'), gold('woman')]), ['couple', 'couple', 'single']);
});

test('a Silver guest does not count towards a Gold group', () => {
  assert.deepEqual(
    assignFares([gold('man'), gold('man'), gold('man'), silver('woman')]),
    ['single', 'single', 'single', 'single']
  );
});

test('adding a person never lowers the total', () => {
  for (const earlyBird of [true, false]) {
    for (const make of [gold, silver]) {
      for (const genders of [['woman', 'man', 'woman', 'man', 'woman'], ['man', 'man', 'man', 'man', 'man']]) {
        let previous = 0;
        for (let n = 1; n <= genders.length; n++) {
          const total = quoteBooking(genders.slice(0, n).map(make), settings, { earlyBird }).totalPaise;
          assert.ok(total > previous, `${n} people cost more than ${n - 1}`);
          previous = total;
        }
      }
    }
  }
});

test('savings are measured against the regular single price', () => {
  const quote = quoteBooking([gold('woman'), gold('man')], settings, { earlyBird: true });
  assert.deepEqual(quote.lines.map((line) => line.savingPaise / 100), [749, 749]);
});

test('no total while final charges are unconfirmed', () => {
  const quote = quoteBooking([gold('woman')], { ...settings, chargesConfirmed: false });
  assert.equal(quote.totalPaise, null);
  assert.equal(quote.payNowPaise, null);
});

test('settings saved before couple and group prices fall back to single prices', () => {
  const old = { ...settings, normalGroupPrice: undefined, alcoholGroupPrice: undefined };
  assert.equal(rupees(quoteBooking([gold('woman'), gold('man')], old).totalPaise), 7998);
});

test('the early bird ends at 11:59 pm IST on its end date', () => {
  assert.equal(new Date(earlyBirdEndsAt(settings)).toISOString(), '2026-10-27T18:29:59.000Z');
  assert.equal(earlyBirdEndsAt({ ...settings, earlyBirdEnabled: false }), null);
});
