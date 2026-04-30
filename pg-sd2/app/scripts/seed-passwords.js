// app/scripts/seed-passwords.js
//
// One-shot helper. The seed SQL stores user passwords as the sentinel
// "NEEDS_HASH:<plain>" so that real bcrypt hashes never get committed
// to source control. This script connects to the running database and
// rewrites every such sentinel into a proper bcrypt hash.
//
// Run once after the containers are up:
//   docker compose exec web npm run seed-passwords
//
// Idempotent: re-running does nothing because all rows will already
// be hashed. Safe to commit and run in CI if needed.

const bcrypt = require("bcrypt");
const db = require("../services/db");

const SENTINEL_PREFIX = "NEEDS_HASH:";
const BCRYPT_ROUNDS = 10;

async function main() {
  const rows = await db.query(
    "SELECT user_id, username, password_hash FROM users WHERE password_hash LIKE ?",
    [SENTINEL_PREFIX + "%"]
  );

  if (rows.length === 0) {
    console.log("All seed passwords already hashed — nothing to do.");
    process.exit(0);
  }

  console.log(`Hashing ${rows.length} seed passwords...`);

  for (const user of rows) {
    const plain = user.password_hash.slice(SENTINEL_PREFIX.length);
    const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
    await db.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [hash, user.user_id]);
    console.log(`  ✓ ${user.username}`);
  }

  console.log("Done. Seed users can now log in with their plain password.");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed-passwords failed:", err);
  process.exit(1);
});
