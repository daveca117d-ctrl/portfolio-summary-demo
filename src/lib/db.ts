import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 uses driver adapters. The SQLite file path comes from DATABASE_URL
// (e.g. "file:./dev.db"); strip the file: prefix for better-sqlite3.
const url = process.env.DATABASE_URL ?? "file:./dev.db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function make() {
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

export const prisma = globalForPrisma.prisma ?? make();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
