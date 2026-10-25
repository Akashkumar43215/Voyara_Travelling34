const mongoose = require('mongoose');
const State = require('../models/State');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Helper to normalize state slugs and names
 * Handles aliases such as "Jammu & Kashmir" -> "jammu-and-kashmir"
 */
const normalizeSlug = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * @desc    Get all Indian States & Union Territories with optional search and region filters
 * @route   GET /api/states
 * @access  Public
 */
const getStates = async (req, res, next) => {
  try {
    const { search, region, type } = req.query;
    const filter = {};

    // Filter by Region
    if (region && region !== 'All Regions' && region.trim() !== '') {
      filter.region = region.trim();
    }

    // Filter by Type (State or Union Territory)
    if (type && type.trim() !== '') {
      filter.type = type.trim();
    }

    // Search by Name or Description (Case-insensitive)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { popularPlaces: searchRegex }
      ];
    }

    // Sort alphabetically by state name
    const states = await State.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: states.length,
      data: states
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single State or Union Territory by MongoDB ID or Slug (with normalization)
 * @route   GET /api/states/:id
 * @access  Public
 */
const getStateByIdOrSlug = async (req, res, next) => {
  try {
    const { id } = req.params;
    let state = null;

    // Check if parameter is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      state = await State.findById(id);
    }

    // If not found by ObjectId, search by normalized slug
    if (!state) {
      const normalized = normalizeSlug(id);
      state = await State.findOne({ slug: normalized });
    }

    // Secondary fallback: search by name case-insensitive
    if (!state) {
      const cleanedName = id.replace(/&/g, 'and').replace(/-/g, ' ');
      state = await State.findOne({
        name: new RegExp(`^${escapeRegex(cleanedName)}$`, 'i')
      });
    }

    if (!state) {
      return res.status(404).json({
        success: false,
        message: `Destination "${id}" not found. Verify state name or slug.`
      });
    }

    res.status(200).json({
      success: true,
      data: state
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStates,
  getStateByIdOrSlug,
  normalizeSlug
};

