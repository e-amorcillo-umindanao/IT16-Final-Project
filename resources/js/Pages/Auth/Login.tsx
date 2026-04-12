import AppLogo from '@/components/AppLogo';
import RecaptchaWidget from '@/components/RecaptchaWidget';
import GuestLayout from '@/Layouts/GuestLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getRecaptchaToken, resetRecaptchaToken } from '@/lib/recaptcha';
import { cn } from '@/lib/utils';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Check,
    AlertTriangle,
    Eye,
    EyeOff,
    Loader2,
    Mail,
    Lock,
    Shield,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import type { PageProps } from '@/types';

type LoginFormData = {
    email: string;
    password: string;
    recaptcha_token: string;
};

type LoginForm = {
    data: LoginFormData;
    setData: (key: keyof LoginFormData, value: string) => void;
};

type DemoAccountFillerProps = {
    isOpen: boolean;
    form: LoginForm;
    prefersReducedMotion: boolean;
};

const demoAccounts = [
    {
        label: 'Super Admin',
        email: 'admin@securevault.test',
        password: 'SecureVault@2026',
        ariaLabel: 'Fill Super Admin credentials',
        icon: ShieldCheck,
        className:
            'bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-400',
        activeBorderClassName: 'border-amber-500/50',
    },
    {
        label: 'Admin',
        email: 'admin.user@securevault.test',
        password: 'SecureVaultAdmin@2026',
        ariaLabel: 'Fill Admin credentials',
        icon: Shield,
        className:
            'bg-blue-500/15 text-blue-600 hover:bg-blue-500/15 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400',
        activeBorderClassName: 'border-blue-500/50',
    },
] as const;

function DemoAccountFiller({
    isOpen,
    form,
    prefersReducedMotion,
}: DemoAccountFillerProps) {
    return (
        <div
            role="region"
            aria-label="Demo account quick fill"
            aria-hidden={!isOpen}
            className={cn('overflow-hidden', !isOpen && 'pointer-events-none')}
            style={{
                maxHeight: isOpen ? '500px' : '0px',
                opacity: isOpen ? 1 : 0,
                transition: prefersReducedMotion
                    ? 'none'
                    : 'max-height 400ms ease, opacity 300ms ease',
            }}
        >
            <div className="pt-4">
                <div className="relative">
                    <Separator />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="bg-card px-2 text-xs text-muted-foreground">
                            Demo Accounts
                        </span>
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    {demoAccounts.map((account) => {
                        const Icon = account.icon;
                        const isActive = form.data.email === account.email;

                        return (
                            <Button
                                key={account.email}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!isOpen}
                                aria-label={account.ariaLabel}
                                className={cn(
                                    'flex-1 gap-1.5 border-input',
                                    account.className,
                                    isActive && account.activeBorderClassName
                                )}
                                onClick={() => {
                                    form.setData('email', account.email);
                                    form.setData('password', account.password);
                                }}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{account.label}</span>
                                {isActive && <Check className="h-3 w-3" />}
                            </Button>
                        );
                    })}
                </div>

                <p className="mt-2 text-center text-xs text-muted-foreground">
                    For presentation purposes only. Remove VITE_DEMO_MODE from
                    .env after defense.
                </p>
            </div>
        </div>
    );
}

