import GuestLayout from '@/Layouts/GuestLayout';
import RecaptchaWidget from '@/components/RecaptchaWidget';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRecaptchaToken, resetRecaptchaToken } from '@/lib/recaptcha';
import { PageProps } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle,
    Loader2,
    LockKeyhole,
    RotateCcw,
} from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { recaptchaSiteKey } = usePage<PageProps>().props;
    const hasRecaptcha = Boolean(recaptchaSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY);
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        email: '',
        recaptcha_token: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        transform((form) => ({
            ...form,
            recaptcha_token: hasRecaptcha ? getRecaptchaToken() : '',
        }));

        post(route('password.email'), {
            onFinish: () => {
                transform((form) => form);
                resetRecaptchaToken();
                reset('recaptcha_token');
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <Card className="mx-4 w-full max-w-md overflow-hidden rounded-2xl shadow-sm">
                <div className="h-1.5 bg-primary" />
                <CardContent className="space-y-6 px-10 py-10">
                    <div className="mb-6 flex justify-center">
                        <div className="relative rounded-2xl bg-muted p-4">
                            <LockKeyhole className="h-9 w-9 text-primary" />
                            <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                                <RotateCcw className="h-3 w-3" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-foreground">
                            Forgot Password?
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter your email and we&apos;ll send you a reset link.
                        </p>
                    </div>

                    {status && (
                        <Alert className="border-green-500/20 bg-green-500/5">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <AlertDescription className="text-green-700 dark:text-green-400">
                                {status}
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="email"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                className="h-12 rounded-lg"
                                placeholder="name@example.com"
                                value={data.email}
                                autoFocus
                                autoComplete="email"
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">
                                    {errors.email}
                                </p>
                            )}
                            {errors.recaptcha_token && (
                                <p className="text-sm text-destructive">
                                    {errors.recaptcha_token}
                                </p>
                            )}
                        </div>

                        {hasRecaptcha && <RecaptchaWidget />}

                        <Button
                            className="h-12 w-full rounded-lg bg-primary font-semibold text-primary-foreground"
                            disabled={processing}
                            type="submit"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
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
                    </form>

                    <div className="text-center">
                        <Link
                            href={route('login')}
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
