import axios from "axios";
import { getToken, clearAuth } from "./local-storage";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLoginCall) {
      clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong";