const express = require("express");
const crypto = require("crypto");
const { supabase } = require("../supabaseClient");

const router = express.Router();

// HTTP Cache-Control header for static metadata - cache 1 hour, stale-while-revalidate 24 hours
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

// Generates weak ETag for JSON response - used for HTTP caching to detect changes
function weakEtagForJson(body) {
  const payload = JSON.stringify(body);
  const hash = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 32);
  return `W/"${hash}"`;
}

// Send list response with ETag caching - returns 304 Not Modified if unchanged
function sendList(req, res, rows, { errorLabel }) {
  try {
    const etag = weakEtagForJson(rows);
    const inm = req.headers["if-none-match"];
    if (inm && inm === etag) {
      res.set("ETag", etag);
      res.set("Cache-Control", CACHE_CONTROL);
      return res.status(304).end();
    }
    res.set("ETag", etag);
    res.set("Cache-Control", CACHE_CONTROL);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({
      message: errorLabel,
      error: err.message,
    });
  }
}

// GET /equipment - Retrieve list of all available exercise equipment (cached with ETag)
router.get("/equipment", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("equipment")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      return res.status(500).json({
        message: "Error fetching equipment",
        error: error.message,
      });
    }

    return sendList(req, res, data ?? [], { errorLabel: "Error serializing equipment" });
  } catch (error) {
    return res.status(500).json({
      message: "Unexpected error while listing equipment",
      error: error.message,
    });
  }
});

// GET /exercise-types - Retrieve list of all exercise types (cached with ETag)
router.get("/exercise-types", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("exercise_type")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      return res.status(500).json({
        message: "Error fetching exercise types",
        error: error.message,
      });
    }

    return sendList(req, res, data ?? [], {
      errorLabel: "Error serializing exercise types",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unexpected error while listing exercise types",
      error: error.message,
    });
  }
});

// GET /muscle-groups - Retrieve list of all muscle groups with images (cached with ETag)
router.get("/muscle-groups", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("muscle_group")
      .select("id, name, image_url")
      .order("name", { ascending: true });

    if (error) {
      return res.status(500).json({
        message: "Error fetching muscle groups",
        error: error.message,
      });
    }

    return sendList(req, res, data ?? [], {
      errorLabel: "Error serializing muscle groups",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unexpected error while listing muscle groups",
      error: error.message,
    });
  }
});

module.exports = router;
