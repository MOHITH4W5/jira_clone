import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const user = JSON.parse(raw) as { id?: string; role?: string };
        if (user?.id) {
          config.headers["X-User-Id"] = user.id;
        }
        if (user?.role) {
          config.headers["X-User-Role"] = user.role;
        }
      }
    } catch {
      // ignore malformed local user cache
    }
  }
  return config;
});

export default axiosInstance;
