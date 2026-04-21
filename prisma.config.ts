import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;

  if (code !== "ENOENT") {
    throw error;
  }
}

try {
  process.loadEnvFile(".env");
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;

  if (code !== "ENOENT") {
    throw error;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
