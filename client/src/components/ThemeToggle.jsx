import { Moon, Sun } from "lucide-react";

import { useTheme } from "../context/ThemeContext";

/** Round button that switches between light and dark mode. */
const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span key={isDark ? "sun" : "moon"} className="theme-icon">
        {isDark ? <Sun size={19} /> : <Moon size={19} />}
      </span>
    </button>
  );
};

export default ThemeToggle;
