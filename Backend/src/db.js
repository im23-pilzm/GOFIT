const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const pool = new Pool({ connectionString });

module.exports = {
  query: (text, params) => pool.query(text, params),
};
