import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const Login = () => {
  const { t: tx } = useLanguage();

  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!formData.email || !formData.password) {
      setError(tx("Please enter your email and password."));
      return;
    }

    try {
      setLoading(true);

      const response = await login(
        formData.email,
        formData.password
      );

      if (!response.success) {
        setError(
          response.message || tx("Login failed. Please try again.")
        );
        return;
      }

      // Return to the page user originally wanted,
      // otherwise go to home.
      const from = location.state?.from;

      if (from && typeof from === "object") {
        navigate(from.pathname || "/", {
          replace: true,
          state: from.state,
        });
      } else {
        navigate(from || "/", { replace: true });
      }
    } catch (error) {
      console.error("Login Error:", error);

      setError(
        error.response?.data?.message ||
          tx("Unable to login right now. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon">
            <LogIn size={26} />
          </div>

          <h1>{tx("Welcome Back")}</h1>

          {location.state?.message && (
            <p className="auth-notice">{location.state.message}</p>
          )}

          <p>
            {tx("Login to your VOYARA account and continue planning your journey.")}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {/* Email */}
          <div className="auth-field">
            <label htmlFor="email">
              {tx("Email Address")}
            </label>

            <div className="auth-input-wrapper">
              <Mail size={18} />

              <input
                id="email"
                type="email"
                name="email"
                placeholder={tx("Enter your email")}
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="password">
              {tx("Password")}
            </label>

            <div className="auth-input-wrapper">
              <Lock size={18} />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={tx("Enter your password")}
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword
                    ? tx("Hide password")
                    : tx("Show password")
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              tx("Logging in...")
            ) : (
              <>
                <LogIn size={18} />
                {tx("Login")}
              </>
            )}
          </button>
        </form>

        {/* Register */}
        <div className="auth-footer">
          <span>{tx("Don't have an account?")}</span>

          <Link to="/register" state={location.state}>
            {tx("Create an account")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;