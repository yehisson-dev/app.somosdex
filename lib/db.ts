import postgres from "postgres";

// Use explicit options to avoid URL parsing issues with special chars in password
const sql = postgres({
  host: process.env.DB_HOST ?? "postgres",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "postgres",
  username: process.env.DB_USER ?? "dex",
  password: process.env.DB_PASSWORD ?? "Penalo2122$",
  ssl: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    search_path: "public",
  },
});

export default sql;
