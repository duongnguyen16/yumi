// Loads /seed_data/*.seed.json into the database configured by MONGODB_URL.
// Idempotent: upserts by _id, so re-running is safe.
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..');
const seedDir = path.join(apiDir, '..', '..', 'seed_data');

const envContent = fs.readFileSync(path.join(apiDir, '.env'), 'utf8');
const uriLine = envContent
  .split('\n')
  .find((l) => l.startsWith('MONGODB_URL='));
if (!uriLine) {
  console.error('MONGODB_URL not found in apps/api/.env');
  process.exit(1);
}
const uri = uriLine.slice('MONGODB_URL='.length).trim();

const mongoose = require(require.resolve('mongoose', { paths: [apiDir] }));
const { EJSON } = require(require.resolve('bson', { paths: [apiDir] }));

// Order matters: sub_categories references categories, locations references
// categories/sub_categories, reviews references locations.
const SEEDS = [
  { file: 'categories.seed.json', collection: 'categories' },
  { file: 'sub_categories.seed.json', collection: 'sub_categories' },
  { file: 'locations.seed.json', collection: 'locations' },
  { file: 'products.seed.json', collection: 'products' },
  { file: 'reviews.seed.json', collection: 'reviews' },
];

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected to db:', mongoose.connection.db.databaseName);

  for (const { file, collection } of SEEDS) {
    const raw = fs.readFileSync(path.join(seedDir, file), 'utf8');
    const docs = EJSON.parse(raw, { relaxed: false });

    const ops = docs.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    }));
    const result = await mongoose.connection.db
      .collection(collection)
      .bulkWrite(ops);
    console.log(
      `${collection}: ${docs.length} in seed file, ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err.name, err.code || '');
  process.exit(1);
});
