require("dotenv").config();

const express = require("express");
const app = express();
const { supabase } = require("./supabaseClient");
const userRoutes = require("./routes/users");
const exerciseMetadataRoutes = require("./routes/exerciseMetadata");

app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api", exerciseMetadataRoutes);

app.get("/", async (req, res) => {
  try {
    const { error } = await supabase.from("users").select("id").limit(1);
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

if (require.main === module) {
  const PORT = process.env.PORT || 3005;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
