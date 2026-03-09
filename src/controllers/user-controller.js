const User = require("../models/user.model");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

function generateApiKey() {
  return crypto.randomBytes(24).toString("hex");
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
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}


module.exports = {
  registerUser,
  loginUser,
};