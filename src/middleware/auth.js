const { appClientKey } = require("../config/env");

function requireAppClientKey(req, res, next) {
  const authHeader = req.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token || token !== appClientKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

module.exports = {
  requireAppClientKey,
};

/*const User = require("../models/user.model");

async function requireAppClientKey(req, res, next) {
  const authHeader = req.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await User.findOne({ apiKey: token });
  if (!user) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  req.user = user;
  next();
}

module.exports = { requireAppClientKey }; */