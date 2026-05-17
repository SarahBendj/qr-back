import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
