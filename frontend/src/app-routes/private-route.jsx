import { Navigate, useLocation } from "react-router-dom";
import {
  clearAuth,
  getDashboardPath,
  getUserRole,
  isTokenValid,
} from "../lib/local-storage";

// Sirf logged-in aur sahi role wale andar ja sakte hain
export const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();

  if (!isTokenValid()) {
    clearAuth();
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = getUserRole();

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
};

// Login, register jaise pages: pehle se logged-in user ko dashboard par bhej do
export const PublicRoute = ({ children }) => {
  if (isTokenValid()) {
    return <Navigate to={getDashboardPath(getUserRole())} replace />;
  }
  return children;
};