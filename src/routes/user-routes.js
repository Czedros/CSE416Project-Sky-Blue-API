const express = require("express");
const {
  registerUser,
  loginUser,
  generateApiKeyForUser,
} = require("../controllers/user-controller");
const { requireJwtAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/generateapikey", requireJwtAuth, generateApiKeyForUser);

module.exports = router;