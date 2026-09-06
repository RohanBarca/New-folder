import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export const THEME_STORAGE_KEY = 'medsync-theme';

function getInitialTheme() {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme) {
    return document.documentElement.dataset.theme;
  }

  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  }

  return 'light';
}

export function applyTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isDark = theme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={`theme-toggle inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-[#137C8B] hover:text-[#137C8B] ${compact ? 'px-2.5' : ''}`}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
      <span className={compact ? 'sr-only sm:not-sr-only' : ''}>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
