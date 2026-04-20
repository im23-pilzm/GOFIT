const express = require("express");
const Joi = require("joi");
const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../supabaseClient");

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const createAuthedSupabase = (accessToken) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

const uuidSchema = Joi.string().guid({ version: ["uuidv4", "uuidv5"] });

const workoutIdParamSchema = Joi.object({
  id: uuidSchema.required(),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const createWorkoutSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  started_at: Joi.date().iso().default(() => new Date().toISOString()),
});

const updateWorkoutSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  duration_seconds: Joi.number().integer().min(0),
  total_volume_kg: Joi.number().integer().min(0),
  total_sets: Joi.number().integer().min(0),
  finished_at: Joi.date().iso().allow(null),
}).min(1);

const finishWorkoutSchema = Joi.object({
  finished_at: Joi.date().iso().default(() => new Date().toISOString()),
  duration_seconds: Joi.number().integer().min(0),
  total_volume_kg: Joi.number().integer().min(0),
  total_sets: Joi.number().integer().min(0),
});

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to authenticate user" });
  }
};

// GET /api/workouts - List user workouts with pagination
router.get("/", auth, async (req, res) => {
  try {
    const { error: queryError, value: query } = listQuerySchema.validate(req.query);
    if (queryError) {
      return res.status(400).json({ message: queryError.details[0].message });
    }

    const { page, limit } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const userClient = createAuthedSupabase(req.accessToken);
    const { data, error, count } = await userClient
      .from("workouts")
      .select("*", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("started_at", { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({
      data: data ?? [],
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while listing workouts" });
  }
});

// GET /api/workouts/:id - Get workout details
router.get("/:id", auth, async (req, res) => {
  try {
    const { error: paramError } = workoutIdParamSchema.validate(req.params);
    if (paramError) {
      return res.status(400).json({ message: paramError.details[0].message });
    }

    const userClient = createAuthedSupabase(req.accessToken);
    const { data, error } = await userClient
      .from("workouts")
      .select(`
        *,
        workout_exercise (
          *,
          exercises (*),
          sets (*)
        )
      `)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: "Workout not found" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while fetching workout details" });
  }
});

// POST /api/workouts - Create new workout
router.post("/", auth, async (req, res) => {
  try {
    const { error: bodyError, value: body } = createWorkoutSchema.validate(req.body);
    if (bodyError) {
      return res.status(400).json({ message: bodyError.details[0].message });
    }

    const userClient = createAuthedSupabase(req.accessToken);
    const { data, error } = await userClient
      .from("workouts")
      .insert({
        ...body,
        user_id: req.user.id,
      })
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while creating workout" });
  }
});

// PUT /api/workouts/:id - Update workout
router.put("/:id", auth, async (req, res) => {
  try {
    const { error: paramError } = workoutIdParamSchema.validate(req.params);
    if (paramError) {
      return res.status(400).json({ message: paramError.details[0].message });
    }

    const { error: bodyError, value: body } = updateWorkoutSchema.validate(req.body);
    if (bodyError) {
      return res.status(400).json({ message: bodyError.details[0].message });
    }

    const userClient = createAuthedSupabase(req.accessToken);
    
    // Check ownership first
    const { data: existing, error: fetchError } = await userClient
      .from("workouts")
      .select("user_id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) return res.status(500).json({ message: fetchError.message });
    if (!existing) return res.status(404).json({ message: "Workout not found" });
    if (existing.user_id !== req.user.id) return res.status(403).json({ message: "Access denied" });

    const { data, error } = await userClient
      .from("workouts")
      .update(body)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while updating workout" });
  }
});

// DELETE /api/workouts/:id - Delete workout
router.delete("/:id", auth, async (req, res) => {
  try {
    const { error: paramError } = workoutIdParamSchema.validate(req.params);
    if (paramError) {
      return res.status(400).json({ message: paramError.details[0].message });
    }

    const userClient = createAuthedSupabase(req.accessToken);

    // Check ownership
    const { data: existing, error: fetchError } = await userClient
      .from("workouts")
      .select("user_id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) return res.status(500).json({ message: fetchError.message });
    if (!existing) return res.status(404).json({ message: "Workout not found" });
    if (existing.user_id !== req.user.id) return res.status(403).json({ message: "Access denied" });

    const { error } = await userClient
      .from("workouts")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while deleting workout" });
  }
});

// POST /api/workouts/:id/finish - Mark workout as finished
router.post("/:id/finish", auth, async (req, res) => {
  try {
    const { error: paramError } = workoutIdParamSchema.validate(req.params);
    if (paramError) {
      return res.status(400).json({ message: paramError.details[0].message });
    }

    const { error: bodyError, value: body } = finishWorkoutSchema.validate(req.body);
    if (bodyError) {
      return res.status(400).json({ message: bodyError.details[0].message });
    }

    const userClient = createAuthedSupabase(req.accessToken);

    // Check ownership
    const { data: existing, error: fetchError } = await userClient
      .from("workouts")
      .select("user_id, started_at")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) return res.status(500).json({ message: fetchError.message });
    if (!existing) return res.status(404).json({ message: "Workout not found" });
    if (existing.user_id !== req.user.id) return res.status(403).json({ message: "Access denied" });

    // Calculate duration if not provided
    let updateData = { ...body };
    if (!updateData.duration_seconds) {
      const start = new Date(existing.started_at);
      const end = new Date(updateData.finished_at);
      updateData.duration_seconds = Math.floor((end - start) / 1000);
    }

    const { data, error } = await userClient
      .from("workouts")
      .update(updateData)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while finishing workout" });
  }
});

module.exports = router;
