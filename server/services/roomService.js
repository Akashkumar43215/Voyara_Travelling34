const Room = require("../models/Room");
const { detectStayType } = require("./stayImageService");
const { standardRoomPrice } = require("./stayProfile");

/**
 * Stays come from Geoapify and have no room inventory of their own, so each
 * saved stay gets a standard set of room types. Prices scale with the kind of
 * property and vary slightly (but stably) per stay, so listings differ.
 */

const ROOM_TEMPLATES = [
  {
    name: "Standard Room",
    description: "Comfortable room suitable for couples and solo travelers.",
    pricePerNight: 2499,
    maxGuests: 2,
    totalRooms: 4,
    amenities: ["Free WiFi", "Air Conditioning", "TV", "Private Bathroom", "Room Service"],
  },
  {
    name: "Deluxe Room",
    description: "Spacious deluxe room with additional comfort and modern amenities.",
    pricePerNight: 3499,
    maxGuests: 3,
    totalRooms: 3,
    amenities: ["Free WiFi", "Air Conditioning", "TV", "Private Bathroom", "Breakfast", "Room Service"],
  },
  {
    name: "Family Room",
    description: "Large family room designed for families and small groups.",
    pricePerNight: 4499,
    maxGuests: 4,
    totalRooms: 2,
    amenities: [
      "Free WiFi",
      "Air Conditioning",
      "TV",
      "Private Bathroom",
      "Breakfast",
      "Room Service",
      "Extra Bed",
    ],
  },
];

const roundToHundred = (value) => Math.max(500, Math.round(value / 100) * 100);

/**
 * Creates any missing default rooms for a stay. Safe to call repeatedly.
 * Returns the number of rooms created.
 */
const ensureDefaultRooms = async (stay) => {
  const type = detectStayType({
    name: stay.name,
    categories: [stay.category].filter(Boolean),
  });

  // Standard Room price; Deluxe and Family scale from it (template ratios below)
  const standard = standardRoomPrice(
    { geoapifyPlaceId: stay.geoapifyPlaceId, _id: stay._id, name: stay.name },
    type
  );

  let created = 0;

  for (const template of ROOM_TEMPLATES) {
    const exists = await Room.exists({ stay: stay._id, name: template.name });

    if (exists) continue;

    await Room.create({
      stay: stay._id,
      ...template,
      pricePerNight: roundToHundred((standard * template.pricePerNight) / ROOM_TEMPLATES[0].pricePerNight),
      availableRooms: template.totalRooms,
    });

    created += 1;
  }

  return created;
};

module.exports = { ensureDefaultRooms, ROOM_TEMPLATES };
