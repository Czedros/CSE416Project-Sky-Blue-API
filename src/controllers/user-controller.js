const User = require("../models/user.model");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function generateApiKey() {
  return crypto.randomBytes(24).toString("hex");
}

// AI generated
function createJwt(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
    },
    env.jwtSecret,
    {
      expiresIn: "24h",
    }
  );
}

async function registerUser(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const apiKey = generateApiKey();

    const user = await User.create({
      username,
      passwordHash,
      apiKey,
    });

    return res.status(201).json({
      username: user.username,
      apiKey: user.apiKey,
      token: createJwt(user),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

async function loginUser(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    return res.json({
      username: user.username,
      apiKey: user.apiKey,
      token: createJwt(user),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

async function generateApiKeyForUser(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    user.apiKey = generateApiKey();
    await user.save();

    return res.json({ apiKey: user.apiKey });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerUser,
  loginUser,
  generateApiKeyForUser,
};