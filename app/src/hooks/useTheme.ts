
import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    
    return savedTheme || "dark";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  return {
    theme,
    setTheme: (newTheme: "light" | "dark") => setTheme(newTheme),
    toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
  };
}