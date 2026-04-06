const dotenv = require("dotenv");

dotenv.config();

const requiredVars = ["MONGODB_URI", "APP_CLIENT_KEY", "JWT_SECRET"];

for (const name of requiredVars) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  mongodbUri: process.env.MONGODB_URI,
  appClientKey: process.env.APP_CLIENT_KEY,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};
