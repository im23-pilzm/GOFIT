const express = require("express");
const Joi = require("joi");
const { supabase } = require("../supabaseClient");

const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
  username: Joi.string().trim().min(2).max(50),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(1).required(),
});

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

const toUserPayload = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
};

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
      options: value.username
        ? {
            data: {
              username: value.username,
            },
          }
        : undefined,
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