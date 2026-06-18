// Initialize Supabase clients
const { createClient } = require("@supabase/supabase-js");

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Throw error if required environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

// Create public client (for user-facing operations)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create admin client (for privileged operations) if service role key is provided
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Export both clients
module.exports = { supabase, supabaseAdmin };
