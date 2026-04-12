import AppLogo from '@/components/AppLogo';
import PasswordStrengthBar from '@/components/PasswordStrengthBar';
import RecaptchaWidget from '@/components/RecaptchaWidget';
import GuestLayout from '@/Layouts/GuestLayout';
import { getRecaptchaToken, resetRecaptchaToken } from '@/lib/recaptcha';
import { PageProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Eye,
    EyeOff,
    Loader2,
    Mail,
    ShieldAlert,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function Register() {
    const page = usePage<PageProps<{ googleEmail?: string | null }>>();
    const { recaptchaSiteKey, googleEmail, errors: pageErrors } = page.props;
    const hasRecaptcha = Boolean(recaptchaSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY);
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        name: '',
        email: googleEmail ?? '',
        password: '',
        password_confirmation: '',
        recaptcha_token: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        transform((form) => ({
            ...form,
            recaptcha_token: hasRecaptcha ? getRecaptchaToken() : '',
        }));

        post(route('register'), {
            onFinish: () => {
                transform((form) => form);
                resetRecaptchaToken();
                reset('password', 'password_confirmation', 'recaptcha_token');
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Register — SecureVault" />

            <Card className="mx-4 w-full max-w-md overflow-hidden rounded-2xl shadow-sm">
                <CardContent className="px-10 py-10">
                    <div className="-mx-10 -mt-10 mb-8 h-1.5 rounded-t-2xl bg-primary" />
                    <div className="mb-6 flex justify-center">
                        <AppLogo size="lg" showText={false} />
                    </div>

                    <h1 className="text-center text-2xl font-bold text-foreground">
                        Create Account
                    </h1>
                    <p className="text-center text-sm text-muted-foreground">
                        Start managing your documents securely.
                    </p>

                    {pageErrors?.google && (
                        <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                            {pageErrors.google}
                        </div>
                    )}

                    <form onSubmit={submit} className="mt-8 space-y-5">
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="name"
                                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder="John Doe"
                                    autoComplete="name"
                                    className="h-12 rounded-lg"
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

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
                                        name="email"
                                        className="h-12 rounded-lg pl-9"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData('email', e.target.value)
                                        }
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                                {errors.email && (
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
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        className="h-12 rounded-lg pr-10"
                                        value={data.password}
                                        onChange={(e) =>
                                            setData('password', e.target.value)
                                        }
                                        autoComplete="new-password"
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
                                {errors.password &&
                                    !errors.password.includes('data breach') && (
                                        <p className="text-sm text-destructive">
                                            {errors.password}
                                        </p>
                                    )}
                                {data.password && (
                                    <PasswordStrengthBar password={data.password} />
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="password_confirmation"
                                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                    Confirm Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password_confirmation"
                                        type={showConfirm ? 'text' : 'password'}
                                        name="password_confirmation"
                                        className="h-12 rounded-lg pr-10"
                                        value={data.password_confirmation}
                                        onChange={(e) =>
                                            setData(
                                                'password_confirmation',
                                                e.target.value
                                            )
                                        }
                                        autoComplete="new-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                        onClick={() =>
                                            setShowConfirm((prev) => !prev)
                                        }
                                        tabIndex={-1}
                                        aria-label={
                                            showConfirm
                                                ? 'Hide confirmation password'
                                                : 'Show confirmation password'
                                        }
                                    >
                                        {showConfirm ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-sm text-destructive">
                                        {errors.password_confirmation}
                                    </p>
                                )}
                            </div>
                        </div>

                        {errors.password &&
                            errors.password.includes('data breach') && (
                                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                                    <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
                                        <ShieldAlert className="h-4 w-4" />
                                        Security Alert
                                    </div>
                                    <p className="text-sm font-medium text-destructive">
                                        {errors.password}
                                    </p>
                                </div>
                            )}

                        {errors.recaptcha_token && (
                            <p className="text-sm text-destructive">
                                {errors.recaptcha_token}
                            </p>
                        )}

                        {hasRecaptcha && <RecaptchaWidget />}

                        <Button
                            type="submit"
                            className="mt-2 h-12 w-full gap-2 rounded-lg bg-primary font-semibold text-primary-foreground"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    <span>Create My Account</span>
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>

                        {hasRecaptcha && (
                            <p className="text-center text-xs text-muted-foreground">
                                Protected by reCAPTCHA.{' '}
                                <a
                                    href="https://policies.google.com/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-foreground"
                                >
                                    Privacy
                                </a>{' '}
                                &amp;{' '}
                                <a
                                    href="https://policies.google.com/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-foreground"
                                >
                                    Terms
                                </a>
                            </p>
                        )}

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link
                                href={route('login')}
                                className="text-primary hover:underline"
                            >
                                Log in
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
