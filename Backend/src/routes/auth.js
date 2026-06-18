const express = require("express");
const Joi = require("joi");
const { supabase } = require("../supabaseClient");

const router = express.Router();

// Schema for user registration - validates email and password format
const registerSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

// Schema for user login - validates email and password format
const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(1).required(),
});

// Converts Supabase session object to minimal payload (access_token, refresh_token, expires_in, token_type)
const toSessionPayload = (session) => {
  if (!session) {
    return null;
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type,
  };
};

// Converts Supabase user object to minimal payload (id, email) - prevents leaking sensitive auth data
const toUserPayload = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
};

// Middleware: Validates Bearer token from Authorization header, attaches user to req.user
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  req.user = data.user;
  next();
};

// POST /register - Create new user account with email and password
router.post("/register", async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, {
    abortEarly: true,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: value.email,
      password: value.password,
    });

    if (signUpError) {
      const message = signUpError.message || "Registration failed";
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes("already registered") || lowerMessage.includes("already been registered")) {
        return res.status(409).json({ message: "Email already in use" });
      }

      return res.status(400).json({ message });
    }

    return res.status(201).json({
      user: toUserPayload(data.user),
      session: toSessionPayload(data.session),
      email_confirmation_required: !data.session,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error during registration" });
  }
});

// POST /login - Authenticate user with email and password
router.post("/login", async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, {
    abortEarly: true,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: value.email,
      password: value.password,
    });

    if (signInError) {
      const message = signInError.message || "Invalid credentials";
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes("invalid login credentials")) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      return res.status(400).json({ message });
    }

    return res.status(200).json({
      user: toUserPayload(data.user),
      session: toSessionPayload(data.session),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unexpected error during login" });
  }
});

module.exports = router;