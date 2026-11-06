import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "fixpoint-token";
const USER_KEY = "fixpoint-user";

export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};

export const getUserRole = () => getUser()?.role || null;

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Token maujood ho aur expire na hua ho
export const isTokenValid = () => {
  const token = getToken();
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    return !exp || exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const getDashboardPath = (role) => {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "PROVIDER") return "/provider/dashboard";
  if (role === "CUSTOMER") return "/customer/dashboard";
  return "/";
};