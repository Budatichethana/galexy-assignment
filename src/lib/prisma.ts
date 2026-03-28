import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type GlobalWithPrisma = {
  prismaClient?: PrismaClient;
  prismaPool?: Pool;
};

const globalForPrisma = global as GlobalWithPrisma;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prismaPool =
  globalForPrisma.prismaPool ||
  new Pool({
    connectionString,
    connectionTimeoutMillis: 15000, // 15 second timeout for acquiring connection
    idleTimeoutMillis: 20000, // 20 second idle timeout
    max: process.env.NODE_ENV === "development" ? 3 : 10,
  });

if (!globalForPrisma.prismaPool) {
  prismaPool.on("error", (err) => {
    console.error("[Prisma Pool] Unexpected error on idle connection", err);
  });
}

const adapter = new PrismaPg(prismaPool);

const prismaClient =
  globalForPrisma.prismaClient ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = prismaPool;
  globalForPrisma.prismaClient = prismaClient;
}

export default prismaClient;
