const express = require('express');
const router = express.Router();
const { getPlaces, getPlaceById } = require('../controllers/placeController');

// GET /api/places?state=rajasthan
router.get('/', getPlaces);

// GET /api/places/:id
router.get('/:id', getPlaceById);

module.exports = router;
