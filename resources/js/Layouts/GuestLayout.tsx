import ThemeToggle from '@/components/ThemeToggle';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="guest-layout-surface relative flex min-h-screen items-center justify-center">
            <div className="fixed right-4 top-4 z-50">
                <ThemeToggle />
            </div>

            {children}
        </div>
    );
}
