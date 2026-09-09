// Prisma 7 moved connection config out of schema.prisma into this file.
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    // This repo is the capability-demo copy — always seed the curated,
    // anonymised snapshot, never the real workbook seeder.
    seed: "node --experimental-strip-types --env-file=.env prisma/seed-demo.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
