import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./prisma/client";

const globalForDatabase = globalThis as unknown as { db?: PrismaClient };

export const db =
  globalForDatabase.db ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.db = db;
}
