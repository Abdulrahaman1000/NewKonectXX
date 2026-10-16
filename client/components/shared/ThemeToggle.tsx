import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

/** Sun / moon button. Saves the choice on this device only. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, setChoice } = useTheme();
  const next = resolved === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      onClick={() => setChoice(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${className}`}
    >
      {resolved === 'light' ? (
        <Moon className="w-5 h-5 text-white/80" />
      ) : (
        <Sun className="w-5 h-5 text-white/80" />
      )}
    </button>
  );
}
