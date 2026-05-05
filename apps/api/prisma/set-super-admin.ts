/**
 * One-shot CLI: replace ALL super admins with a single account from env vars.
 *
 * Usage:
 *   SUPERADMIN_EMAIL=name@domain.com \
 *   SUPERADMIN_PASSWORD='YourStrongPassword' \
 *   SUPERADMIN_NAME='Display Name' \
 *   npx tsx apps/api/prisma/set-super-admin.ts
 *
 * Behaviour:
 *   - Deletes every existing row in super_admins.
 *   - Creates exactly one new super admin with a bcrypt-hashed password
 *     using BCRYPT_SALT_ROUNDS (default 12) — same hashing the auth service
 *     uses, so the resulting hash is verified by the existing login flow.
 *   - Touches no other table. Organisers, attendees, events, audit logs,
 *     etc. are never read or modified.
 *   - Idempotent: running again with the same credentials produces the
 *     same one-row state. Running with different credentials replaces
 *     the previous account.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`error: missing required env var ${name}`);
    process.exit(1);
  }
  return v.trim();
}

async function main() {
  const email = getEnv("SUPERADMIN_EMAIL").toLowerCase();
  const password = getEnv("SUPERADMIN_PASSWORD");
  const name = process.env.SUPERADMIN_NAME?.trim() || "Super Admin";
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

  if (password.length < 8) {
    console.error("error: SUPERADMIN_PASSWORD must be at least 8 characters");
    process.exit(1);
  }
  if (!email.includes("@")) {
    console.error("error: SUPERADMIN_EMAIL is not a valid email");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Wipe and replace inside one transaction so we never end up with zero
  // super admins if the create fails for any reason.
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const before = await tx.superAdmin.count();
    await tx.superAdmin.deleteMany({});
    const created = await tx.superAdmin.create({
      data: {
        email,
        passwordHash,
        name,
        mfaEnabled: false,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return { before, created };
  });

  console.log("✓ Super admin set");
  console.log(`  Removed: ${result.before} existing record(s)`);
  console.log(`  Created: ${result.created.email} (${result.created.name})`);
  console.log(`  ID:      ${result.created.id}`);
}

main()
  .catch((e) => {
    console.error("Failed to set super admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
