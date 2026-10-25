// Contact details shown on the Contact page and in the footer.
// These are PLACEHOLDERS for the demo. Replace them with your real details before you go live.

export const SITE = {
  name: "VOYARA",
  tagline: "Smart Travel India",
  email: "support@voyara.example",
  phone: "+91 00000 00000",
  hours: "Monday to Saturday, 9:00 AM to 7:00 PM IST",
  address: ["VOYARA (demo project)", "India"],
  responseTime: "We usually reply within one working day.",
};

// Keep in step with SUBJECTS in server/services/contactValidation.js
export const CONTACT_SUBJECTS = [
  "Booking help",
  "Cancellation or refund",
  "Hotel or place information",
  "Feedback or suggestion",
  "Partnership",
  "Something else",
];

export const CONTACT_LIMITS = { name: 100, message: 2000, minMessage: 10 };
