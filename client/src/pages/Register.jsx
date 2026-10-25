import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const Register = () => {
  const { t: tx } = useLanguage();

  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setSuccess("");

    const { name, email, password, confirmPassword } =
      formData;

    if (!name || !email || !password || !confirmPassword) {
      setError(tx("Please fill in all fields."));
      return;
    }

    if (name.trim().length < 2) {
      setError(tx("Name must contain at least 2 characters."));
      return;
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(
        tx("Password must be at least 8 characters and include a letter and a number.")
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(tx("Passwords do not match."));
      return;
    }

    try {
      setLoading(true);

      const response = await register(
        name.trim(),
        email.trim(),
        password
      );

      if (!response.success) {
        setError(
          response.message ||
            tx("Registration failed. Please try again.")
        );
        return;
      }

      setSuccess(
        tx("Account created successfully. Redirecting to login...")
      );

      setTimeout(() => {
        navigate("/login", { replace: true, state: location.state });
      }, 1200);
    } catch (error) {
      console.error("Registration Error:", error);

      setError(
        error.response?.data?.message ||
          tx("Unable to create your account right now.")
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
            <UserPlus size={26} />
          </div>

          <h1>{tx("Create Account")}</h1>

          <p>
            {tx("Join VOYARA and start planning your next journey across India.")}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="auth-success">
            {success}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {/* Name */}
          <div className="auth-field">
            <label htmlFor="name">
              {tx("Full Name")}
            </label>

            <div className="auth-input-wrapper">
              <User size={18} />

              <input
                id="name"
                type="text"
                name="name"
                placeholder={tx("Enter your full name")}
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          </div>

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
                type={
                  showPassword ? "text" : "password"
                }
                name="password"
                placeholder={tx("8+ characters, with a letter and a number")}
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
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

          {/* Confirm Password */}
          <div className="auth-field">
            <label htmlFor="confirmPassword">
              {tx("Confirm Password")}
            </label>

            <div className="auth-input-wrapper">
              <Lock size={18} />

              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                name="confirmPassword"
                placeholder={tx("Re-enter your password")}
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
              >
                {showConfirmPassword ? (
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
              tx("Creating Account...")
            ) : (
              <>
                <UserPlus size={18} />
                {tx("Create Account")}
              </>
            )}
          </button>
        </form>

        {/* Login */}
        <div className="auth-footer">
          <span>{tx("Already have an account?")}</span>

          <Link to="/login">
            {tx("Login")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;