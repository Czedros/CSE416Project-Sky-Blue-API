const express = require("express");
const {
  getPlayers,
  getPlayerById,
  updatePlayerNotes,
} = require("../controllers/players-controller");

const router = express.Router();

router.get("/", getPlayers);
router.get("/:playerId", getPlayerById);
router.put("/:playerId/notes", updatePlayerNotes);

module.exports = router;
