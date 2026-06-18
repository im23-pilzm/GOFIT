const express = require("express");
const Joi = require("joi");
const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../supabaseClient");

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Creates Supabase client authenticated with user's access token for RLS-protected queries
const createAuthedSupabase = (accessToken) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

// Schema for validating UUID format (version 4 or 5)
const uuidSchema = Joi.string().guid({ version: ["uuidv4", "uuidv5"] });

// Schema for validating schedule entry ID parameter
const scheduleIdParamSchema = Joi.object({
  scheduleId: uuidSchema.required(),
});

// Schema for schedule list query - filter by date range or workout_id
const listQuerySchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  workout_id: uuidSchema,
});

// Schema for schedule creation - workout_id optional, workout_name and scheduled_for required
const createScheduleSchema = Joi.object({
  workout_id: uuidSchema.allow(null),
  workout_name: Joi.string().trim().min(1).max(120).required(),
  scheduled_for: Joi.date().iso().required(),
});

// Schema for schedule update - allows partial updates
const updateScheduleSchema = Joi.object({
  workout_id: uuidSchema.allow(null),
  workout_name: Joi.string().trim().min(1).max(120),
  scheduled_for: Joi.date().iso(),
}).min(1);

// Middleware: Authenticates user from Bearer token, sets req.user and req.accessToken
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

// Middleware: Validates and sanitizes schedule list query parameters
const validateQuery = (req, res, next) => {
  const { error, value } = listQuerySchema.validate(req.query, {
    abortEarly: true,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  req.validatedQuery = value;
  return next();
};

// Middleware: Validates schedule ID parameter (must be valid UUID)
const validateScheduleId = (req, res, next) => {
  const { error } = scheduleIdParamSchema.validate(req.params);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  return next();
};

// Middleware: Validates schedule creation body
const validateCreateBody = (req, res, next) => {
  const { error, value } = createScheduleSchema.validate(req.body, {
    abortEarly: true,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  req.validatedBody = value;
  return next();
};

// Middleware: Validates schedule update body
const validateUpdateBody = (req, res, next) => {
  const { error, value } = updateScheduleSchema.validate(req.body, {
    abortEarly: true,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  req.validatedBody = value;
  return next();
};

// Helper: Verify user owns the workout before scheduling it
const ensureWorkoutOwnership = async (accessToken, userId, workoutId) => {
  if (!workoutId) {
    return { ok: true };
  }

  const userClient = createAuthedSupabase(accessToken);
  const { data, error } = await userClient
    .from("workouts")
    .select("id")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, message: error.message };
  }

  if (!data) {
    return { ok: false, status: 400, message: "workout_id does not belong to current user" };
  }

  return { ok: true };
};

// GET /api/workout-schedule - List user's scheduled workouts (filterable by date range or workout_id)
router.get("/", auth, validateQuery, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);
    const { from, to, workout_id: workoutId } = req.validatedQuery;

    let query = userClient
      .from("workout_schedule")
      .select("id, user_id, workout_id, workout_name, scheduled_for, created_at")
      .eq("user_id", req.user.id)
      .order("scheduled_for", { ascending: true });

    if (from) {
      query = query.gte("scheduled_for", new Date(from).toISOString());
    }

    if (to) {
      query = query.lte("scheduled_for", new Date(to).toISOString());
    }

    if (workoutId) {
      query = query.eq("workout_id", workoutId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json(data ?? []);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while listing schedule" });
  }
});

// POST /api/workout-schedule - Create new schedule entry
router.post("/", auth, validateCreateBody, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);
    const ownership = await ensureWorkoutOwnership(req.accessToken, req.user.id, req.validatedBody.workout_id);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const insertPayload = {
      user_id: req.user.id,
      workout_id: req.validatedBody.workout_id ?? null,
      workout_name: req.validatedBody.workout_name,
      scheduled_for: new Date(req.validatedBody.scheduled_for).toISOString(),
    };

    const { data, error } = await userClient
      .from("workout_schedule")
      .insert(insertPayload)
      .select("id, user_id, workout_id, workout_name, scheduled_for, created_at")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while creating schedule entry" });
  }
});

// PUT /api/workout-schedule/:scheduleId - Update schedule entry (owner only)
router.put("/:scheduleId", auth, validateScheduleId, validateUpdateBody, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);
    if (Object.prototype.hasOwnProperty.call(req.validatedBody, "workout_id")) {
      const ownership = await ensureWorkoutOwnership(req.accessToken, req.user.id, req.validatedBody.workout_id);
      if (!ownership.ok) {
        return res.status(ownership.status).json({ message: ownership.message });
      }
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.validatedBody, "workout_id")) {
      updates.workout_id = req.validatedBody.workout_id ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(req.validatedBody, "workout_name")) {
      updates.workout_name = req.validatedBody.workout_name;
    }

    if (Object.prototype.hasOwnProperty.call(req.validatedBody, "scheduled_for")) {
      updates.scheduled_for = new Date(req.validatedBody.scheduled_for).toISOString();
    }

    const { data, error } = await userClient
      .from("workout_schedule")
      .update(updates)
      .eq("id", req.params.scheduleId)
      .eq("user_id", req.user.id)
      .select("id, user_id, workout_id, workout_name, scheduled_for, created_at")
      .maybeSingle();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: "Schedule entry not found" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while updating schedule entry" });
  }
});

// DELETE /api/workout-schedule/:scheduleId - Delete schedule entry (owner only)
router.delete("/:scheduleId", auth, validateScheduleId, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);
    const { data, error } = await userClient
      .from("workout_schedule")
      .delete()
      .eq("id", req.params.scheduleId)
      .eq("user_id", req.user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: "Schedule entry not found" });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while deleting schedule entry" });
  }
});

module.exports = router;
