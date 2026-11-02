import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma.js";
import config from "../../src/config/index.js";
import { assertStrongPassword, fail } from "./account-helpers.js";

// npm run admin:set-password
// Sets a new password for one existing ADMIN (ADMIN_EMAIL). Changes nothing
// else, and nobody else.
const main = async () => {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is required.");
  const password = assertStrongPassword(
    "ADMIN_PASSWORD",
    process.env.ADMIN_PASSWORD,
  );

  const hash = await bcrypt.hash(password, config.bcrypt_salt_rounds);
  const { count } = await prisma.user.updateMany({
    where: { email, role: "ADMIN" },
    data: { password: hash },
  });
  if (count === 0) throw new Error(`No ADMIN account with the email ${email}.`);
  console.log(`✔ Password updated for ${email} (not shown)`);
};

main()
  .catch(fail)
  .finally(() => prisma.$disconnect());
