const Favorite = require("../models/Favorite");

const ITEM_TYPES = ["place", "stay"];

// GET /api/favorites  (auth)
const getMyFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: favorites.length,
      data: favorites,
    });
  } catch (error) {
    console.error("Get Favorites Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load favorites." });
  }
};

// POST /api/favorites/toggle  (auth) - adds the item, or removes it if already saved
const toggleFavorite = async (req, res) => {
  try {
    const { itemType, itemId, name, image, city, state, stateSlug } = req.body;

    if (!ITEM_TYPES.includes(itemType) || !itemId || !name) {
      return res.status(400).json({
        success: false,
        message: "itemType (place or stay), itemId and name are required.",
      });
    }

    const filter = {
      user: req.user.userId,
      itemType,
      itemId: String(itemId),
    };

    const existing = await Favorite.findOneAndDelete(filter);

    if (existing) {
      return res.status(200).json({
        success: true,
        favorited: false,
        message: "Removed from favorites.",
      });
    }

    await Favorite.create({
      ...filter,
      name,
      image: image || "",
      city: city || "",
      state: state || "",
      stateSlug: stateSlug || "",
    });

    return res.status(201).json({
      success: true,
      favorited: true,
      message: "Added to favorites.",
    });
  } catch (error) {
    // Two rapid toggles can race on the unique index; treat it as "already saved".
    if (error.code === 11000) {
      return res.status(200).json({ success: true, favorited: true });
    }

    console.error("Toggle Favorite Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update favorites." });
  }
};

module.exports = { getMyFavorites, toggleFavorite };
