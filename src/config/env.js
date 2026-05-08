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
  syncMlbOnStartup: String(process.env.SYNC_MLB_ON_STARTUP || "false").toLowerCase() === "true",
  syncMlbRosterType: process.env.SYNC_MLB_ROSTER_TYPE || "40Man",
  syncMlbSeasonsBack: Number(process.env.SYNC_MLB_SEASONS_BACK || 3),
  syncMlbLookbackDays: Number(process.env.SYNC_MLB_LOOKBACK_DAYS || 30),
  syncMlbConcurrency: Number(process.env.SYNC_MLB_CONCURRENCY || 8),
  syncMlbReplaceCatalog:
    String(process.env.SYNC_MLB_REPLACE_CATALOG || "false").toLowerCase() === "true",
  lahmanBattingCsvPath: process.env.LAHMAN_BATTING_CSV_PATH || "",
  lahmanPitchingCsvPath: process.env.LAHMAN_PITCHING_CSV_PATH || "",
  lahmanPeopleCsvPath: process.env.LAHMAN_PEOPLE_CSV_PATH || "",
  chadwickRegisterCsvPath: process.env.CHADWICK_REGISTER_CSV_PATH || "",
  fangraphsDepthCsvPath: process.env.FANGRAPHS_DEPTH_CSV_PATH || "",
};
