const express = require("express");

const {
  getRoomsByStay,
  getRoomById,
} = require("../controllers/roomController");

const router = express.Router();

// Get all rooms for a specific stay
router.get("/stay/:stayId", getRoomsByStay);

// Get one room by ID
router.get("/:roomId", getRoomById);

module.exports = router;