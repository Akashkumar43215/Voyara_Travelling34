const mongoose = require("mongoose");

/**
 * ContactMessage Mongoose Model
 * A message sent from the Contact page. Admins read these on the dashboard.
 */
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },

    // set when the sender was logged in, so support can find their bookings
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    status: { type: String, enum: ["new", "read"], default: "new", index: true },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
