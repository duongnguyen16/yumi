import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '../../scripts/seed-test-users.js'),
  'utf8',
);

describe('seed-test-users ownership fixtures', () => {
  it('không tạo outcome ACCEPTED_TO_DISPUTE cho location appeal', () => {
    expect(source).not.toMatch(
      /type: 'LOCATION_REJECTED'[\s\S]{0,500}status: 'ACCEPTED_TO_DISPUTE'/,
    );
  });

  it('không dùng RequestAccess đang có appeal pending để mở Dispute', () => {
    expect(source).not.toMatch(
      /requestAccessId: IDS\.requestRejected[\s\S]{0,2500}targetId: IDS\.requestRejected[\s\S]{0,500}status: 'PENDING'/,
    );
  });

  it('gắn location cho các LocationRequest CREATE dùng trong queue admin', () => {
    expect(source).toMatch(
      /_id: IDS\.locationRequest,[\s\S]{0,180}locationId: fixtureLocationId\(17\)/,
    );
    expect(source).toMatch(
      /_id: id\('66f400000000000000000001'\),[\s\S]{0,180}locationId: fixtureLocationId\(19\)/,
    );
  });
});
