const mongoose = require("mongoose");
const Room = require("../models/Room");
const Stay = require("../models/Stay");
const { ensureDefaultRooms } = require("../services/roomService");

// ============================================================
// GET ROOMS FOR A STAY
// GET /api/rooms/stay/:stayId
// ============================================================
const getRoomsByStay = async (req, res) => {
  try {
    const { stayId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(stayId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stay ID.",
      });
    }

    const findRooms = () =>
      Room.find({
        stay: stayId,
        isActive: true,
      }).sort({
        pricePerNight: 1,
      });

    let rooms = await findRooms();

    // A saved stay with no inventory yet gets the default room types
    if (rooms.length === 0) {
      const stay = await Stay.findById(stayId);

      if (stay) {
        await ensureDefaultRooms(stay);
        rooms = await findRooms();
      }
    }

    return res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    console.error("Get Rooms Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms.",
      error: error.message,
    });
  }
};

// ============================================================
// GET SINGLE ROOM
// GET /api/rooms/:roomId
// ============================================================
const getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID.",
      });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("Get Room Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch room.",
      error: error.message,
    });
  }
};

module.exports = {
  getRoomsByStay,
  getRoomById,
};