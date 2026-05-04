const express = require("express");
const {
  getPlayers,
  getPlayerById,
  getPlayerValuationLegacy,
  createCustomPlayer,
  valuateMultiplePlayers,
  valuateAllPlayers,
} = require("../controllers/players-controller");

const router = express.Router();

router.get("/", getPlayers);
router.post("/", createCustomPlayer);
router.post("/value", valuateMultiplePlayers);
router.post("/value/all", valuateAllPlayers);
router.get("/:playerId/valuation", getPlayerValuationLegacy);
router.get("/:playerId", getPlayerById);

module.exports = router;
