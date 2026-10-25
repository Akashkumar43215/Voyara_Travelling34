const express = require("express");

const { createMessage } = require("../controllers/contactController");

const router = express.Router();

router.post("/", createMessage);

module.exports = router;
