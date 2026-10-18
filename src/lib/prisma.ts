import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import config from "../config/index.js";

const pool = new Pool({
  connectionString: config.database_url,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});
export default prisma;
