import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
type PgPool = InstanceType<typeof Pool>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: PgPool | undefined;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prismaPool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 20000,
    max: process.env.NODE_ENV === "development" ? 3 : 10,
  });

if (!globalForPrisma.prismaPool) {
  prismaPool.on("error", (error: Error) => {
    console.error("[Prisma Pool] Unexpected error on idle connection", error);
  });
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(prismaPool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = prismaPool;
}

export default prisma;
