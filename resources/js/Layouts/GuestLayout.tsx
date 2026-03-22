import ThemeToggle from '@/components/ThemeToggle';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div
            className="relative flex min-h-screen items-center justify-center"
            style={{
                backgroundColor: 'hsl(var(--background))',
                backgroundImage:
                    'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
            }}
        >
            <div className="fixed right-4 top-4 z-50">
                <ThemeToggle />
            </div>

            {children}
        </div>
    );
}
