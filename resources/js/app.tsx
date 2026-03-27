import '../css/app.css';
import './bootstrap';

import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/Providers/ThemeProvider';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot, hydrateRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'SecureVault';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        if (import.meta.env.SSR) {
            hydrateRoot(
                el,
                <ThemeProvider>
                    <App {...props} />
                    <Toaster position="top-right" />
                </ThemeProvider>,
            );
            return;
        }

        createRoot(el).render(
            <ThemeProvider>
                <App {...props} />
                <Toaster position="top-right" />
            </ThemeProvider>,
        );
    },
    progress: {
        color: '#D4A843',
    },
});
