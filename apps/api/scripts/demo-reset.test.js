const test = require('node:test');
const assert = require('node:assert/strict');
const { EJSON } = require('bson');

const { normalizeValue, normalizeVietnameseText } = require('./demo-reset');

test('normalizes common unaccented Vietnamese demo text', () => {
  assert.equal(
    normalizeVietnameseText('Quan an, nha hang tai Hoa Lac'),
    'Quán ăn, nhà hàng tại Hòa Lạc',
  );
});

test('preserves strict-EJSON coordinate numbers while normalizing text', () => {
  const location = EJSON.parse(
    JSON.stringify({
      name: 'Quan an Hoa Lac',
      geo: { type: 'Point', coordinates: [105.5269, 21.0127] },
    }),
    { relaxed: false },
  );

  const normalized = normalizeValue(location);

  assert.equal(normalized.name, 'Quán ăn Hòa Lạc');
  assert.equal(normalized.geo.coordinates[0].valueOf(), 105.5269);
  assert.equal(normalized.geo.coordinates[1].valueOf(), 21.0127);
});
