import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useTheme } from '@/hooks/use-theme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={
        isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
      }
      title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
