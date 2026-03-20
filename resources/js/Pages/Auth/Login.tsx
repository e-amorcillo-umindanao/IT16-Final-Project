import GuestLayout from '@/Layouts/GuestLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit = () => {
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    // Determine which kind of error to show above the submit button
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

            <div className="flex min-h-screen items-center justify-center px-4">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card px-8 py-10 shadow-sm">

                    {/* ── Logo mark ── */}
                    <div className="mb-6 flex justify-center">
                        <div className="rounded-2xl bg-primary/15 p-4">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                    </div>

                    {/* ── Title ── */}
                    <h1 className="text-center text-2xl font-bold text-foreground">
                        SecureVault
                    </h1>
                    <p className="mt-1 text-center text-sm text-muted-foreground">
                        Authorized Access Only
                    </p>

                    {/* ── Status message (e.g. password reset confirmation) ── */}
                    {status && (
                        <div className="mt-5 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400">
                            {status}
                        </div>
                    )}

                    <div className="mt-8 space-y-5">

                        {/* ── Email ── */}
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                Email Address
                            </label>
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
                            {/* Show field-level email error only when it's NOT a rate/lockout message */}
                            {errors.email && !isThrottle && !isLockout && (
                                <p className="mt-1.5 text-sm text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* ── Password ── */}
                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                Password
                            </label>
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
                                {/* Show/hide toggle */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                                <p className="mt-1.5 text-sm text-destructive">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* ── Forgot password ── */}
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

                        {/* ── Rate limit alert ── */}
                        {isThrottle && (
                            <Alert
                                variant="destructive"
                                className="border-destructive/30 bg-destructive/10 text-sm"
                            >
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {errors.email}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* ── Account lockout alert ── */}
                        {isLockout && (
                            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                                <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                                <p className="text-sm text-destructive">
                                    {errors.email}
                                </p>
                            </div>
                        )}

                        {/* ── Submit ── */}
                        <Button
                            type="button"
                            className="h-11 w-full rounded-lg bg-primary text-sm font-semibold uppercase tracking-wide text-primary-foreground"
                            disabled={processing}
                            onClick={submit}
                        >
                            {processing && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {processing ? 'Signing in...' : 'Log In'}
                        </Button>

                        {/* ── Footer link ── */}
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
                </div>
            </div>
        </GuestLayout>
    );
}
