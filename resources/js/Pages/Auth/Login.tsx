import AppLogo from '@/components/AppLogo';
import GuestLayout from '@/Layouts/GuestLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
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
    User,
} from 'lucide-react';
import { useState } from 'react';

type LoginFormData = {
    email: string;
    password: string;
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
    {
        label: 'User',
        email: 'jd@gmail.com',
        password: 'AquaFlask123!',
        ariaLabel: 'Fill User credentials',
        icon: User,
        className:
            'bg-slate-500/15 text-muted-foreground hover:bg-slate-500/15 hover:text-muted-foreground',
        activeBorderClassName: 'border-border',
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
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const form = useForm({
        email: '',
        password: '',
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
        post(route('login'), {
            onFinish: () => reset('password'),
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
