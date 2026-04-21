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

const exerciseIdParamSchema = Joi.object({
  id: uuidSchema.required(),
});

const listQuerySchema = Joi.object({
  is_public: Joi.boolean(),
  created_by: uuidSchema,
});

const createExerciseSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  equipment_id: Joi.number().integer().allow(null),
  exercise_type_id: Joi.number().integer().allow(null),
  image_url: Joi.string().uri().allow(null, ""),
  is_public: Joi.boolean().default(false),
});

const updateExerciseSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  equipment_id: Joi.number().integer().allow(null),
  exercise_type_id: Joi.number().integer().allow(null),
  image_url: Joi.string().uri().allow(null, ""),
  is_public: Joi.boolean(),
}).min(1);

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

const validateExerciseId = (req, res, next) => {
  const { error } = exerciseIdParamSchema.validate(req.params);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  return next();
};

const validateCreateBody = (req, res, next) => {
  const { error, value } = createExerciseSchema.validate(req.body, {
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

const validateUpdateBody = (req, res, next) => {
  const { error, value } = updateExerciseSchema.validate(req.body, {
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

// GET /api/exercises - List exercises (with filters)
router.get("/", auth, validateQuery, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);
    const { is_public, created_by } = req.validatedQuery;

    let query = userClient
      .from("exercises")
      .select("*")
      .order("created_at", { ascending: false });

    // Filtering logic:
    // 1. Users can see all public exercises.
    // 2. Users can see their own exercises (even if private).
    // By default, if no filter is provided, we should probably show what they are allowed to see.
    // Supabase RLS should handle this, but we can also be explicit in the query.

    if (is_public !== undefined) {
      query = query.eq("is_public", is_public);
    }

    if (created_by) {
      query = query.eq("created_by", created_by);
    }

    // Explicitly handle visibility if not handled by RLS:
    // We want: (is_public = true) OR (created_by = current_user_id)
    if (is_public === undefined && !created_by) {
      query = query.or(`is_public.eq.true,created_by.eq.${req.user.id}`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json(data ?? []);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while listing exercises" });
  }
});

// GET /api/exercises/:id - Get exercise details
router.get("/:id", auth, validateExerciseId, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);
    const { data, error } = await userClient
      .from("exercises")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // Check if the user has access to this exercise (if it's not public and not theirs)
    if (!data.is_public && data.created_by !== req.user.id) {
      return res.status(403).json({ message: "You do not have permission to view this exercise" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while fetching exercise details" });
  }
});

// POST /api/exercises - Create new exercise
router.post("/", auth, validateCreateBody, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);
    const insertPayload = {
      ...req.validatedBody,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await userClient
      .from("exercises")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while creating exercise" });
  }
});

// PUT /api/exercises/:id - Update exercise
router.put("/:id", auth, validateExerciseId, validateUpdateBody, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);

    // First check ownership
    const { data: existing, error: fetchError } = await userClient
      .from("exercises")
      .select("created_by")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ message: fetchError.message });
    }

    if (!existing) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own exercises" });
    }

    const { data, error } = await userClient
      .from("exercises")
      .update(req.validatedBody)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while updating exercise" });
  }
});

// DELETE /api/exercises/:id - Delete exercise
router.delete("/:id", auth, validateExerciseId, async (req, res) => {
  try {
    const userClient = createAuthedSupabase(req.accessToken);

    // First check ownership
    const { data: existing, error: fetchError } = await userClient
      .from("exercises")
      .select("created_by")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ message: fetchError.message });
    }

    if (!existing) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own exercises" });
    }

    const { error } = await userClient
      .from("exercises")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error while deleting exercise" });
  }
});

module.exports = router;
