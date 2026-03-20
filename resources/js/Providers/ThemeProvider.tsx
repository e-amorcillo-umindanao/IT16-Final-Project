import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: ResolvedTheme;
};

const STORAGE_KEY = 'securevault_theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') {
        return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
    return theme === 'system' ? getSystemTheme() : theme;
}

export function ThemeProvider({ children }: PropsWithChildren) {
    const [theme, setTheme] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storedTheme = window.localStorage.getItem(STORAGE_KEY);
        const nextTheme: Theme =
            storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
                ? storedTheme
                : 'system';

        setTheme(nextTheme);
        setResolvedTheme(resolveTheme(nextTheme));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const nextResolvedTheme = resolveTheme(theme);
        setResolvedTheme(nextResolvedTheme);

        const root = window.document.documentElement;
        root.classList.toggle('dark', nextResolvedTheme === 'dark');
        root.style.colorScheme = nextResolvedTheme;
        window.localStorage.setItem(STORAGE_KEY, theme);

        if (theme !== 'system') {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const systemTheme = mediaQuery.matches ? 'dark' : 'light';
            setResolvedTheme(systemTheme);
            root.classList.toggle('dark', systemTheme === 'dark');
            root.style.colorScheme = systemTheme;
        };

        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [theme]);

    const value = useMemo(
        () => ({
            theme,
            setTheme,
            resolvedTheme,
        }),
        [theme, resolvedTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider.');
    }

    return context;
}
