const express = require("express");

const { chat } = require("../controllers/assistantController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", optionalAuth, chat);

module.exports = router;
