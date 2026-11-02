import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma.js";
import config from "../../src/config/index.js";
import { assertStrongPassword, fail } from "./account-helpers.js";

// npm run observer:create
// Creates or updates the read-only OBSERVER account: ACTIVE, approved, with
// OBSERVER_PASSWORD (required) hashed with bcrypt. The API can't create one.
const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const email = process.env.OBSERVER_EMAIL || "observer@rentnest.dev";
  const password = assertStrongPassword(
    "OBSERVER_PASSWORD",
    process.env.OBSERVER_PASSWORD,
  );
  const hash = await bcrypt.hash(password, config.bcrypt_salt_rounds);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  if (existing && existing.role !== "OBSERVER") {
    throw new Error(
      `${email} already belongs to a ${existing.role} account; pick another OBSERVER_EMAIL.`,
    );
  }

  await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      role: "OBSERVER",
      userStatus: "ACTIVE",
      landlordStatus: "APPROVED",
    },
    create: {
      name: "RentNest Observer",
      email,
      password: hash,
      role: "OBSERVER",
      userStatus: "ACTIVE",
      landlordStatus: "APPROVED",
    },
  });
  console.log(`✔ Observer account ready: ${email} (password not shown)`);
};

main()
  .catch(fail)
  .finally(() => prisma.$disconnect());
