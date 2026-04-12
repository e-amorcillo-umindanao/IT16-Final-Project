import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { AxiosInstance } from 'axios';
import { route as ziggyRoute } from 'ziggy-js';
import { PageProps as AppPageProps } from './';

declare global {
    interface Window {
        axios: AxiosInstance;
        grecaptcha?: {
            ready: (cb: () => void) => void;
            render: (
                container: HTMLElement,
                parameters: {
                    sitekey: string;
                    callback: string;
                    'expired-callback': string;
                    theme: 'light' | 'dark';
                    size: 'normal' | 'compact';
                }
            ) => number;
            reset: (widgetId?: number) => void;
        };
    }

    /* eslint-disable no-var */
    var route: typeof ziggyRoute;
}

declare module '@inertiajs/core' {
    interface PageProps extends InertiaPageProps, AppPageProps {}
}
