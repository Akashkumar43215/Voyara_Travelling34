const express = require('express');
const router = express.Router();
const { getStates, getStateByIdOrSlug } = require('../controllers/stateController');

// Route: GET /api/states - Fetch all states with optional search and region filters
router.get('/', getStates);

// Route: GET /api/states/:id - Fetch single state by MongoDB ID or normalized slug
router.get('/:id', getStateByIdOrSlug);

module.exports = router;

