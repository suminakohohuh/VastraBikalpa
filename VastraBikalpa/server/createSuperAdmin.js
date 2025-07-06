const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/Auth");

mongoose.connect(process.env.DATABASEURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async () => {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await User.updateOne(
    { email: "superadmin@gmail.com" },
    { $set: { password: hashedPassword } }
  );
  console.log("✅ Superadmin password updated.");
  process.exit();
})();
