// Load environment variables from .env file
require("dotenv").config();

// Create Express app and load Supabase client
const express = require("express");
const app = express();
const { supabase } = require("./supabaseClient");

// Import all route modules
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const workoutScheduleRoutes = require("./routes/workoutSchedule");
const exerciseRoutes = require("./routes/exercises");
const workoutRoutes = require("./routes/workouts");
const exerciseMetadataRoutes = require("./routes/exerciseMetadata");

// Parse JSON request bodies
app.use(express.json());

// CORS middleware - allow requests only from configured frontend origins
app.use((req, res, next) => {
  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;

  // Allow browser clients only from configured frontend origins
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  // Set CORS headers
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

// Mount routes on their respective paths
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workout-schedule", workoutScheduleRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api", exerciseMetadataRoutes);

// Health check endpoint - verifies API and database connection
app.get("/", async (req, res) => {
  try {
    const { error } = await supabase.from("equipment").select("id").limit(1);
    if (error) {
      return res.status(500).json({
        ok: false,
        message: "API läuft, aber DB-Verbindung fehlgeschlagen",
        error: error.message,
      });
    }

    res.json({ ok: true, message: "API läuft, DB verbunden" });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Fehler", error: err.message });
  }
});

module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3005;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}