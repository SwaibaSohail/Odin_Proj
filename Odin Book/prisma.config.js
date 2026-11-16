const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
