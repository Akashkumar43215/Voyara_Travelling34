/**
 * Gives an existing account admin rights (or removes them).
 *
 *   node scripts/makeAdmin.js you@example.com          -> make admin
 *   node scripts/makeAdmin.js you@example.com --remove -> back to a normal user
 *
 * The person must log out and back in afterwards, because the role is stored
 * inside their login token.
 */
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

const run = async () => {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const remove = process.argv.includes("--remove");

  if (!email) {
    console.error("Usage: node scripts/makeAdmin.js <email> [--remove]");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/voyara_db");

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: remove ? "user" : "admin" } },
    { new: true },
  );

  if (!user) {
    console.error(`No account found for ${email}. Register it on the website first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`${user.name} (${user.email}) is now: ${user.role}`);
  console.log("They must log out and log in again for this to take effect.");

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
