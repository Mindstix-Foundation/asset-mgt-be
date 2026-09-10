/**
 * Local embedded Postgres for development (no system install required).
 * Run: node scripts/start-embedded-pg.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const databaseDir = path.join(__dirname, '..', 'data', 'embedded-pg');
  fs.mkdirSync(databaseDir, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port: 5433,
    persistent: true,
  });

  const alreadyInitialized = fs.existsSync(path.join(databaseDir, 'PG_VERSION'));
  if (!alreadyInitialized) {
    console.log('Initializing embedded Postgres cluster...');
    await pg.initialise();
  }

  console.log('Starting embedded Postgres on port 5433...');
  await pg.start();

  try {
    await pg.createDatabase('asset_management_db');
    console.log('Created database asset_management_db');
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes('already exists')) {
      console.log('Database asset_management_db already exists');
    } else {
      console.warn('createDatabase note:', msg);
    }
  }

  console.log('Embedded Postgres is running.');
  console.log('DATABASE_URL=postgresql://postgres:postgres@localhost:5433/asset_management_db?schema=public');
  console.log('Keep this process open. Press Ctrl+C to stop.');

  const shutdown = async () => {
    console.log('\nStopping embedded Postgres...');
    try {
      await pg.stop();
    } catch (_) {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Failed to start embedded Postgres:', err);
  process.exit(1);
});
