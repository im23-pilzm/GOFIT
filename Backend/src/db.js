// Database connection pool using PostgreSQL
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

// Throw error if DATABASE_URL is not configured
if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable");
}

// Initialize connection pool
const pool = new Pool({ connectionString });

// Export query method for executing SQL
module.exports = {
  query: (text, params) => pool.query(text, params),
};
