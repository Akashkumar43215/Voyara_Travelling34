const jwt = require("jsonwebtoken");

const ContactMessage = require("../models/ContactMessage");
const User = require("../models/User");
const { validateContact } = require("../services/contactValidation");

// the sender may or may not be logged in: attach the account when a valid token is sent, ignore it otherwise
const optionalUserId = async (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const id = payload.userId;
    if (!id) return null;

    const user = await User.findById(id).select("_id").lean();
    return user ? user._id : null;
  } catch {
    return null;
  }
};

// POST /api/contact  (public) - saves a message from the Contact page
const createMessage = async (req, res) => {
  try {
    // hidden field that real visitors never fill in: bots do. Pretend it worked and save nothing.
    if (req.body && typeof req.body.website === "string" && req.body.website.trim() !== "") {
      return res.status(201).json({ success: true, message: "Thank you. Your message has been sent." });
    }

    const result = validateContact(req.body);

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: "Please check the highlighted fields.",
        errors: result.errors,
      });
    }

    await ContactMessage.create({ ...result.data, user: await optionalUserId(req) });

    return res.status(201).json({
      success: true,
      message: "Thank you. Your message has been sent and we will reply by email.",
    });
  } catch (error) {
    console.error("Contact Message Error:", error.message);
    return res.status(500).json({ success: false, message: "Your message could not be sent. Please try again." });
  }
};

// GET /api/admin/messages  (admin) - newest messages first
const getMessages = async (req, res) => {
  try {
    const [messages, unread] = await Promise.all([
      ContactMessage.find().sort({ createdAt: -1 }).limit(50).lean(),
      ContactMessage.countDocuments({ status: "new" }),
    ]);

    return res.status(200).json({ success: true, count: messages.length, unread, data: messages });
  } catch (error) {
    console.error("Get Messages Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load messages." });
  }
};

// PATCH /api/admin/messages/:id/read  (admin) - marks one message as read
const markMessageRead = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndUpdate(req.params.id, { status: "read" }, { new: true }).lean();

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    // a malformed id is a bad request, not a server fault
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid message id." });
    }

    console.error("Mark Message Read Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update the message." });
  }
};

module.exports = { createMessage, getMessages, markMessageRead };
