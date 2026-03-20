import ApplicationLogo from '@/components/ApplicationLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center bg-background px-4 pt-10 sm:justify-center sm:pt-0">
            <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>
            <div>
                <Link href="/">
                    <div className="flex flex-col items-center">
                        <ApplicationLogo className="h-12 w-auto text-foreground" />
                        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            Secure Document Management
                        </p>
                    </div>
                </Link>
            </div>

            <div className="noir-card-glow mt-6 w-full overflow-hidden rounded-xl border border-border bg-card px-6 py-6 sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
