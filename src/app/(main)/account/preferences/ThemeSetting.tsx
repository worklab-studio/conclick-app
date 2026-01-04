import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/hooks/useTheme';

export function ThemeSetting() {
  const { theme, saveTheme } = useTheme();

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="opacity-50 cursor-not-allowed"
        title="Light mode disabled"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant="default"
        onClick={() => saveTheme('dark')}
        size="icon"
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  );
}
