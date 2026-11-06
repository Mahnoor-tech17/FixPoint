const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const generateToken = (userId, role, extra = {}) => {
  const secret = process.env.SECRET_KEY || process.env.JWT_SECRET;
  return jwt.sign(
    {
      userId,
      role,
      ...extra,
    },
    secret,
    {
      expiresIn: "1d",
    },
  );
};

module.exports = generateToken;
