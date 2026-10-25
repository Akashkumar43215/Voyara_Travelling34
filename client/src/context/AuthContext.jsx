import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem("voyara_token") || ""
  );
  const [loading, setLoading] = useState(true);

  // Check existing login when app starts
  useEffect(() => {
    const checkAuthentication = async () => {
      const storedToken = localStorage.getItem("voyara_token");

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.data.success) {
          setUser(response.data.data);
          setToken(storedToken);
        }
      } catch (error) {
        const status = error.response?.status;

        // Only an expired or invalid login (401/403) signs the visitor out. A busy
        // server, a slow network or a rate limit must not throw away a valid login.
        if (status === 401 || status === 403) {
          localStorage.removeItem("voyara_token");
          setToken("");
          setUser(null);
        } else {
          console.warn("Could not check the login right now:", error.message);
          setToken(storedToken);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  // REGISTER
  const register = async (name, email, password) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    return response.data;
  };

  // LOGIN
  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    if (response.data.success) {
      const newToken = response.data.token;

      localStorage.setItem("voyara_token", newToken);

      setToken(newToken);
      setUser(response.data.data);
    }

    return response.data;
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("voyara_token");
    setToken("");
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
};