export default function Login({
    status,
    canResetPassword,
    requiresRecaptcha,
    googleOAuthEnabled,
}: {
    status?: string;
    canResetPassword: boolean;
    requiresRecaptcha: boolean;
    googleOAuthEnabled: boolean;
}) {
    const page = usePage<PageProps>();
    const { recaptchaSiteKey, errors: pageErrors } = page.props;
    const hasRecaptcha = Boolean(recaptchaSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY);
    const googleError = pageErrors?.google;
    const form = useForm({
        email: '',
        password: '',
        recaptcha_token: '',
    });
    const { data, setData, post, processing, errors, reset } = form;

    const [showPassword, setShowPassword] = useState(false);
    const [demoOpen, setDemoOpen] = useState(false);
    const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
    const prefersReducedMotion =
        typeof window !== 'undefined'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;

    const submit = () => {
        form.transform((currentData) => ({
            ...currentData,
            recaptcha_token: requiresRecaptcha && hasRecaptcha ? getRecaptchaToken() : '',
        }));

        form.post(route('login'), {
            onFinish: () => {
                reset('password', 'recaptcha_token');
                resetRecaptchaToken();
            },
        });
    };

    const isLockout =
        errors.email &&
        (errors.email.includes('locked') || errors.email.includes('minutes'));
    const isThrottle =
        errors.email &&
        !isLockout &&
        (errors.email.includes('attempts') ||
            errors.email.includes('attempt') ||
            errors.email.includes('seconds') ||
            errors.email.includes('Too many'));

    return (
        <GuestLayout>
            <Head title="Log in — SecureVault" />

            <Card className="mx-4 w-full max-w-md rounded-2xl shadow-sm">
                <CardContent className="px-8 py-10">
                    <div className="mb-6 flex justify-center">
                        {isDemoMode ? (
                            <button
                                type="button"
                                onClick={() => setDemoOpen((o) => !o)}
                                className="cursor-default focus:outline-none"
                            >
                                <AppLogo size="lg" showText={false} />
                            </button>
                        ) : (
                            <AppLogo size="lg" showText={false} />
                        )}
                    </div>

                    <h1 className="text-center text-2xl font-bold text-foreground">
                        SecureVault
                    </h1>
                    <p className="mt-1 text-center text-sm text-muted-foreground">
                        Authorized Access Only
                    </p>

                    {status === 'deletion-scheduled' && (
                        <Alert variant="destructive" className="mt-5">
                            <AlertDescription>
                                Your deletion request has been received. Your account has been deactivated.
                                Check your email for a cancellation link valid for 30 days.
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === 'deletion-cancelled' && (
                        <Alert className="mt-5 border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">
                            <AlertDescription>
                                Your account deletion request was cancelled. You can sign in again.
                            </AlertDescription>
                        </Alert>
                    )}

                    {status && status !== 'deletion-scheduled' && status !== 'deletion-cancelled' && (
                        <div className="mt-5 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400">
                            {status}
                        </div>
                    )}

                    {googleError && (
                        <Alert variant="destructive" className="mt-5">
                            <AlertDescription>{googleError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="mt-8 space-y-5">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="email"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    className="pl-9"
                                    placeholder="name@example.com"
                                    value={data.email}
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>
                            {errors.email && !isThrottle && !isLockout && (
                                <p className="text-sm text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="password"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="pl-9 pr-10"
                                    placeholder="••••••••••••"
                                    value={data.password}
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    autoComplete="current-password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    tabIndex={-1}
                                    aria-label={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {errors.password && (
                                <p className="text-sm text-destructive">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {canResetPassword && (
                            <div className="flex justify-end">
                                <Link
                                    href={route('password.request')}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        )}

                        {isThrottle && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {errors.email}
                                </AlertDescription>
                            </Alert>
                        )}

                        {isLockout && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {errors.email}
                                </AlertDescription>
                            </Alert>
                        )}

                        {requiresRecaptcha && hasRecaptcha && (
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Human Verification
                                </Label>
                                <RecaptchaWidget />
                                <p className="text-xs text-muted-foreground">
                                    Additional verification is required after repeated failed sign-in attempts.
                                </p>
                                {errors.recaptcha_token && (
                                    <p className="text-sm text-destructive">
                                        {errors.recaptcha_token}
                                    </p>
                                )}
                            </div>
                        )}

                        <Button
                            type="button"
                            className="h-11 w-full bg-primary text-sm font-semibold uppercase tracking-wide text-primary-foreground"
                            disabled={processing}
                            onClick={submit}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Log In'
                            )}
                        </Button>

                        {googleOAuthEnabled && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">
                                            Or continue with
                                        </span>
                                    </div>
                                </div>

                                <a
                                    href={`${route('auth.google.redirect')}?intent=login`}
                                    className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Sign in with Google
                                </a>
                            </>
                        )}

                        {isDemoMode && (
                            <DemoAccountFiller
                                isOpen={demoOpen}
                                form={form}
                                prefersReducedMotion={prefersReducedMotion}
                            />
                        )}

                        <p className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{' '}
                            <Link
                                href={route('register')}
                                className="text-primary hover:underline"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
