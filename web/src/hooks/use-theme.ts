import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const listeners = new Set<() => void>();

const getSnapshot = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(STORAGE_KEY, theme);
  listeners.forEach((listener) => listener());
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'light');
  const toggleTheme = useCallback(
    () => applyTheme(getSnapshot() === 'dark' ? 'light' : 'dark'),
    [],
  );
  return { theme, toggleTheme };
}
