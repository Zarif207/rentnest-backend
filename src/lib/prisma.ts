import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import config from "../config/index.js";

// One pool + client per serverless instance. Each Vercel instance handles one
// request at a time, so a single connection is enough; idle connections are
// released quickly and a stuck connect fails fast instead of hanging.
const createPrisma = () => {
  const pool = new Pool({
    connectionString: config.database_url,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
};

// Cache on globalThis in dev so tsx watch reloads don't open new pools.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrisma>;
};

const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
