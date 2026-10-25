import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Wraps pages that need an account (traveler details, review, payment).
 * Visitors are sent to the login page and brought back here, with the trip they
 * had built, once they have logged in.
 */
const RequireLogin = ({ children }) => {
  const { t: tx } = useLanguage();

  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Still checking a saved login: don't bounce a logged-in user to the login page
  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
        {tx("Checking your login...")}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: { pathname: location.pathname, state: location.state },
          message: "Please log in to continue your booking. Your trip details are saved.",
        }}
      />
    );
  }

  return children;
};

export default RequireLogin;
