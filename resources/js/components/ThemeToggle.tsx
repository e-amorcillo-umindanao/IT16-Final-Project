import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/Providers/ThemeProvider';

export default function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="relative overflow-hidden rounded-full border border-border bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <Sun
                className={`absolute h-4 w-4 transition-all duration-200 ${
                    isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-75 -rotate-90 opacity-0'
                }`}
            />
            <Moon
                className={`absolute h-4 w-4 transition-all duration-200 ${
                    isDark ? 'scale-75 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                }`}
            />
            <span className="sr-only">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</span>
        </Button>
    );
}
