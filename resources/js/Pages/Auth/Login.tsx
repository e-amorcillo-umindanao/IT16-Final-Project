import AppLogo from '@/components/AppLogo';
import GuestLayout from '@/Layouts/GuestLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Eye,
    EyeOff,
    Loader2,
    Mail,
    Lock,
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
                        <AppLogo size="lg" showText={false} />
                    </div>

                    <h1 className="text-center text-2xl font-bold text-foreground">
                        SecureVault
                    </h1>
                    <p className="mt-1 text-center text-sm text-muted-foreground">
                        Authorized Access Only
                    </p>

                    {status && (
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
