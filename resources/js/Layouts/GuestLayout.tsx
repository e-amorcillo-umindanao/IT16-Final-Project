import ThemeToggle from '@/components/ThemeToggle';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div 
            className="relative min-h-screen bg-background"
            style={{
                backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
            }}
        >
            {/* Fixed theme toggle — top-right corner */}
            <div className="fixed right-4 top-4 z-50">
                <ThemeToggle />
            </div>

            {/* Page content — Login/Register etc. own their own layout */}
            {children}
        </div>
    );
}
