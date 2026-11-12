// Single source of truth for password strength rules (backend)
const PASSWORD_MESSAGE =
  "Password must be 8-100 characters and include an uppercase letter, a lowercase letter, a number and a special character";

const getPasswordError = (password) => {
  if (typeof password !== "string" || !password) return "Password is required";
  if (
    password.length < 8 ||
    password.length > 100 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return PASSWORD_MESSAGE;
  }
  return null;
};

module.exports = { getPasswordError, PASSWORD_MESSAGE };