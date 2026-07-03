// Creates local test accounts (1 admin + a few customers) for manual testing.
// Password hashing matches AuthService.register (bcryptjs, cost 10).
// Idempotent: upserts by email, so re-running just resets these accounts.
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..');

const envContent = fs.readFileSync(path.join(apiDir, '.env'), 'utf8');
const uriLine = envContent.split('\n').find((l) => l.startsWith('MONGODB_URL='));
if (!uriLine) {
  console.error('MONGODB_URL not found in apps/api/.env');
  process.exit(1);
}
const uri = uriLine.slice('MONGODB_URL='.length).trim();

const mongoose = require(require.resolve('mongoose', { paths: [apiDir] }));
const bcrypt = require(require.resolve('bcryptjs', { paths: [apiDir] }));
const { ObjectId } = require(require.resolve('bson', { paths: [apiDir] }));

const PASSWORD = 'Test@123456';

// Same _id the seeded locations use as a placeholder `submittedBy` — using it
// here makes that dangling reference resolve to a real user.
const ADMIN_ID = new ObjectId('667999999999999999999999');

const USERS = [
  {
    _id: ADMIN_ID,
    email: 'admin@wdp301.dev',
    fullName: 'Admin Test',
    role: 'ADMIN',
  },
  { email: 'user1@wdp301.dev', fullName: 'Nguyen Van A', role: 'CUSTOMER' },
  { email: 'user2@wdp301.dev', fullName: 'Tran Thi B', role: 'CUSTOMER' },
  { email: 'user3@wdp301.dev', fullName: 'Le Van C', role: 'CUSTOMER' },
];

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected to db:', mongoose.connection.db.databaseName);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const ops = USERS.map((u) => ({
    replaceOne: {
      filter: { email: u.email },
      replacement: {
        ...(u._id ? { _id: u._id } : {}),
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        status: 'ACTIVE',
        phoneVerified: false,
        trustScore: 0,
        trustLevel: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      upsert: true,
    },
  }));
  const result = await mongoose.connection.db.collection('users').bulkWrite(ops);
  console.log(
    `users: ${USERS.length} defined, ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
  );
  console.log(`All accounts share the password: ${PASSWORD}`);
  for (const u of USERS) console.log(`  - ${u.role.padEnd(8)} ${u.email}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err.name, err.code || '');
  process.exit(1);
});
