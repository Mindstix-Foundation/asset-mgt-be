#!/usr/bin/env bash
# Reconcile local Prisma migration history with the git-tracked migration chain.
#
# Use when:
#   - schema.prisma matches the database (prisma migrate diff shows no drift)
#   - _prisma_migrations records an old local-only chain
#   - prisma/migrations contains duplicate untracked folders
#
# Safe: marks git migrations as applied without re-running SQL.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Git-tracked migrations ==="
mapfile -t GIT_MIGRATIONS < <(
  git ls-files 'prisma/migrations/*/migration.sql' \
    | sed 's|prisma/migrations/||;s|/migration.sql||' \
    | sort
)

if ((${#GIT_MIGRATIONS[@]} == 0)); then
  echo "ERROR: No git-tracked migrations found."
  exit 1
fi

printf '  %s\n' "${GIT_MIGRATIONS[@]}"

echo ""
echo "=== Removing untracked local-only migration folders ==="
for dir in prisma/migrations/*/; do
  name=$(basename "$dir")
  [[ "$name" == "migration_lock.toml" ]] && continue
  if ! printf '%s\n' "${GIT_MIGRATIONS[@]}" | grep -qx "$name"; then
    echo "  removing $name"
    rm -rf "prisma/migrations/$name"
  fi
done

echo ""
echo "=== Clearing orphaned rows from _prisma_migrations ==="
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const gitMigrations = execSync(
  "git ls-files 'prisma/migrations/*/migration.sql' | sed 's|prisma/migrations/||;s|/migration.sql||' | sort",
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

async function main() {
  const prisma = new PrismaClient();
  try {
    const applied = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations ORDER BY finished_at
    `;
  const appliedNames = applied.map((r) => r.migration_name);
  const orphans = appliedNames.filter((n) => !gitMigrations.includes(n));
  const missing = gitMigrations.filter((n) => !appliedNames.includes(n));

  console.log(`  applied in DB: ${appliedNames.length}`);
  console.log(`  git-tracked:   ${gitMigrations.length}`);
  console.log(`  orphans:       ${orphans.length}`);
  console.log(`  missing:       ${missing.length}`);

  if (orphans.length > 0) {
    for (const name of orphans) {
      await prisma.$executeRaw`
        DELETE FROM _prisma_migrations WHERE migration_name = ${name}
      `;
      console.log(`  deleted orphan: ${name}`);
    }
  }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE

echo ""
echo "=== Marking git migrations as applied ==="
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const gitMigrations = execSync(
  "git ls-files 'prisma/migrations/*/migration.sql' | sed 's|prisma/migrations/||;s|/migration.sql||' | sort",
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

async function main() {
  const prisma = new PrismaClient();
  try {
    const applied = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations
    `;
    const appliedSet = new Set(applied.map((r) => r.migration_name));
    const missing = gitMigrations.filter((name) => !appliedSet.has(name));

    for (const migration of missing) {
      console.log(`  resolving ${migration}`);
      execSync(`npx prisma migrate resolve --applied "${migration}"`, {
        stdio: 'inherit',
      });
    }

    if (missing.length === 0) {
      console.log('  all git migrations already recorded');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE

echo ""
echo "=== Final status ==="
npx prisma migrate status

echo ""
echo "=== Schema vs database drift ==="
DB_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-url "$DB_URL"

echo ""
echo "Done. Migration history now matches the git-tracked chain."
