const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { supabase } = require("../supabaseClient");

const idParamSchema = Joi.object({
  id: Joi.string().trim().min(1).required(),
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(2).max(50),
  avatar_url: Joi.string().uri().allow(null),
}).min(1);

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

const validateId = (req, res, next) => {
  const { error } = idParamSchema.validate(req.params);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};

const ensureSelf = (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

router.use("/:id", auth, validateId, ensureSelf);

router.get("/:id", async (req, res) => {
  const userId = req.params.id;

  const { data, error } = await supabase
    .from("users")
    .select("id, email, username, avatar_url, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(data);
});

router.put("/:id", async (req, res) => {
  const userId = req.params.id;

  const { error } = updateUserSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(req.body, "username")) {
    updates.username = req.body.username;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "avatar_url")) {
    updates.avatar_url = req.body.avatar_url;
  }

  const { data, error: updateError } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("id, email, username, avatar_url, created_at")
    .single();

  if (updateError) {  
    return res.status(400).json({ message: updateError.message });
  }
  if (!data) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(data);
});

module.exports = router;