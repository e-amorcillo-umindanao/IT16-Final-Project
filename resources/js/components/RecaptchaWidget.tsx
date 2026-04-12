import {
    onRecaptchaExpired,
    onRecaptchaSuccess,
    setRecaptchaAvailable,
    setRecaptchaUnavailable,
} from '@/lib/recaptcha';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        __recaptchaOnLoad?: () => void;
        __recaptchaSuccess?: (token: string) => void;
        __recaptchaExpired?: () => void;
    }
}

interface RecaptchaWidgetProps {
    onReady?: () => void;
}

export default function RecaptchaWidget({ onReady }: RecaptchaWidgetProps) {
    const { recaptchaSiteKey } = usePage<PageProps>().props;
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);

    useEffect(() => {
        const siteKey = recaptchaSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY;

        if (! siteKey) {
            setRecaptchaUnavailable();
            return;
        }

        window.__recaptchaSuccess = onRecaptchaSuccess;
        window.__recaptchaExpired = onRecaptchaExpired;

        const renderWidget = () => {
            const grecaptcha = window.grecaptcha;

            if (! containerRef.current || widgetIdRef.current !== null || typeof grecaptcha === 'undefined') {
                return;
            }

            widgetIdRef.current = grecaptcha.render(containerRef.current, {
                sitekey: siteKey,
                callback: '__recaptchaSuccess',
                'expired-callback': '__recaptchaExpired',
                theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                size: 'normal',
            });

            setRecaptchaAvailable(() => {
                if (widgetIdRef.current !== null) {
                    window.grecaptcha?.reset(widgetIdRef.current);
                }
            });

            onReady?.();
        };

        if (typeof window.grecaptcha !== 'undefined') {
            renderWidget();
            return;
        }

        window.__recaptchaOnLoad = renderWidget;

        const existing = document.querySelector<HTMLScriptElement>('script[data-recaptcha-v2]');

        if (existing) {
            existing.addEventListener('error', setRecaptchaUnavailable);
            return () => existing.removeEventListener('error', setRecaptchaUnavailable);
        }

        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit&onload=__recaptchaOnLoad';
        script.async = true;
        script.defer = true;
        script.dataset.recaptchaV2 = 'true';
        script.onerror = () => setRecaptchaUnavailable();
        document.head.appendChild(script);

        return () => {
            script.onerror = null;
        };
    }, [onReady, recaptchaSiteKey]);

    return (
        <div
            ref={containerRef}
            className="min-h-[78px]"
            aria-label="reCAPTCHA human verification checkbox"
        />
    );
}
