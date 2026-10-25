// Checks a message from the Contact page. Pure logic, no database, so it is easy to test.

const SUBJECTS = [
  "Booking help",
  "Cancellation or refund",
  "Hotel or place information",
  "Feedback or suggestion",
  "Partnership",
  "Something else",
];

const LIMITS = {
  name: { min: 2, max: 100 },
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 2000 },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// collapses runs of spaces and strips control characters, keeps line breaks in the message
const clean = (value, { multiline = false } = {}) => {
  const text = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const tidy = multiline ? text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : text.replace(/\s+/g, " ");

  return tidy.trim();
};

/**
 * Returns { ok: true, data } with tidy values, or { ok: false, errors } where errors maps a
 * field name to a message the visitor can read.
 */
const validateContact = (input) => {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};

  // anything that is not plain text (objects, arrays) is rejected, which also blocks operator injection
  for (const field of ["name", "email", "subject", "message"]) {
    if (typeof body[field] !== "string") errors[field] = "This field is required.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const data = {
    name: clean(body.name),
    email: clean(body.email).toLowerCase(),
    subject: clean(body.subject),
    message: clean(body.message, { multiline: true }),
  };

  if (data.name.length < LIMITS.name.min) errors.name = "Please enter your name.";
  else if (data.name.length > LIMITS.name.max) errors.name = `Keep your name under ${LIMITS.name.max} characters.`;

  if (!EMAIL_PATTERN.test(data.email) || data.email.length > 254) errors.email = "Please enter a valid email address.";

  if (data.subject.length < LIMITS.subject.min) errors.subject = "Please choose or write a subject.";
  else if (data.subject.length > LIMITS.subject.max) errors.subject = `Keep the subject under ${LIMITS.subject.max} characters.`;

  if (data.message.length < LIMITS.message.min) errors.message = `Please write at least ${LIMITS.message.min} characters.`;
  else if (data.message.length > LIMITS.message.max) errors.message = `Keep the message under ${LIMITS.message.max} characters.`;

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
};

module.exports = { validateContact, SUBJECTS, LIMITS };
